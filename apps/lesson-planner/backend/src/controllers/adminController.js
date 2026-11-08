const { pool } = require('../config/database');
const { sendCustomEmail } = require('../services/emailService');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
    try {
        const [users] = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.role, u.school_name, u.is_suspended, u.created_at,
                    COALESCE(s.plan, 'free') AS subscription_plan,
                    COALESCE(s.status, 'active') AS subscription_status
             FROM users u
             LEFT JOIN subscriptions s ON s.user_id = u.id
             WHERE u.id != ?`,
            [req.user.id]
        );

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user details with stats
// @route   GET /api/admin/users/:id
exports.getUserDetails = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Get user profile with subscription
        const [users] = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.role, u.school_name, u.is_suspended, u.created_at,
                    s.plan as subscription_plan, s.status as subscription_status, s.requested_plan, s.transaction_id, s.proof_screenshot, s.expires_at
             FROM users u
             LEFT JOIN subscriptions s ON s.user_id = u.id
             WHERE u.id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Get classes count
        const [classes] = await pool.query(
            'SELECT id, name, class_size, academic_year FROM classes WHERE teacher_id = ?',
            [userId]
        );

        // Get lesson plans count
        const [lessonPlans] = await pool.query(
            `SELECT lp.id, l.lesson_title, l.teaching_date, s.name as subject_name 
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN classes c ON cs.class_id = c.id
             JOIN subjects s ON cs.subject_id = s.id
             WHERE c.teacher_id = ?`,
            [userId]
        );

        res.status(200).json({
            success: true,
            data: {
                ...user,
                classes: classes,
                lesson_plans: lessonPlans,
                stats: {
                    classCount: classes.length,
                    lessonPlanCount: lessonPlans.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
exports.updateUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { full_name, role, school_name } = req.body;

        const [result] = await pool.query(
            'UPDATE users SET full_name = ?, role = ?, school_name = ? WHERE id = ?',
            [full_name, role, school_name, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;

        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle user suspension
// @route   PATCH /api/admin/users/:id/toggle-suspension
exports.toggleSuspension = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Get current status
        const [users] = await pool.query('SELECT is_suspended FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const newStatus = !users[0].is_suspended;

        await pool.query('UPDATE users SET is_suspended = ? WHERE id = ?', [newStatus, userId]);

        res.status(200).json({
            success: true,
            message: `User ${newStatus ? 'suspended' : 'activated'} successfully`,
            is_suspended: newStatus
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get system stats for admin dashboard
// @route   GET /api/admin/stats
exports.getAdminStats = async (req, res, next) => {
    try {
        // Summary Counts
        const [userCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE role != ?", ['admin']);
        const [suspendedCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE is_suspended = 1");
        const [subjectCount] = await pool.query('SELECT COUNT(*) as total FROM subjects');
        const [lessonPlanCount] = await pool.query('SELECT COUNT(*) as total FROM lesson_plans');
        const [materialCount] = await pool.query('SELECT COUNT(*) as total FROM reference_materials');

        // Activity by Day (Last 7 days)
        const [dailyStats] = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM lesson_plans 
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );

        // Recent Activity
        const [recentUsers] = await pool.query(
            "SELECT id, full_name, role, school_name, created_at FROM users WHERE role != ? ORDER BY created_at DESC LIMIT 5",
            ['admin']
        );

        const [recentPlans] = await pool.query(
            `SELECT lp.id, l.lesson_title, l.teaching_date, s.name as subject_name, u.full_name as teacher_name
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units un ON l.unit_id = un.id
             JOIN class_subjects cs ON un.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users u ON c.teacher_id = u.id
             ORDER BY lp.created_at DESC LIMIT 5`
        );

        res.status(200).json({
            success: true,
            data: {
                counts: {
                    users: userCount[0].total,
                    suspended: suspendedCount[0].total,
                    subjects: subjectCount[0].total,
                    lessonPlans: lessonPlanCount[0].total,
                    materials: materialCount[0].total
                },
                dailyStats,
                recentUsers,
                recentPlans
            }
        });
    } catch (error) {
        next(error);
    }
};
// @desc    Cleanup old lesson plan versions (Keep only one per lesson)
// @route   POST /api/admin/system/cleanup-lesson-plans
exports.cleanupOldLessonPlans = async (req, res, next) => {
    try {
        console.log('[Admin System] Starting global lesson plan cleanup...');

        // 1. Get all lesson IDs that have plans
        const [lessons] = await pool.query('SELECT DISTINCT lesson_id FROM lesson_plans');

        let deletedCount = 0;

        for (const lesson of lessons) {
            const lessonId = lesson.lesson_id;

            // 2. Find all plans for this lesson
            const [plans] = await pool.query(
                'SELECT id FROM lesson_plans WHERE lesson_id = ? ORDER BY created_at DESC',
                [lessonId]
            );

            if (plans.length > 1) {
                // Keep only the first one (latest)
                const idsToDelete = plans.slice(1).map(p => p.id);

                // 3. Delete logs for all other plans
                await pool.query(
                    'DELETE FROM ai_generation_logs WHERE lesson_plan_id IN (?)',
                    [idsToDelete]
                );

                // 4. Delete the other plans
                const [planRes] = await pool.query(
                    'DELETE FROM lesson_plans WHERE id IN (?)',
                    [idsToDelete]
                );

                deletedCount += planRes.affectedRows;
            }
        }

        res.status(200).json({
            success: true,
            message: `Cleanup complete. Deleted ${deletedCount} old lesson plan versions.`,
            deletedVersions: deletedCount
        });
    } catch (error) {
        console.error('[Admin System] Cleanup failed:', error.message);
        next(error);
    }
};

// @desc    Send custom email to user
// @route   POST /api/admin/users/:id/send-email
exports.sendEmailToUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both subject and message'
            });
        }

        // Get user details
        const [users] = await pool.query(
            'SELECT full_name, email FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Send email
        await sendCustomEmail(user, subject, message);

        res.status(200).json({
            success: true,
            message: `Email sent successfully to ${user.full_name}`
        });
    } catch (error) {
        console.error('[Admin Email] Failed to send email:', error.message);
        next(error);
    }
};

// @desc    Reset user password (Admin)
// @route   PATCH /api/admin/users/:id/reset-password
exports.resetUserPassword = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // Update database
        const [result] = await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [password_hash, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('[Admin] Failed to reset user password:', error.message);
        next(error);
    }
};
// @desc    Export a full SQL backup of the database
// @route   GET /api/admin/system/backup
exports.backupDatabase = async (req, res, next) => {
    try {
        console.log('[Admin System] Starting database backup export...');

        // 1. Get all tables
        const [tables] = await pool.query('SHOW TABLES');
        const dbName = process.env.DB_NAME || '21cta';
        const tableKey = `Tables_in_${dbName}`;

        let sqlDump = `-- Lesson Plan AI System Backup\n`;
        sqlDump += `-- Generated on ${new Date().toISOString()}\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        for (const tableRow of tables) {
            const tableName = tableRow[Object.keys(tableRow)[0]];
            
            // Skip certain tables if needed (none for now)
            
            // 2. Get CREATE TABLE statement
            const [createTable] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
            sqlDump += `-- Table structure for table \`${tableName}\`\n`;
            sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sqlDump += createTable[0]['Create Table'] + ';\n\n';

            // 3. Get all data for this table
            const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
            
            if (rows.length > 0) {
                sqlDump += `-- Dumping data for table \`${tableName}\`\n`;
                
                // Get column names
                const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
                
                for (const row of rows) {
                    const values = Object.values(row).map(val => {
                        if (val === null) return 'NULL';
                        if (typeof val === 'number') return val;
                        // Escape single quotes for SQL strings
                        const escaped = String(val).replace(/'/g, "''").replace(/\\/g, "\\\\");
                        return `'${escaped}'`;
                    }).join(', ');
                    
                    sqlDump += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
                }
                sqlDump += '\n';
            }
        }

        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        // 4. Send as downloadable file
        const filename = `backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.sql`;
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.status(200).send(sqlDump);

        console.log(`✅ Database backup export complete: ${filename}`);
    } catch (error) {
        console.error('[Admin System] Backup failed:', error.message);
        next(error);
    }
};
