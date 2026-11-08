const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../config/upload');

// All routes require authentication
router.use(authMiddleware);

// Material routes
router.get('/', materialController.getMaterials);
router.get('/:id', materialController.getMaterial);
router.post('/upload', roleMiddleware('teacher', 'admin'), upload.single('file'), materialController.uploadMaterial);
router.get('/:id/download', materialController.downloadMaterial);
router.delete('/:id', roleMiddleware('teacher', 'admin'), materialController.deleteMaterial);

module.exports = router;
