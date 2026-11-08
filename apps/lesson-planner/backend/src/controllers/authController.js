const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { generateToken } = require('../config/jwt');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { loadPlatformContext, writeAuditLog } = require('../services/platformService');

/**
 * Authentication Controller
 */

// Register new user - public self-registration goes through school approval.
// No account is created until a school administrator approves the request.
exports.register = async (req, res, next) => {
    try {
        const { full_name, email, phone_number, password, role, school_name, school_id, message } = req.body;

        if (!full_name || !email || !phone_number || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide full name, email, phone number, and password'
            });
        }

        const emailAddress = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const requestedRole = role || 'teacher';
        const publicRoles = ['teacher', 'student', 'parent', 'librarian', 'secretary', 'accountant',
            'ict_admin', 'exam_officer', 'hod', 'cpd_coordinator', 'staff'];
        if (!publicRoles.includes(requestedRole)) {
            return res.status(400).json({
                success: false,
                message: 'That role cannot be requested through public registration.'
            });
        }

        // Resolve the school either by id or by exact name.
        let school = null;
        if (school_id) {
            const [rows] = await pool.query(
                "SELECT id, name FROM schools WHERE id = ? AND status = 'active'", [school_id]
            );
            school = rows[0] || null;
        } else if (school_name) {
            const [rows] = await pool.query(
                "SELECT id, name FROM schools WHERE name = ? AND status = 'active' LIMIT 1", [school_name.trim()]
            );
            school = rows[0] || null;
        }
        if (!school) {
            return res.status(400).json({
                success: false,
                message: 'Select an active school. If your school is not listed, ask it to register on the platform first.'
            });
        }

        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR (phone_number IS NOT NULL AND phone_number = ?) LIMIT 1',
            [emailAddress, phone_number]
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email or phone number already exists.' });
        }

        const [existingRequests] = await pool.query(
            "SELECT id FROM registration_requests WHERE request_type='user' AND status='pending' AND email = ? LIMIT 1",
            [emailAddress]
        );
        if (existingRequests.length > 0) {
            return res.status(409).json({ success: false, message: 'A registration request for this email is already awaiting approval.' });
        }

        const [result] = await pool.query(
            `INSERT INTO registration_requests
             (request_type, school_id, school_name, contact_name, email, phone, role_code, message, status)
             VALUES ('user', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [school.id, school.name, String(full_name).trim(), emailAddress, phone_number, requestedRole, message || null]
        );

        await writeAuditLog({
            action: 'registration.user.request', module: 'registrations', entity: 'registration_request',
            entityId: result.insertId, details: { email: emailAddress, role: requestedRole, school_id: school.id }, req
        });

        // Let the school's administrators know a request is waiting.
        const [admins] = await pool.query(
            `SELECT DISTINCT m.user_id FROM school_memberships m
             JOIN roles r ON r.id = m.role_id
             WHERE m.school_id = ? AND m.status = 'active' AND r.code IN ('school_admin','headteacher')
             LIMIT 20`,
            [school.id]
        );
        await Promise.all(admins.map((admin) => pool.query(
            `INSERT INTO platform_notifications (user_id, school_id, title, message, type, link)
             VALUES (?, ?, 'New registration request', ?, 'registrations', '/app/registrations')`,
            [admin.user_id, school.id, `${full_name} (${emailAddress}) requested the ${requestedRole} role.`]
        ).catch(() => {})));

        sendWelcomeEmail({ full_name, email: emailAddress, school_name: school.name }).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'Registration submitted. Your school administrator must approve your account before you can sign in.',
            data: { request_id: result.insertId, status: 'pending', school: school.name }
        });
    } catch (error) {
        next(error);
    }
};

// Login user
exports.login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or phone

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
        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'This account uses Google sign-in. Please continue with Google.'
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Resolve multi-school platform context (roles, permissions, modules).
        const ctx = await loadPlatformContext(user.id);
        if (!ctx) {
            return res.status(401).json({ success: false, message: 'Account not found.' });
        }

        if (!ctx.isSuperAdmin && ctx.allowedSchoolIds.length === 0) {
            if (ctx.pendingMembership) {
                return res.status(403).json({
                    success: false,
                    code: 'PENDING_APPROVAL',
                    message: 'Your school membership is awaiting administrator approval.'
                });
            }
            return res.status(403).json({
                success: false,
                code: 'NO_SCHOOL',
                message: 'Your account is not linked to an active school. Please contact your school administrator.'
            });
        }

        await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        const [schoolRows] = ctx.isSuperAdmin
            ? await pool.query(
                "SELECT id, name, code, district, province, logo_url, status, subscription_plan FROM schools WHERE status <> 'rejected' ORDER BY name"
            )
            : [[...new Map(ctx.activeMemberships.map((m) => [m.school_id, {
                id: m.school_id, name: m.school_name, code: m.school_code, district: m.district,
                province: m.province, logo_url: m.logo_url, status: m.school_status,
                subscription_plan: m.subscription_plan
            }])).values()]];

        const currentSchool = ctx.schoolId
            ? schoolRows.find((s) => s.id === ctx.schoolId) || null
            : null;

        const [unreadRows] = await pool.query(
            'SELECT COUNT(*) AS count FROM platform_notifications WHERE user_id = ? AND is_read = 0',
            [user.id]
        );

        // Generate token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: ctx.primaryRole
        });

        await writeAuditLog({
            userId: user.id, schoolId: ctx.schoolId, action: 'login', module: 'auth',
            entity: 'user', entityId: user.id, details: { role: ctx.primaryRole }, req
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
                    role: ctx.primaryRole,
                    school_name: currentSchool ? currentSchool.name : user.school_name,
                    school_id: user.school_id,
                    profile_photo: user.profile_photo,
                    language: user.language || 'en',
                    theme: user.theme || 'light',
                    is_email_verified: Boolean(user.is_email_verified)
                },
                token,
                platform: {
                    is_super_admin: ctx.isSuperAdmin,
                    primary_role: ctx.primaryRole,
                    roles: [...ctx.roleCodes],
                    permissions: [...ctx.permissions],
                    school: currentSchool,
                    schools: schoolRows,
                    modules: ctx.modules,
                    unread_notifications: unreadRows[0].count,
                    language: user.language || 'en',
                    theme: user.theme || 'light'
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
    try {
        const ctx = await loadPlatformContext(req.user.id);
        if (!ctx) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...ctx.user,
                primary_role: ctx.primaryRole,
                roles: [...ctx.roleCodes],
                permissions: [...ctx.permissions],
                school_id: ctx.schoolId,
                schools: ctx.activeMemberships.map((m) => ({
                    id: m.school_id,
                    name: m.school_name,
                    code: m.school_code,
                    role: m.role_code
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { full_name, school_name, phone_number, profile_photo, language, theme } = req.body;
        const updates = [];
        const values = [];

        if (full_name !== undefined) {
            if (!String(full_name).trim()) {
                return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
            }
            updates.push('full_name = ?');
            values.push(String(full_name).trim());
        }

        if (phone_number !== undefined) {
            updates.push('phone_number = ?');
            values.push(phone_number ? String(phone_number).trim() : null);
        }

        if (profile_photo !== undefined) {
            updates.push('profile_photo = ?');
            values.push(profile_photo || null);
        }

        if (language !== undefined) {
            if (!['en', 'fr', 'rw', 'sw'].includes(language)) {
                return res.status(400).json({ success: false, message: 'Unsupported language.' });
            }
            updates.push('language = ?');
            values.push(language);
        }

        if (theme !== undefined) {
            if (!['light', 'dark'].includes(theme)) {
                return res.status(400).json({ success: false, message: 'Unsupported theme.' });
            }
            updates.push('theme = ?');
            values.push(theme);
        }

        // Legacy onboarding: only users without a school membership may set a
        // free-text school name. Platform memberships are managed by admins.
        if (school_name !== undefined) {
            const [memberships] = await pool.query(
                'SELECT id FROM school_memberships WHERE user_id = ? LIMIT 1', [req.user.id]
            );
            if (memberships.length === 0) {
                updates.push('school_name = ?');
                values.push(school_name || null);
            }
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

        const ctx = await loadPlatformContext(req.user.id);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: ctx ? ctx.user : null
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'That phone number is already in use.' });
        }
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
