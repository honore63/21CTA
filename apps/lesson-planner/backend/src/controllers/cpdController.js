const { pool } = require('../config/database');

/**
 * CPD & Teacher Portfolio Controller
 * Manages Continuous Professional Development workshops, enrollment records, and teacher portfolios
 */

exports.getActivities = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const [activities] = await pool.query(`
            SELECT c.*, u.full_name AS created_by_name,
                   (SELECT count(*) FROM cpd_enrollments ce WHERE ce.cpd_activity_id = c.id) AS enrollment_count
            FROM cpd_activities c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.school_id = ? OR c.school_id IS NULL
            ORDER BY c.start_date DESC
        `, [schoolId]);

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        next(error);
    }
};

exports.createActivity = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const creatorId = req.user?.id || 104;
        const { title, description, provider, start_date, end_date, hours, status = 'planned' } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Activity title is required' });
        }

        const [result] = await pool.query(`
            INSERT INTO cpd_activities (school_id, title, description, provider, start_date, end_date, hours, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolId, title, description || null, provider || 'REB', start_date || null, end_date || null, hours || 0.0, status, creatorId]);

        res.status(201).json({
            success: true,
            message: 'CPD Activity created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

exports.enrollActivity = async (req, res, next) => {
    try {
        const userId = req.user?.id || 108;
        const { activity_id, status = 'enrolled' } = req.body;

        await pool.query(`
            INSERT INTO cpd_enrollments (cpd_activity_id, user_id, status)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `, [activity_id, userId, status]);

        res.json({
            success: true,
            message: `Successfully ${status} in CPD activity`
        });
    } catch (error) {
        next(error);
    }
};

// Teacher Portfolios
exports.getPortfolios = async (req, res, next) => {
    try {
        const userId = req.query.teacher_id || req.user?.id || 108;
        const [portfolios] = await pool.query(`
            SELECT p.*, u.full_name AS teacher_name
            FROM professional_portfolios p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.achieved_on DESC
        `, [userId]);

        res.json({
            success: true,
            data: portfolios
        });
    } catch (error) {
        next(error);
    }
};

exports.addPortfolio = async (req, res, next) => {
    try {
        const userId = req.user?.id || 108;
        const schoolId = req.user?.school_id || 1;
        const { title, category, description, evidence_url, achieved_on } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Portfolio title is required' });
        }

        const [result] = await pool.query(`
            INSERT INTO professional_portfolios (user_id, school_id, title, category, description, evidence_url, achieved_on)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [userId, schoolId, title, category || 'Achievement', description || null, evidence_url || null, achieved_on || new Date()]);

        res.status(201).json({
            success: true,
            message: 'Portfolio item added successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};
