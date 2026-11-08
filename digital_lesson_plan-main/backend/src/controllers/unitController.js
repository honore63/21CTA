const { pool } = require('../config/database');

/**
 * Helper: Sync special needs for a lesson
 */
async function syncSpecialNeeds(connection, lessonId, snString) {
    // Delete existing
    await connection.query('DELETE FROM special_needs_learners WHERE lesson_id = ?', [lessonId]);
    
    if (!snString || snString.trim() === '' || snString.toLowerCase() === 'none') return;
    
    const parts = snString.split(',').map(p => p.trim());
    for (const part of parts) {
        if (!part) continue;
        let type = part;
        let count = 1;
        
        if (part.includes(':')) {
            const [t, c] = part.split(':').map(s => s.trim());
            type = t;
            count = parseInt(c) || 1;
        } else {
            const match = part.match(/(.+)\s+(\d+)$/);
            if (match) {
                type = match[1].trim();
                count = parseInt(match[2]) || 1;
            }
        }
        
        await connection.query(
            'INSERT INTO special_needs_learners (lesson_id, type_of_need, number_of_learners) VALUES (?, ?, ?)',
            [lessonId, type, count]
        );
    }
}

/**
 * Unit Management Controller
 */

// Get units for a class subject
exports.getUnits = async (req, res, next) => {
    try {
        const { classId, subjectId } = req.params;

        // Get class_subject_id
        const [classSubjects] = await pool.query(
            'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ?',
            [classId, subjectId]
        );

        if (classSubjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not assigned to this class'
            });
        }

        const classSubjectId = classSubjects[0].id;

        // Get units with lesson count
        const [units] = await pool.query(
            `SELECT u.*, COUNT(l.id) as lesson_count
       FROM units u
       LEFT JOIN lessons l ON u.id = l.unit_id
       WHERE u.class_subject_id = ?
       GROUP BY u.id, u.class_subject_id, u.unit_number, u.unit_title, u.key_competences, u.created_at, u.updated_at
       ORDER BY u.unit_number ASC`,
            [classSubjectId]
        );

        res.json({
            success: true,
            data: units
        });
    } catch (error) {
        next(error);
    }
};

// Get single unit
exports.getUnit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [units] = await pool.query(
            `SELECT u.*, cs.class_id, cs.subject_id, s.name as subject_name
       FROM units u
       JOIN class_subjects cs ON u.class_subject_id = cs.id
       JOIN subjects s ON cs.subject_id = s.id
       WHERE u.id = ?`,
            [id]
        );

        if (units.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found'
            });
        }

        res.json({
            success: true,
            data: units[0]
        });
    } catch (error) {
        next(error);
    }
};

// Create unit
exports.createUnit = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { classId, subjectId } = req.params;
        const { unit_number, unit_title, key_competences, lessons } = req.body;

        if (!unit_number || !unit_title) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Please provide unit number and title'
            });
        }

        // Get class_subject_id
        const [classSubjects] = await connection.query(
            'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ?',
            [classId, subjectId]
        );

        if (classSubjects.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Subject not assigned to this class'
            });
        }

        const classSubjectId = classSubjects[0].id;

        // Create unit
        const [result] = await connection.query(
            `INSERT INTO units (class_subject_id, unit_number, unit_title, key_competences)
             VALUES (?, ?, ?, ?)`,
            [classSubjectId, unit_number, unit_title, key_competences || null]
        );

        const unitId = result.insertId;

        // Create lessons if provided
        if (lessons && Array.isArray(lessons) && lessons.length > 0) {
            for (const lesson of lessons) {
                if (!lesson.lesson_title) continue;
                const [lResult] = await connection.query(
                    `INSERT INTO lessons (unit_id, lesson_title, lesson_number, duration, class_size, teaching_date, term, location)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        unitId, 
                        lesson.lesson_title, 
                        lesson.lesson_number || 1, 
                        lesson.duration || '80',
                        lesson.class_size || 40,
                        lesson.teaching_date || null,
                        lesson.term || 'Term 1',
                        lesson.location || 'inside'
                    ]
                );

                if (lesson.special_needs) {
                    await syncSpecialNeeds(connection, lResult.insertId, lesson.special_needs);
                }
            }
        }

        await connection.commit();

        const [newUnit] = await pool.query(
            'SELECT * FROM units WHERE id = ?',
            [unitId]
        );

        res.status(201).json({
            success: true,
            message: 'Unit and lessons created successfully',
            data: newUnit[0]
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Update unit
exports.updateUnit = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { unit_number, unit_title, key_competences, lessons } = req.body;

        // Update unit basic info
        const updates = [];
        const values = [];

        if (unit_number !== undefined) {
            updates.push('unit_number = ?');
            values.push(unit_number);
        }
        if (unit_title !== undefined) {
            updates.push('unit_title = ?');
            values.push(unit_title);
        }
        if (key_competences !== undefined) {
            updates.push('key_competences = ?');
            values.push(key_competences);
        }

        if (updates.length > 0) {
            values.push(id);
            await connection.query(
                `UPDATE units SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Handle lessons if provided
        if (lessons && Array.isArray(lessons)) {
            for (const lesson of lessons) {
                if (!lesson.lesson_title) continue;

                if (lesson.id) {
                    // Update existing lesson
                    await connection.query(
                        `UPDATE lessons SET 
                            lesson_title = ?, 
                            lesson_number = ?, 
                            duration = ?, 
                            class_size = ?, 
                            teaching_date = ?, 
                            term = ?, 
                            location = ? 
                         WHERE id = ? AND unit_id = ?`,
                        [
                            lesson.lesson_title,
                            lesson.lesson_number || 1,
                            lesson.duration || '40',
                            lesson.class_size || 40,
                            (lesson.teaching_date && lesson.teaching_date.trim() !== '') ? lesson.teaching_date : null,
                            lesson.term || 'Term 1',
                            lesson.location || 'inside',
                            lesson.id,
                            id
                        ]
                    );

                    if (lesson.special_needs !== undefined) {
                        await syncSpecialNeeds(connection, lesson.id, lesson.special_needs);
                    }
                } else {
                    // Insert new lesson
                    const [lResult] = await connection.query(
                        `INSERT INTO lessons (unit_id, lesson_title, lesson_number, duration, class_size, teaching_date, term, location)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            lesson.lesson_title,
                            lesson.lesson_number || 1,
                            lesson.duration || '40',
                            lesson.class_size || 40,
                            (lesson.teaching_date && lesson.teaching_date.trim() !== '') ? lesson.teaching_date : null,
                            lesson.term || 'Term 1',
                            lesson.location || 'inside'
                        ]
                    );

                    if (lesson.special_needs) {
                        await syncSpecialNeeds(connection, lResult.insertId, lesson.special_needs);
                    }
                }
            }
        }

        await connection.commit();

        const [updatedUnit] = await pool.query(
            `SELECT u.*, (SELECT COUNT(*) FROM lessons WHERE unit_id = u.id) as lesson_count 
             FROM units u WHERE u.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Unit and lessons updated successfully',
            data: updatedUnit[0]
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update Unit Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update unit. Please check if all fields are correct.'
        });
    } finally {
        if (connection) connection.release();
    }
};

// Delete unit
exports.deleteUnit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [units] = await pool.query(
            'SELECT * FROM units WHERE id = ?',
            [id]
        );

        if (units.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found'
            });
        }

        await pool.query('DELETE FROM units WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Unit deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
