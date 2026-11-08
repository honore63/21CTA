const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Subject routes
router.get('/', subjectController.getSubjects);
router.get('/:id', subjectController.getSubject);
router.post('/', roleMiddleware('admin', 'teacher'), subjectController.createSubject);
router.put('/:id', roleMiddleware('admin'), subjectController.updateSubject);
router.delete('/:id', roleMiddleware('admin'), subjectController.deleteSubject);

module.exports = router;
