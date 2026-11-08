const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Lesson routes
router.get('/', (req, res) => res.json({ success: true, data: [] }));
router.get('/units/:unitId/lessons', lessonController.getLessons);
router.post('/units/:unitId/lessons', roleMiddleware('teacher', 'admin'), lessonController.createLesson);
router.get('/:id', lessonController.getLesson);
router.put('/:id', roleMiddleware('teacher', 'admin'), lessonController.updateLesson);
router.delete('/:id', roleMiddleware('teacher', 'admin'), lessonController.deleteLesson);

module.exports = router;
