const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.use(authMiddleware);

// User routes
router.get('/', notifController.getMyNotifications);
router.get('/unread-count', notifController.getUnreadCount);
router.put('/mark-read', notifController.markAsRead);

// Admin routes
router.post('/send', adminMiddleware, notifController.sendNotification);
router.get('/all', adminMiddleware, notifController.getAllNotifications);
router.delete('/:id', adminMiddleware, notifController.deleteNotification);

module.exports = router;
