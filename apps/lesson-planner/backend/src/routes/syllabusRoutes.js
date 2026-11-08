const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', syllabusController.getSyllabuses);
router.get('/match', syllabusController.matchSyllabus);
// FK-based lookup: get syllabus units for a given global subject_id
router.get('/subject/:subjectId', syllabusController.getSyllabusBySubjectId);
router.post('/import', syllabusController.performImport);
router.get('/:id', syllabusController.getSyllabusById);
router.post('/', adminMiddleware, syllabusController.upsertSyllabus);
router.post('/process-pdf', adminMiddleware, upload.single('syllabus'), syllabusController.processPDFSyllabus);
router.patch('/:id/structured-data', adminMiddleware, syllabusController.updateSyllabusStructuredData);
router.delete('/:id', adminMiddleware, syllabusController.deleteSyllabus);

module.exports = router;

