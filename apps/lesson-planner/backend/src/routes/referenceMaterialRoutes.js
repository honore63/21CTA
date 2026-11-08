const express = require('express');
const router = express.Router();
const materialController = require('../controllers/referenceMaterialController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/materials';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .pdf, .docx and .txt files are allowed'));
        }
    }
});

// All routes are protected
router.use(authMiddleware);

router.get('/', materialController.getMaterials);
router.get('/subject/:subject_id', materialController.getMaterialsBySubject);
router.post('/upload', upload.single('file'), materialController.uploadMaterial);
router.delete('/:id', materialController.deleteMaterial);

// Lesson attachment routes
router.post('/attach', materialController.attachToLesson);
router.get('/lesson/:lesson_id', materialController.getLessonMaterials);

module.exports = router;
