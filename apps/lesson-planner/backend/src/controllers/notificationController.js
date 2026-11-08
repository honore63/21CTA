const { pool } = require('../config/database');

// @desc    Get notifications for the logged-in user (personal + global)
// @route   GET /api/notifications
exports.getMyNotifications = async (req, res, next) => {
    try {
        const [notifications] = await pool.query(
            `SELECT * FROM notifications 
             WHERE (user_id = ? OR user_id IS NULL)
             ORDER BY created_at DESC LIMIT 50`,
            [req.user.id]
        );
        res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

// @desc    Get unread count for badge
// @route   GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) as count FROM notifications 
             WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
            [req.user.id]
        );
        res.json({ success: true, count: rows[0].count });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification(s) as read
// @route   PUT /api/notifications/mark-read
exports.markAsRead = async (req, res, next) => {
    try {
        const { ids } = req.body; // array of ids, or 'all'
        if (ids === 'all') {
            await pool.query(
                `UPDATE notifications SET is_read = 1 
                 WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
                [req.user.id]
            );
        } else if (Array.isArray(ids) && ids.length > 0) {
            await pool.query(
                'UPDATE notifications SET is_read = 1 WHERE id IN (?)',
                [ids]
            );
        }
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Send notification to a specific user or all users
// @route   POST /api/notifications/send (admin only)
exports.sendNotification = async (req, res, next) => {
    try {
        const { user_id, title, message, type = 'info' } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [user_id || null, title, message, type]
        );
        const target = user_id ? `User #${user_id}` : 'All Users (Global)';
        res.status(201).json({ success: true, message: `Notification sent to: ${target}` });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Get all notifications sent
// @route   GET /api/notifications/all (admin only)
exports.getAllNotifications = async (req, res, next) => {
    try {
        const [notifications] = await pool.query(
            `SELECT n.*, u.full_name, u.email 
             FROM notifications n
             LEFT JOIN users u ON n.user_id = u.id
             ORDER BY n.created_at DESC LIMIT 100`
        );
        res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a notification (admin)
// @route   DELETE /api/notifications/:id (admin only)
exports.deleteNotification = async (req, res, next) => {
    try {
        await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};
