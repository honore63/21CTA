const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public: Track a visit
router.post('/track', visitorController.trackVisit);
router.get('/public-stats', visitorController.getPublicStats);

// Admin: Get analytics and clear logs
router.get('/', authMiddleware, adminMiddleware, visitorController.getVisitorAnalytics);
router.delete('/', authMiddleware, adminMiddleware, visitorController.clearVisitorLogs);

module.exports = router;
