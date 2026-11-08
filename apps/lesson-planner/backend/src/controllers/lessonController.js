const { pool } = require('../config/database');

/**
 * Lesson Management Controller
 */

// Get lessons for a unit
exports.getLessons = async (req, res, next) => {
    try {
        const { unitId } = req.params;

        const [lessons] = await pool.query(
            `SELECT l.*, u.unit_number, u.unit_title, s.name as subject_name, cs.class_id,
                COALESCE(l.school_name, usr.school_name) as school_name,
                COALESCE(l.teacher_name, usr.full_name) as teacher_name,
                COALESCE(l.class_size, c.class_size) as class_size,
                (SELECT COUNT(*) FROM lesson_plans WHERE lesson_id = l.id) as has_plan
             FROM lessons l
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users usr ON c.teacher_id = usr.id
             WHERE l.unit_id = ?
             ORDER BY l.lesson_number ASC`,
            [unitId]
        );

        // Get special needs and reference materials for each lesson
        for (let lesson of lessons) {
            const [specialNeeds] = await pool.query(
                'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
                [lesson.id]
            );
            lesson.special_needs = specialNeeds;

            const [refMaterials] = await pool.query(
                `SELECT rm.id, rm.title FROM reference_materials rm
                 JOIN lesson_materials lm ON rm.id = lm.material_id
                 WHERE lm.lesson_id = ?`,
                [lesson.id]
            );
            lesson.reference_materials = refMaterials;
        }

        res.json({
            success: true,
            data: lessons
        });
    } catch (error) {
        next(error);
    }
};

// Get single lesson
exports.getLesson = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [lessons] = await pool.query(
            `SELECT l.*, u.unit_number, u.unit_title, s.name as subject_name, cs.class_id,
                COALESCE(l.school_name, usr.school_name) as school_name,
                COALESCE(l.teacher_name, usr.full_name) as teacher_name,
                COALESCE(l.class_size, c.class_size) as class_size,
                (SELECT COUNT(*) FROM lesson_plans WHERE lesson_id = l.id) as has_plan
             FROM lessons l
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users usr ON c.teacher_id = usr.id
             WHERE l.id = ?`,
            [id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }

        const lesson = lessons[0];

        // Get special needs
        const [specialNeeds] = await pool.query(
            'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
            [id]
        );
        lesson.special_needs = specialNeeds;

        // Get reference materials
        const [refMaterials] = await pool.query(
            `SELECT rm.id, rm.title FROM reference_materials rm
             JOIN lesson_materials lm ON rm.id = lm.material_id
             WHERE lm.lesson_id = ?`,
            [id]
        );
        lesson.reference_materials = refMaterials;

        res.json({
            success: true,
            data: lesson
        });
    } catch (error) {
        next(error);
    }
};

// Create lesson
exports.createLesson = async (req, res, next) => {
    try {
        const { unitId } = req.params;
        const {
            lesson_number,
            lesson_title,
            duration,
            teaching_date,
            term,
            location,
            school_name,
            teacher_name,
            class_size,
            special_needs,
            reference_materials
        } = req.body;

        if (!lesson_number || !lesson_title || !duration) {
            return res.status(400).json({
                success: false,
                message: 'Please provide lesson number, title, and duration'
            });
        }

        // Create lesson
        const [result] = await pool.query(
            `INSERT INTO lessons (unit_id, lesson_number, lesson_title, duration, teaching_date, term, location, school_name, teacher_name, class_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                unitId,
                lesson_number,
                lesson_title,
                duration,
                teaching_date || null,
                term || null,
                location || 'inside',
                school_name || null,
                teacher_name || null,
                class_size || null
            ]
        );

        const lessonId = result.insertId;

        // Add special needs if provided
        if (special_needs && Array.isArray(special_needs) && special_needs.length > 0) {
            for (let sn of special_needs) {
                await pool.query(
                    'INSERT INTO special_needs_learners (lesson_id, type_of_need, number_of_learners, accommodations) VALUES (?, ?, ?, ?)',
                    [lessonId, sn.type_of_need || sn.type, sn.number_of_learners, sn.accommodations || null]
                );
            }
        }

        // Add reference materials if provided
        if (reference_materials && Array.isArray(reference_materials) && reference_materials.length > 0) {
            const values = reference_materials.map(mid => [lessonId, mid]);
            await pool.query(
                'INSERT INTO lesson_materials (lesson_id, material_id) VALUES ?',
                [values]
            );
        }

        // Get created lesson
        const [newLesson] = await pool.query(
            'SELECT * FROM lessons WHERE id = ?',
            [lessonId]
        );

        res.status(201).json({
            success: true,
            message: 'Lesson created successfully',
            data: newLesson[0]
        });
    } catch (error) {
        next(error);
    }
};

// Update lesson
exports.updateLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            lesson_number,
            lesson_title,
            duration,
            teaching_date,
            term,
            location,
            school_name,
            teacher_name,
            class_size,
            special_needs,
            reference_materials
        } = req.body;

        const updates = [];
        const values = [];

        if (lesson_number) {
            updates.push('lesson_number = ?');
            values.push(lesson_number);
        }
        if (lesson_title) {
            updates.push('lesson_title = ?');
            values.push(lesson_title);
        }
        if (duration) {
            updates.push('duration = ?');
            values.push(duration);
        }
        if (teaching_date !== undefined) {
            updates.push('teaching_date = ?');
            values.push(teaching_date);
        }
        if (term !== undefined) {
            updates.push('term = ?');
            values.push(term);
        }
        if (location) {
            updates.push('location = ?');
            values.push(location);
        }
        if (school_name !== undefined) {
            updates.push('school_name = ?');
            values.push(school_name);
        }
        if (teacher_name !== undefined) {
            updates.push('teacher_name = ?');
            values.push(teacher_name);
        }
        if (class_size !== undefined) {
            updates.push('class_size = ?');
            values.push(class_size);
        }
        if (req.body.is_completed !== undefined) {
            updates.push('is_completed = ?');
            values.push(req.body.is_completed);
        }
        if (req.body.teacher_reflection !== undefined) {
            updates.push('teacher_reflection = ?');
            values.push(req.body.teacher_reflection);
        }

        if (updates.length > 0) {
            values.push(id);
            await pool.query(
                `UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Update special needs if provided
        if (special_needs !== undefined) {
            await pool.query('DELETE FROM special_needs_learners WHERE lesson_id = ?', [id]);
            if (Array.isArray(special_needs) && special_needs.length > 0) {
                for (let sn of special_needs) {
                    await pool.query(
                        'INSERT INTO special_needs_learners (lesson_id, type_of_need, number_of_learners, accommodations) VALUES (?, ?, ?, ?)',
                        [id, sn.type_of_need || sn.type, sn.number_of_learners, sn.accommodations || null]
                    );
                }
            }
        }

        // Update reference materials if provided
        if (reference_materials !== undefined) {
            await pool.query('DELETE FROM lesson_materials WHERE lesson_id = ?', [id]);
            if (Array.isArray(reference_materials) && reference_materials.length > 0) {
                const values = reference_materials.map(mid => [id, mid]);
                await pool.query(
                    'INSERT INTO lesson_materials (lesson_id, material_id) VALUES ?',
                    [values]
                );
            }
        }

        res.json({
            success: true,
            message: 'Lesson updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Delete lesson
exports.deleteLesson = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [lessons] = await pool.query(
            'SELECT * FROM lessons WHERE id = ?',
            [id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }

        await pool.query('DELETE FROM lessons WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Lesson deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
