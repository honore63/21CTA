const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Unit routes
router.get('/classes/:classId/subjects/:subjectId/units', unitController.getUnits);
router.post('/classes/:classId/subjects/:subjectId/units', roleMiddleware('teacher', 'admin'), unitController.createUnit);
router.get('/:id', unitController.getUnit);
router.put('/:id', roleMiddleware('teacher', 'admin'), unitController.updateUnit);
router.delete('/:id', roleMiddleware('teacher', 'admin'), unitController.deleteUnit);

module.exports = router;
