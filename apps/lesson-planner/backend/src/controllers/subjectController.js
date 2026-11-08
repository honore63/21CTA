const { pool } = require('../config/database');

/**
 * Subject Management Controller
 */

// Get all subjects
exports.getSubjects = async (req, res, next) => {
    try {
        const [subjects] = await pool.query(
            'SELECT * FROM subjects ORDER BY name ASC'
        );

        res.json({
            success: true,
            data: subjects
        });
    } catch (error) {
        next(error);
    }
};

// Get single subject
exports.getSubject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [subjects] = await pool.query(
            'SELECT * FROM subjects WHERE id = ?',
            [id]
        );

        if (subjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        res.json({
            success: true,
            data: subjects[0]
        });
    } catch (error) {
        next(error);
    }
};

// Create subject (admin only, or custom subjects for teachers)
exports.createSubject = async (req, res, next) => {
    try {
        const { name, code, description, is_custom } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide subject name'
            });
        }

        // Check if subject already exists
        const [existing] = await pool.query(
            'SELECT * FROM subjects WHERE name = ?',
            [name]
        );

        if (existing.length > 0) {
            return res.json({
                success: true,
                message: 'Subject already exists',
                data: existing[0]
            });
        }

        const [result] = await pool.query(
            'INSERT INTO subjects (name, code, description, is_custom, created_by) VALUES (?, ?, ?, ?, ?)',
            [name, code || null, description || null, is_custom || false, req.user.id]
        );

        const [newSubject] = await pool.query(
            'SELECT * FROM subjects WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Subject created successfully',
            data: newSubject[0]
        });
    } catch (error) {
        next(error);
    }
};

// Update subject (admin only)
exports.updateSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, description } = req.body;

        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (code !== undefined) {
            updates.push('code = ?');
            values.push(code);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(id);

        await pool.query(
            `UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedSubject] = await pool.query(
            'SELECT * FROM subjects WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Subject updated successfully',
            data: updatedSubject[0]
        });
    } catch (error) {
        next(error);
    }
};

// Delete subject (admin only)
exports.deleteSubject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [subjects] = await pool.query(
            'SELECT * FROM subjects WHERE id = ?',
            [id]
        );

        if (subjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        await pool.query('DELETE FROM subjects WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Subject deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
