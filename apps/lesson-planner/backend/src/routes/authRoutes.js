const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public local routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth routes (only available when credentials are configured)
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

router.get('/google', (req, res, next) => {
    if (!googleEnabled) {
        return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
    }
    const { action, fingerprint } = req.query;
    // We combine action and fingerprint into the state parameter
    const stateObj = JSON.stringify({ action: action || 'login', fingerprint: fingerprint || null });
    const encodedState = Buffer.from(stateObj).toString('base64');

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: encodedState
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    if (!googleEnabled) {
        return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
    }
    passport.authenticate('google', { session: false }, (err, user, info) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        if (err) {
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
        
        if (!user) {
            const message = info?.message || 'Authentication failed';
            return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
        }

        req.user = user;
        authController.googleCallback(req, res);
    })(req, res, next);
});

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/change-password', authMiddleware, authController.changePassword);

// Password Resets
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
