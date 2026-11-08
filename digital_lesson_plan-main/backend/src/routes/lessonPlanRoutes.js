const express = require('express');
const router = express.Router();
const lessonPlanController = require('../controllers/lessonPlanController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Lesson plan routes
router.get('/recent', lessonPlanController.getRecentLessonPlans);
router.get('/all', lessonPlanController.getAllLessonPlans);
router.get('/units/:unitId/plans', lessonPlanController.getUnitLessonPlans);
router.post('/units/:unitId/plans/batch-generate', roleMiddleware('teacher', 'admin'), lessonPlanController.batchGenerateUnitPlans);
router.get('/lessons/:lessonId/plan', lessonPlanController.getLessonPlan);
router.get('/lessons/:lessonId/plan/history', lessonPlanController.getLessonPlanHistory);
router.post('/lessons/:lessonId/plan/generate', roleMiddleware('teacher', 'admin'), lessonPlanController.generateLessonPlan);
router.put('/:id', roleMiddleware('teacher', 'admin'), lessonPlanController.updateLessonPlan);
router.delete('/:id', roleMiddleware('teacher', 'admin'), lessonPlanController.deleteLessonPlan);

module.exports = router;
