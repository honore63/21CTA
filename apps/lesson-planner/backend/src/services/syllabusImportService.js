const { pool } = require('../config/database');

async function ensureClassSubject(connection, classId, subjectId) {
    const [rows] = await connection.query(
        'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ?',
        [classId, subjectId]
    );

    if (rows.length > 0) {
        return rows[0].id;
    }

    const [result] = await connection.query(
        'INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)',
        [classId, subjectId]
    );
    return result.insertId;
}

async function importSyllabusUnitsToClassSubject({ unitIds, classId, subjectId }) {
    if (!Array.isArray(unitIds) || unitIds.length === 0) {
        throw new Error('No syllabus units provided for import');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [classRows] = await connection.query('SELECT id, teacher_id FROM classes WHERE id = ?', [classId]);
        if (classRows.length === 0) {
            throw new Error('Class not found');
        }
        const teacherId = classRows[0].teacher_id;

        const [subjectRows] = await connection.query('SELECT id, name FROM subjects WHERE id = ?', [subjectId]);
        if (subjectRows.length === 0) {
            throw new Error('Subject not found');
        }

        const classSubjectId = await ensureClassSubject(connection, classId, subjectId);

        const importedUnits = [];

        for (const sUnitId of unitIds) {
            const [sUnits] = await connection.query(
                `SELECT su.*, s.id AS syllabus_id, s.subject_name AS syllabus_subject_name, s.grade_level AS syllabus_grade_level
                 FROM syllabus_units su
                 JOIN syllabuses s ON su.syllabus_id = s.id
                 WHERE su.id = ?`,
                [sUnitId]
            );
            if (sUnits.length === 0) continue;

            const sUnit = sUnits[0];
            const [uRes] = await connection.query(
                'INSERT INTO units (class_subject_id, unit_number, unit_title, key_competences) VALUES (?, ?, ?, ?)',
                [classSubjectId, sUnit.unit_number, sUnit.unit_title, sUnit.key_competence]
            );
            const newUnitId = uRes.insertId;

            const [sLessons] = await connection.query(
                'SELECT * FROM syllabus_lessons WHERE unit_id = ? ORDER BY lesson_number ASC',
                [sUnitId]
            );

            const importedLessons = [];
            for (const sLesson of sLessons) {
                const [lessonRes] = await connection.query(
                    `INSERT INTO lessons (unit_id, lesson_number, lesson_title, duration, class_size) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [newUnitId, sLesson.lesson_number, sLesson.lesson_title, 40, 40]
                );
                importedLessons.push({
                    id: lessonRes.insertId,
                    unit_id: newUnitId,
                    lesson_number: sLesson.lesson_number,
                    lesson_title: sLesson.lesson_title,
                    duration: 40,
                    class_size: 40
                });
            }

            importedUnits.push({
                id: newUnitId,
                class_subject_id: classSubjectId,
                unit_number: sUnit.unit_number,
                unit_title: sUnit.unit_title,
                key_competences: sUnit.key_competence,
                lesson_count: importedLessons.length,
                lessons: importedLessons,
                syllabus_subject_name: sUnit.syllabus_subject_name,
                syllabus_grade_level: sUnit.syllabus_grade_level
            });
        }

        await connection.commit();

        const [createdUnits] = await pool.query(
            `SELECT u.*, COUNT(l.id) as lesson_count
             FROM units u
             LEFT JOIN lessons l ON u.id = l.unit_id
             WHERE u.class_subject_id = ?
             GROUP BY u.id
             ORDER BY u.unit_number ASC`,
            [classSubjectId]
        );

        for (const cu of createdUnits) {
            const [lessons] = await pool.query('SELECT * FROM lessons WHERE unit_id = ? ORDER BY lesson_number ASC', [cu.id]);
            cu.lessons = lessons;
        }

        return {
            classSubjectId,
            classId,
            subjectId,
            teacherId,
            importedUnits: createdUnits
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    importSyllabusUnitsToClassSubject
};
