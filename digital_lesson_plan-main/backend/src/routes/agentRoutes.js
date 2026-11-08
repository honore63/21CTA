const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authenticateToken = require('../middleware/authMiddleware');

// All agent routes require authentication
router.use(authenticateToken);

// ─── Background Job Routes (existing) ────────────────────────────────────────
router.post('/syllabus/:syllabusId/analyze', agentController.analyzeSyllabus);
router.post('/lesson/:lessonId/process-materials', agentController.processMaterials);
router.post('/lesson/:lessonId/generate-plan', agentController.generateLessonPlanAgent);
router.post('/unit/:unitId/batch-generate-plans', agentController.batchGenerateUnitPlansAgent);
router.get('/status', agentController.getJobStatus);
router.get('/status/:jobId', agentController.getJobStatusById);
router.get('/result/:jobId', agentController.getJobResult);
router.get('/capabilities', agentController.getAgentCapabilities);

// ─── AI Agent Task Management (new) ──────────────────────────────────────────
router.get('/tasks', agentController.getTasks);
router.get('/summary', agentController.getTaskSummary);
router.put('/tasks/:id/complete', agentController.completeTask);
router.delete('/tasks/:id', agentController.deleteTask);

module.exports = router;