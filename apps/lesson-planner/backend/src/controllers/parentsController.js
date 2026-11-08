const { pool } = require('../config/database');

/**
 * Parent Management Controller
 * Handles parent profiles, linking to children, and parent portal access
 */

exports.getParents = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const [parents] = await pool.query(`
            SELECT pp.*, u.full_name, u.email,
                   (SELECT count(*) FROM parent_student_links psl WHERE psl.parent_profile_id = pp.id) AS children_count
            FROM parent_profiles pp
            JOIN users u ON pp.user_id = u.id
            WHERE pp.school_id = ? OR pp.school_id IS NULL
            ORDER BY u.full_name ASC
        `, [schoolId]);

        res.json({
            success: true,
            data: parents
        });
    } catch (error) {
        next(error);
    }
};

exports.linkStudent = async (req, res, next) => {
    try {
        const { parent_profile_id, student_profile_id, relationship = 'guardian' } = req.body;

        await pool.query(`
            INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_verified)
            VALUES (?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE relationship = VALUES(relationship), is_verified = 1
        `, [parent_profile_id, student_profile_id, relationship]);

        res.json({
            success: true,
            message: 'Parent linked and verified to student successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyChildren = async (req, res, next) => {
    try {
        const userId = req.user?.id || 114;

        const [[parent]] = await pool.query('SELECT id FROM parent_profiles WHERE user_id = ?', [userId]);
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent profile not found' });
        }

        const [children] = await pool.query(`
            SELECT sp.*, c.name AS class_name, s.name AS school_name, psl.relationship
            FROM parent_student_links psl
            JOIN student_profiles sp ON psl.student_profile_id = sp.id
            LEFT JOIN classes c ON sp.class_id = c.id
            LEFT JOIN schools s ON sp.school_id = s.id
            WHERE psl.parent_profile_id = ? AND psl.is_verified = 1
        `, [parent.id]);

        res.json({
            success: true,
            data: children
        });
    } catch (error) {
        next(error);
    }
};
