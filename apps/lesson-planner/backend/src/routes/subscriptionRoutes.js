const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const ctrl = require('../controllers/subscriptionController');
const { processEmailQueue, getQueueStats, checkEmailConfiguration } = require('../services/emailQueueService');

// File upload for payment proofs
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/payment-proofs/'),
    filename: (req, file, cb) => cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// ─── Public routes (no auth) ─────────────────────────────────────────────────
router.get('/promo-status', ctrl.getPromoStatus);

// ─── User routes (requires login) ────────────────────────────────────────────
router.get('/status', authMiddleware, ctrl.getStatus);
router.post('/payment-proof', authMiddleware, upload.single('proof'), ctrl.submitPaymentProof);

// ─── Admin routes (requires admin role) ──────────────────────────────────────
router.get('/admin/pending', authMiddleware, adminMiddleware, ctrl.getPending);
router.get('/admin/all', authMiddleware, adminMiddleware, ctrl.getAllSubscriptions);
router.post('/admin/activate', authMiddleware, adminMiddleware, ctrl.activatePlan);
router.patch('/admin/users/:id/plan', authMiddleware, adminMiddleware, ctrl.setUserPlan);
router.post('/admin/resend-payment-email/:userId', authMiddleware, adminMiddleware, ctrl.resendPaymentEmail);
router.post('/admin/promo', authMiddleware, adminMiddleware, ctrl.setPromo);

// ─── Email Queue Management (admin only) ─────────────────────────────────────
router.get('/admin/email-queue/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const stats = await getQueueStats();
        res.json({ success: true, stats });
    } catch (error) {
        next(error);
    }
});

router.post('/admin/email-queue/process', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        await processEmailQueue();
        const stats = await getQueueStats();
        res.json({ success: true, message: 'Email queue processed', stats });
    } catch (error) {
        next(error);
    }
});

// ─── Email Configuration Test (admin only) ───────────────────────────────────
router.post('/admin/test-email', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address required' });
        }

        const { sendUserPaymentConfirmation } = require('../services/emailService');
        
        console.log(`🧪 Testing email configuration...`);
        console.log(`📧 EMAIL_USER: ${process.env.EMAIL_USER}`);
        console.log(`📧 Sending test email to: ${email}`);
        
        try {
            await sendUserPaymentConfirmation('Test User', email, 'basic');
            res.json({ 
                success: true, 
                message: `Test email sent successfully to ${email}`,
                provider: process.env.EMAIL_USER
            });
        } catch (emailError) {
            console.error('🧪 Test email failed:', emailError.message);
            res.status(500).json({ 
                success: false, 
                message: `Test email failed: ${emailError.message}`,
                error: emailError.message,
                provider: process.env.EMAIL_USER
            });
        }
    } catch (error) {
        next(error);
    }
});

// ─── Email Configuration Status Check (admin only) ──────────────────────────
router.get('/admin/email-config', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const config = await checkEmailConfiguration();
        res.json({ success: true, config });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
