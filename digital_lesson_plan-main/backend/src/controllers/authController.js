const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { generateToken } = require('../config/jwt');
const { sendWelcomeEmail, sendPasswordResetEmail, sendAdminSecurityAlert } = require('../services/emailService');

/**
 * Authentication Controller
 */

// Register new user
exports.register = async (req, res, next) => {
    try {
        const { full_name, email, phone_number, password, role, school_name, fingerprint } = req.body;
        const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Validation
        if (!full_name || !email || !phone_number || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide full name, email, phone number, and password'
            });
        }

        // Validate role - Admin registration is blocked to ensure only one admin exists
        if (role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin registration is not allowed. Please register as a teacher.'
            });
        }

        if (role && role !== 'teacher') {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be teacher'
            });
        }

        // Check if user already exists (email or phone)
        const [existingUsers] = await pool.query(
            'SELECT id, email, phone_number FROM users WHERE email = ? OR phone_number = ?',
            [email, phone_number]
        );

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            const field = existingUser.email === email ? 'email' : 'phone number';
            return res.status(400).json({
                success: false,
                message: `User with this ${field} already exists`
            });
        }

        // Check for multiple accounts on same device
        if (fingerprint) {
            const [deviceUsers] = await pool.query(
                'SELECT id, email FROM users WHERE fingerprint = ?',
                [fingerprint]
            );
            if (deviceUsers.length > 0) {
                // Alert admin in background
                sendAdminSecurityAlert(deviceUsers[0], email, fingerprint, ip_address).catch(() => {});
                return res.status(403).json({
                    success: false,
                    message: 'Multiple accounts detected on this device. For security reasons, creating multiple accounts is restricted. Please use your existing account or contact support.'
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users (full_name, email, phone_number, password_hash, role, school_name, fingerprint, last_ip) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, phone_number, password_hash, role || 'teacher', school_name || null, fingerprint || null, ip_address]
        );

        // Link device
        if (fingerprint) {
            await pool.query(
                'INSERT INTO user_devices (user_id, fingerprint, ip_address) VALUES (?, ?, ?)',
                [result.insertId, fingerprint, ip_address]
            );
        }

        // Generate token
        const token = generateToken({
            id: result.insertId,
            email,
            role: role || 'teacher'
        });

        // Send welcome email in background (non-blocking)
        sendWelcomeEmail({ full_name, email, school_name }).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: result.insertId,
                    full_name,
                    email,
                    phone_number,
                    role: role || 'teacher',
                    school_name
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

// Login user
exports.login = async (req, res, next) => {
    try {
        const { identifier, password, fingerprint } = req.body; // identifier can be email or phone
        const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Validation
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email/phone and password'
            });
        }

        // Find user by email or phone
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR phone_number = ?',
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if user is suspended
        if (user.is_suspended) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact the administrator.'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update device/ip info
        await pool.query(
            'UPDATE users SET last_ip = ?, fingerprint = COALESCE(fingerprint, ?) WHERE id = ?',
            [ip_address, fingerprint || null, user.id]
        );

        if (fingerprint) {
            await pool.query(
                'INSERT INTO user_devices (user_id, fingerprint, ip_address) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE ip_address = VALUES(ip_address), last_login = CURRENT_TIMESTAMP',
                [user.id, fingerprint, ip_address]
            );
        }

        // Generate token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    phone_number: user.phone_number,
                    role: user.role,
                    school_name: user.school_name
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
    try {
        const [users] = await pool.query(
            'SELECT id, full_name, email, phone_number, role, school_name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        next(error);
    }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { full_name, school_name, phone_number } = req.body;
        const updates = [];
        const values = [];

        if (full_name) {
            updates.push('full_name = ?');
            values.push(full_name);
        }

        if (phone_number) {
            updates.push('phone_number = ?');
            values.push(phone_number);
        }

        if (school_name !== undefined) {
            updates.push('school_name = ?');
            values.push(school_name);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(req.user.id);

        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Get updated user
        const [users] = await pool.query(
            'SELECT id, full_name, email, phone_number, role, school_name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: users[0]
        });
    } catch (error) {
        next(error);
    }
};

// Change password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide new password'
            });
        }

        // Get current user password hash
        const [users] = await pool.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // If the user has a password, verify the current password
        if (user.password_hash) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide your current password'
                });
            }
            // Check current password
            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const new_password_hash = await bcrypt.hash(newPassword, salt);

        // Update database
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [new_password_hash, req.user.id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};
// Google OAuth Callback Handler
exports.googleCallback = async (req, res) => {
    try {
        const user = req.user;

        // Generate Token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Redirect to frontend with token
        // If school_name is missing, we can append a flag to let the frontend know
        const needsSetup = !user.school_name ? 'true' : 'false';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        res.redirect(`${frontendUrl}/auth/success?token=${token}&needsSetup=${needsSetup}`);
    } catch (error) {
        console.error('Google Auth Error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
};

// Forgot Password - Send Reset Token
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email' });
        }

        // 1. Find user
        const [users] = await pool.query('SELECT id, full_name, email, google_id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'No account found with that email' });
        }

        const user = users[0];

        // 2. We will now allow Google accounts to reset password so they can log in via email as well.
        // It's a common practice to link Google Auth with a local password later.

        // 3. Generate random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 4. Save to DB - Using DATE_ADD(NOW()) to avoid timezone mismatches between server and DB
        await pool.query(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?',
            [hashedToken, user.id]
        );

        // 5. Send Email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        try {
            await sendPasswordResetEmail(user, resetUrl);
            res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
        } catch (err) {
            console.error('Email error:', err);
            // If email fails, clear the token
            await pool.query('UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?', [user.id]);
            return res.status(500).json({ success: false, message: 'There was an error sending the email. Try again later.' });
        }
    } catch (error) {
        next(error);
    }
};

// Reset Password - Update DB with new password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Please provide token and new password' });
        }

        // 1. Hash the incoming token and find user
        // Added .trim() to prevent failures from accidental whitespace
        const hashedToken = crypto.createHash('sha256').update(token.toString().trim()).digest('hex');

        const [users] = await pool.query(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
            [hashedToken]
        );

        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Token is invalid or has expired' });
        }

        const user = users[0];

        // 2. Hash new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 3. Update DB and clear tokens
        await pool.query(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [password_hash, user.id]
        );

        res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
    } catch (error) {
        next(error);
    }
};
