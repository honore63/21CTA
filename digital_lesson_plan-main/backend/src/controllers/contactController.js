const { pool } = require('../config/database');

exports.submitMessage = async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        await pool.query(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject, message]
        );

        res.json({ success: true, message: 'Your message has been received successfully.' });
    } catch (error) {
        console.error('Contact Submission Error:', error);
        next(error);
    }
};

exports.getMessages = async (req, res, next) => {
    try {
        const [messages] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
        res.json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
};

exports.markMessageRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE contact_messages SET status = 'read' WHERE id = ?", [id]);
        res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        next(error);
    }
};

exports.deleteMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM contact_messages WHERE id = ?", [id]);
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        next(error);
    }
};
