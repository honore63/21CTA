const { pool } = require('../config/database');
const curriculumService = require('../services/curriculumService');
const agentService = require('../services/agentService');

/**
 * Class Management Controller
 */

// Get all classes for a teacher
exports.getClasses = async (req, res, next) => {
    try {
        const teacherId = req.user.role === 'admin' ? req.query.teacher_id : req.user.id;

        let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cs.subject_id) as subject_count,
        MIN(cs.subject_id) as first_subject_id
      FROM classes c
      LEFT JOIN class_subjects cs ON c.id = cs.class_id
    `;

        const params = [];

        if (teacherId) {
            query += ' WHERE c.teacher_id = ?';
            params.push(teacherId);
        }

        query += ' GROUP BY c.id, c.teacher_id, c.name, c.class_size, c.academic_year, c.created_at, c.updated_at ORDER BY c.created_at DESC';

        const [classes] = await pool.query(query, params);

        res.json({
            success: true,
            data: classes
        });
    } catch (error) {
        next(error);
    }
};

// Get single class with details
exports.getClass = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get class info
        const [classes] = await pool.query(
            'SELECT * FROM classes WHERE id = ?',
            [id]
        );

        if (classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        const classData = classes[0];

        // Check authorization
        if (req.user.role === 'teacher' && classData.teacher_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const [subjects] = await pool.query(
            `SELECT s.*, s.id as subject_id, cs.id as class_subject_id
       FROM subjects s
       JOIN class_subjects cs ON s.id = cs.subject_id
       WHERE cs.class_id = ?`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...classData,
                subjects
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create new class
exports.createClass = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { name, class_size, academic_year, subject_ids } = req.body;
        const teacher_id = req.user.id;

        if (!name || !class_size) {
            return res.status(400).json({
                success: false,
                message: 'Please provide class name and size'
            });
        }

        const [result] = await connection.query(
            `INSERT INTO classes (teacher_id, name, class_size, academic_year)
       VALUES (?, ?, ?, ?)`,
            [teacher_id, name, class_size, academic_year || null]
        );

        const classId = result.insertId;

        // Assign subjects if provided
        if (subject_ids && Array.isArray(subject_ids)) {
            for (const subject_id of subject_ids) {
                const [sResult] = await connection.query(
                    'INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)',
                    [classId, subject_id]
                );
                
                // Fetch subject info for automation
                const [subjects] = await connection.query('SELECT * FROM subjects WHERE id = ?', [subject_id]);
                if (subjects.length > 0) {
                    curriculumService.autoGenerateForClassSubject(
                        sResult.insertId,
                        subjects[0],
                        { id: classId, name, class_size, academic_year }
                    ).catch(err => console.error('[Automation] Background tasks failed:', err));
                }
            }
        }

        await connection.commit();

        const [newClass] = await pool.query(
            'SELECT * FROM classes WHERE id = ?',
            [classId]
        );

        res.status(201).json({
            success: true,
            message: 'Class created successfully',
            data: newClass[0]
        });

        // Fire AI Agent task creation in background (non-blocking)
        if (subject_ids && Array.isArray(subject_ids) && subject_ids.length > 0) {
            pool.query('SELECT name FROM subjects WHERE id IN (?)', [[subject_ids]])
                .then(([rows]) => {
                    agentService.onClassCreated(teacher_id, name, rows);
                })
                .catch(err => console.warn('[Agent] onClassCreated trigger failed:', err.message));
        } else {
            agentService.onClassCreated(teacher_id, name, []).catch(() => {});
        }

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Update class
exports.updateClass = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { name, class_size, academic_year, subject_ids } = req.body;

        // Check if class exists and belongs to teacher
        const [classes] = await connection.query(
            'SELECT * FROM classes WHERE id = ?',
            [id]
        );

        if (classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        if (req.user.role === 'teacher' && classes[0].teacher_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (class_size) {
            updates.push('class_size = ?');
            values.push(class_size);
        }
        if (academic_year !== undefined) {
            updates.push('academic_year = ?');
            values.push(academic_year);
        }

        if (updates.length > 0) {
            values.push(id);
            await connection.query(
                `UPDATE classes SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Sync subjects if provided
        if (subject_ids && Array.isArray(subject_ids)) {
            // Remove subjects that are no longer assigned
            if (subject_ids.length > 0) {
                await connection.query(
                    'DELETE FROM class_subjects WHERE class_id = ? AND subject_id NOT IN (?)',
                    [id, subject_ids]
                );
            } else {
                await connection.query(
                    'DELETE FROM class_subjects WHERE class_id = ?',
                    [id]
                );
            }

            // Add new subjects
            for (const subject_id of subject_ids) {
                const [existing] = await connection.query(
                    'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ?',
                    [id, subject_id]
                );

                if (existing.length === 0) {
                    const [sResult] = await connection.query(
                        'INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)',
                        [id, subject_id]
                    );

                    // Trigger automation for newly added subject
                    const [subjects] = await connection.query('SELECT * FROM subjects WHERE id = ?', [subject_id]);
                    if (subjects.length > 0) {
                        curriculumService.autoGenerateForClassSubject(
                            sResult.insertId,
                            subjects[0],
                            { ...classes[0], name: name || classes[0].name }
                        ).catch(err => console.error('[Automation] Background tasks failed:', err));
                    }
                }
            }
        }

        await connection.commit();

        const [updatedClass] = await pool.query(
            'SELECT * FROM classes WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Class updated successfully',
            data: updatedClass[0]
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Delete class
exports.deleteClass = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if class exists and belongs to teacher
        const [classes] = await pool.query(
            'SELECT * FROM classes WHERE id = ?',
            [id]
        );

        if (classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        if (req.user.role === 'teacher' && classes[0].teacher_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await pool.query('DELETE FROM classes WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Class deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Assign subject to class
exports.assignSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { subject_id } = req.body;

        if (!subject_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide subject_id'
            });
        }

        // Check if class exists and belongs to teacher
        const [classes] = await pool.query(
            'SELECT * FROM classes WHERE id = ?',
            [id]
        );

        if (classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        if (req.user.role === 'teacher' && classes[0].teacher_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if subject exists
        const [subjects] = await pool.query(
            'SELECT * FROM subjects WHERE id = ?',
            [subject_id]
        );

        if (subjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        // Assign subject
        const [result] = await pool.query(
            'INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)',
            [id, subject_id]
        );

        const classSubjectId = result.insertId;

        // Trigger background auto-generation of units/lessons from syllabus
        curriculumService.autoGenerateForClassSubject(
            classSubjectId,
            subjects[0],
            classes[0]
        ).catch(err => console.error('[Automation] Background tasks failed:', err));

        res.status(201).json({
            success: true,
            message: 'Subject assigned to class successfully. AI automation is populating the curriculum in the background if a syllabus matches.',
            data: {
                id: classSubjectId,
                class_id: parseInt(id),
                subject_id: parseInt(subject_id)
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Subject already assigned to this class'
            });
        }
        next(error);
    }
};

// Remove subject from class
exports.removeSubject = async (req, res, next) => {
    try {
        const { id, subjectId } = req.params;

        // Check if class exists and belongs to teacher
        const [classes] = await pool.query(
            'SELECT * FROM classes WHERE id = ?',
            [id]
        );

        if (classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        if (req.user.role === 'teacher' && classes[0].teacher_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await pool.query(
            'DELETE FROM class_subjects WHERE class_id = ? AND subject_id = ?',
            [id, subjectId]
        );

        res.json({
            success: true,
            message: 'Subject removed from class successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get dashboard stats for teacher
exports.getDashboardStats = async (req, res, next) => {
    try {
        const teacherId = req.user.id;

        // Count total classes
        const [classCount] = await pool.query(
            'SELECT COUNT(*) as count FROM classes WHERE teacher_id = ?',
            [teacherId]
        );

        // Count total lesson plans (Actual work done)
        const [lessonCount] = await pool.query(
            `SELECT COUNT(lp.id) as count 
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ?`,
            [teacherId]
        );

        // Count total AI plans
        const [planCount] = await pool.query(
            `SELECT COUNT(lp.id) as count 
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ? AND lp.generated_by_ai = 1`,
            [teacherId]
        );

        res.json({
            success: true,
            data: {
                totalClasses: classCount[0].count,
                totalLessons: lessonCount[0].count,
                totalPlans: planCount[0].count
            }
        });
    } catch (error) {
        next(error);
    }
};
