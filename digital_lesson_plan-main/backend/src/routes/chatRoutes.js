const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/upload');

// Public AI route (No Auth required)
router.post('/public-query', chatController.askPublicAI);

// Apply auth middleware for the rest
router.use(authMiddleware);

router.post('/query', chatController.askAI);
router.post('/upload', upload.single('file'), chatController.uploadFile);
router.get('/history', chatController.getChatHistory);
router.delete('/history', chatController.deleteChatHistory);
router.get('/sessions', chatController.getSessions);
router.put('/sessions/:id', chatController.updateSessionTitle);
router.delete('/sessions/:id', chatController.deleteChatSession);

module.exports = router;
