const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes here require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getAdminStats);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/toggle-suspension', adminController.toggleSuspension);
router.patch('/users/:id/reset-password', adminController.resetUserPassword);
router.post('/users/:id/send-email', adminController.sendEmailToUser);
router.post('/system/cleanup-lesson-plans', adminController.cleanupOldLessonPlans);
router.get('/system/backup', adminController.backupDatabase);

module.exports = router;
