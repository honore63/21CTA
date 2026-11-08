const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Class routes
router.get('/stats', classController.getDashboardStats);
router.get('/', classController.getClasses);
router.post('/', roleMiddleware('teacher', 'admin'), classController.createClass);
router.get('/:id', classController.getClass);
router.put('/:id', roleMiddleware('teacher', 'admin'), classController.updateClass);
router.delete('/:id', roleMiddleware('teacher', 'admin'), classController.deleteClass);

// Subject assignment routes
router.post('/:id/subjects', roleMiddleware('teacher', 'admin'), classController.assignSubject);
router.delete('/:id/subjects/:subjectId', roleMiddleware('teacher', 'admin'), classController.removeSubject);

module.exports = router;
