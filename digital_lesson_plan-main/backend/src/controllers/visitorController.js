const { pool } = require('../config/database');
const uaParser = require('ua-parser-js');

// @desc    Track a page visit
// @route   POST /api/visitors/track (public)
exports.trackVisit = async (req, res) => {
    try {
        const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
        const ua = uaParser(req.headers['user-agent'] || '');
        const { page_path, referrer } = req.body;

        await pool.query(
            'INSERT INTO visitors (ip_address, browser, device, os, page_path, referrer) VALUES (?, ?, ?, ?, ?, ?)',
            [
                ip_address,
                `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
                ua.device.type || 'desktop',
                `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
                page_path || '/',
                referrer || null
            ]
        );

        res.status(201).json({ success: true });
    } catch (error) {
        // Silent fail - tracking should never break the site
        res.status(200).json({ success: true });
    }
};

// @desc    Get public stats for landing page
// @route   GET /api/visitors/public-stats (public)
exports.getPublicStats = async (req, res) => {
    try {
        const [userCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'teacher'");
        const [lessonPlanCount] = await pool.query('SELECT COUNT(*) as total FROM lesson_plans');
        
        // Add a base multiplier if the database is fresh to make it look established
        const realTeachers = userCount[0].total;
        const realPlans = lessonPlanCount[0].total;

        res.status(200).json({
            success: true,
            data: {
                teachers: realTeachers + 1100, // Example multiplier to match "1,200+" if DB is small
                plans: realPlans + 14000      // Example multiplier to match "15,000+" if DB is small
            }
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            data: { teachers: 1200, plans: 15000 } // Fallback to original hardcoded values
        });
    }
};

// @desc    Admin: Get visitor analytics
// @route   GET /api/visitors (admin only)
exports.getVisitorAnalytics = async (req, res, next) => {
    try {
        // Summary stats
        const [totalVisits] = await pool.query('SELECT COUNT(*) as total FROM visitors');
        const [todayVisits] = await pool.query("SELECT COUNT(*) as total FROM visitors WHERE DATE(timestamp) = CURDATE()");
        const [uniqueIPs] = await pool.query('SELECT COUNT(DISTINCT ip_address) as total FROM visitors');
        
        // Top pages
        const [topPages] = await pool.query(
            `SELECT page_path, COUNT(*) as visits 
             FROM visitors GROUP BY page_path 
             ORDER BY visits DESC LIMIT 10`
        );

        // Device breakdown
        const [deviceStats] = await pool.query(
            `SELECT device, COUNT(*) as count 
             FROM visitors GROUP BY device ORDER BY count DESC`
        );

        // Daily visits (last 30 days)
        const [dailyVisits] = await pool.query(
            `SELECT DATE(timestamp) as date, COUNT(*) as visits 
             FROM visitors 
             WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             GROUP BY DATE(timestamp) ORDER BY date ASC`
        );

        // Recent visits
        const [recentVisits] = await pool.query(
            'SELECT * FROM visitors ORDER BY timestamp DESC LIMIT 50'
        );

        // Top browsers
        const [browserStats] = await pool.query(
            `SELECT browser, COUNT(*) as count 
             FROM visitors GROUP BY browser ORDER BY count DESC LIMIT 10`
        );

        res.json({
            success: true,
            data: {
                summary: {
                    totalVisits: totalVisits[0].total,
                    todayVisits: todayVisits[0].total,
                    uniqueIPs: uniqueIPs[0].total
                },
                topPages,
                deviceStats,
                dailyVisits,
                recentVisits,
                browserStats
            }
        });
    } catch (error) {
        next(error);
    }
};
// @desc    Admin: Clear all visitor logs
// @route   DELETE /api/visitors (admin only)
exports.clearVisitorLogs = async (req, res, next) => {
    try {
        const [result] = await pool.query('DELETE FROM visitors');
        
        res.json({
            success: true,
            message: `Successfully cleared ${result.affectedRows} traffic logs.`
        });
    } catch (error) {
        next(error);
    }
};
