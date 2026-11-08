const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public route to submit a contact message
router.post('/', contactController.submitMessage);

// Admin-only routes to manage messages
router.use(authMiddleware);
router.use(roleMiddleware('super-admin', 'admin', 'system-admin', 'reb-admin'));

router.get('/', contactController.getMessages);
router.put('/:id/read', contactController.markMessageRead);
router.delete('/:id', contactController.deleteMessage);

module.exports = router;
