const { pool } = require('../config/database');

/**
 * Class Diary Controller
 * Records daily classroom activities, topics taught, homework assigned, reflections, and DOS review
 */

exports.getDiaries = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const { teacher_id, class_id, subject_id, date, status } = req.query;

        let query = `
            SELECT cd.*, u.full_name AS teacher_name, c.name AS class_name, s.name AS subject_name
            FROM class_diaries cd
            JOIN users u ON cd.teacher_id = u.id
            JOIN classes c ON cd.class_id = c.id
            JOIN subjects s ON cd.subject_id = s.id
            WHERE cd.school_id = ?
        `;
        const params = [schoolId];

        if (teacher_id) {
            query += ' AND cd.teacher_id = ?';
            params.push(teacher_id);
        }
        if (class_id) {
            query += ' AND cd.class_id = ?';
            params.push(class_id);
        }
        if (subject_id) {
            query += ' AND cd.subject_id = ?';
            params.push(subject_id);
        }
        if (date) {
            query += ' AND cd.lesson_date = ?';
            params.push(date);
        }
        if (status) {
            query += ' AND cd.status = ?';
            params.push(status);
        }

        query += ' ORDER BY cd.lesson_date DESC';

        const [diaries] = await pool.query(query, params);

        res.json({
            success: true,
            data: diaries
        });
    } catch (error) {
        next(error);
    }
};

exports.createDiary = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const teacherId = req.user?.id || 108;
        const { class_id, subject_id, lesson_date, topic, activities, homework, reflection, syllabus_unit } = req.body;

        if (!class_id || !subject_id || !topic) {
            return res.status(400).json({ success: false, message: 'Class, subject, and topic are required' });
        }

        const date = lesson_date || new Date().toISOString().split('T')[0];

        const [result] = await pool.query(`
            INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
        `, [schoolId, class_id, subject_id, teacherId, date, topic, activities || null, homework || null, reflection || null, syllabus_unit || null]);

        res.status(201).json({
            success: true,
            message: 'Class diary entry submitted successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

exports.reviewDiary = async (req, res, next) => {
    try {
        const diaryId = req.params.diaryId;
        const { status = 'reviewed' } = req.body;

        await pool.query('UPDATE class_diaries SET status = ? WHERE id = ?', [status, diaryId]);

        res.json({
            success: true,
            message: `Diary entry marked as ${status}`
        });
    } catch (error) {
        next(error);
    }
};
