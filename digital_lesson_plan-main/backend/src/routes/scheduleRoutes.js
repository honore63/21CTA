const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/:classSubjectId', scheduleController.getSchedule);
router.post('/:classSubjectId', scheduleController.updateSchedule);
router.post('/:classSubjectId/populate-dates', scheduleController.autoPopulateDates);

module.exports = router;
