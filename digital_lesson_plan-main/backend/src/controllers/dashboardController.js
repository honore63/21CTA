const { pool } = require('../config/database');

/**
 * Dashboard Controller for Teachers
 */

// @desc    Get dashboard stats for teacher
// @route   GET /api/dashboard/stats
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // 1. Get classes count
        const [classRows] = await pool.query(
            'SELECT COUNT(*) as total FROM classes WHERE teacher_id = ?',
            [userId]
        );

        // 2. Get lesson plans count
        const [planRows] = await pool.query(
            `SELECT COUNT(*) as total 
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ?`,
            [userId]
        );

        // 3. Get resources/materials count (global + subject specific)
        const [materialRows] = await pool.query(
            'SELECT COUNT(*) as total FROM reference_materials'
        );

        res.status(200).json({
            success: true,
            data: {
                classes: classRows[0].total,
                lesson_plans: planRows[0].total,
                materials: materialRows[0].total
            }
        });
    } catch (error) {
        next(error);
    }
};
