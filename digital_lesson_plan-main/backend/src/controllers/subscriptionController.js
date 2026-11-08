const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');
const { sendPaymentNotification, sendUserPaymentConfirmation } = require('../services/emailService');
const { queueEmail } = require('../services/emailQueueService');

// ─── HELPER: Read promo state from system_settings ───────────────────────────
const getPromoState = async () => {
    try {
        const [rows] = await pool.query(
            "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('promo_active', 'promo_end_date', 'promo_label')"
        );
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

        const active = settings.promo_active === 'true';
        const endDate = settings.promo_end_date || null;
        const label = settings.promo_label || null;

        // Auto-expire if end date has passed
        if (active && endDate && new Date(endDate) < new Date()) {
            await pool.query(
                "UPDATE system_settings SET setting_value = 'false' WHERE setting_key = 'promo_active'"
            );
            return { active: false, endDate, label, autoExpired: true };
        }

        return { active, endDate, label };
    } catch {
        return { active: false, endDate: null, label: null };
    }
};

// ─── USER: Get own subscription status ───────────────────────────────────────
// GET /api/subscription/status
exports.getStatus = async (req, res, next) => {
    try {
        const subscription = { 
            plan: 'vip', 
            status: 'active', 
            plans_used_today: 0, 
            total_plans_used: 0,
            promo_override: true,
            promo_end_date: null,
            promo_label: 'VIP Unlocked'
        };
        res.json({ success: true, subscription });
    } catch (error) {
        next(error);
    }
};

// ─── USER: Submit payment proof ───────────────────────────────────────────────
// POST /api/subscription/payment-proof
exports.submitPaymentProof = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { plan, transaction_id, phone } = req.body;

        const validPlans = ['basic', 'standard', 'vip'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan selected' });
        }

        const screenshot = req.file ? req.file.filename : null;

        // Upsert subscription row
        // We set requested_plan instead of plan, so their current active plan (like 'free') is preserved until approval
        await pool.query(`
            INSERT INTO subscriptions (user_id, plan, requested_plan, status, transaction_id, payment_phone, proof_screenshot)
            VALUES (?, 'free', ?, 'pending', ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                requested_plan = VALUES(requested_plan),
                status = 'pending',
                transaction_id = VALUES(transaction_id),
                payment_phone = VALUES(payment_phone),
                proof_screenshot = COALESCE(VALUES(proof_screenshot), proof_screenshot),
                updated_at = NOW()
        `, [userId, plan, transaction_id || null, phone || null, screenshot]);

        // Queue notification emails (with retry mechanism)
        const [userRows] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
        if (userRows.length > 0) {
            const user = userRows[0];
            
            // Queue admin notification
            await queueEmail(
                'payment_admin_notification',
                user.email,
                user.full_name,
                { plan, transaction_id, user_id: userId, subject: `💰 New Payment Proof: ${user.full_name} (${plan.toUpperCase()})` }
            );
            
            // Queue user confirmation
            await queueEmail(
                'payment_user_confirmation',
                user.email,
                user.full_name,
                { plan, subject: `📜 Payment Proof Received: ${plan.toUpperCase()} Plan` }
            );
        }

        res.json({ success: true, message: 'Payment proof submitted. Admin will review shortly.' });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN: Get all pending payment requests ──────────────────────────────────
// GET /api/subscription/admin/pending
exports.getPending = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, u.full_name, u.email
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'pending'
            ORDER BY s.updated_at DESC
        `);
        res.json({ success: true, subscriptions: rows });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN: Get ALL subscriptions ─────────────────────────────────────────────
// GET /api/subscription/admin/all
exports.getAllSubscriptions = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, u.full_name, u.email, u.school_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.updated_at DESC
        `);
        res.json({ success: true, subscriptions: rows });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN: Activate / Change plan ───────────────────────────────────────────
// POST /api/subscription/admin/activate
exports.activatePlan = async (req, res, next) => {
    try {
        const { userId, plan, months } = req.body;
        const validPlans = ['free', 'basic', 'standard', 'vip'];

        if (!userId || !plan) {
            return res.status(400).json({ success: false, message: 'userId and plan are required' });
        }
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const expiresAt = plan === 'free' || !months
            ? null
            : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

        await pool.query(`
            INSERT INTO subscriptions (user_id, plan, status, requested_plan, expires_at, plans_used_today, total_plans_used)
            VALUES (?, ?, 'active', NULL, ?, 0, 0)
            ON DUPLICATE KEY UPDATE
                plan = VALUES(plan),
                status = 'active',
                requested_plan = NULL,
                expires_at = VALUES(expires_at),
                plans_used_today = 0,
                updated_at = NOW()
        `, [userId, plan, expiresAt]);

        res.json({ success: true, message: `Plan changed to ${plan} successfully` });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN: Set plan directly by userId (for ManageUsers page) ───────────────
// PATCH /api/subscription/admin/users/:id/plan
exports.setUserPlan = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { plan, months } = req.body;

        const validPlans = ['free', 'basic', 'standard', 'vip'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const expiresAt = plan === 'free' || !months
            ? null
            : new Date(Date.now() + (months || 1) * 30 * 24 * 60 * 60 * 1000);

        await pool.query(`
            INSERT INTO subscriptions (user_id, plan, status, expires_at, plans_used_today, total_plans_used)
            VALUES (?, ?, 'active', ?, 0, 0)
            ON DUPLICATE KEY UPDATE
                plan = VALUES(plan),
                status = 'active',
                expires_at = VALUES(expires_at),
                plans_used_today = 0,
                updated_at = NOW()
        `, [userId, plan, expiresAt]);

        res.json({ success: true, message: `User subscription updated to ${plan}` });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN: Resend payment confirmation email ────────────────────────────────
// POST /api/subscription/admin/resend-payment-email/:userId
exports.resendPaymentEmail = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const { email_type } = req.body; // 'confirmation' or 'admin_notification'

        // Get user and subscription info
        const [userRows] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const [subRows] = await pool.query(
            'SELECT plan FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
            [userId]
        );
        if (subRows.length === 0) {
            return res.status(404).json({ success: false, message: 'No subscription found for user' });
        }

        const user = userRows[0];
        const subscription = subRows[0];

        // Queue the email
        if (email_type === 'confirmation' || !email_type) {
            await queueEmail(
                'payment_user_confirmation',
                user.email,
                user.full_name,
                { plan: subscription.plan, subject: `📜 Payment Proof Received: ${subscription.plan.toUpperCase()} Plan` }
            );
        }
        if (email_type === 'admin_notification' || !email_type) {
            await queueEmail(
                'payment_admin_notification',
                user.email,
                user.full_name,
                { plan: subscription.plan, user_id: userId, subject: `💰 New Payment Proof: ${user.full_name} (${subscription.plan.toUpperCase()})` }
            );
        }

        res.json({ success: true, message: 'Payment confirmation email(s) queued for sending' });
    } catch (error) {
        next(error);
    }
};

// ─── PUBLIC: Get promo status (no auth required) ─────────────────────────────
// GET /api/subscription/promo-status
exports.getPromoStatus = async (req, res, next) => {
    try {
        const promo = await getPromoState();
        res.json({
            success: true,
            promo: {
                active: promo.active,
                endDate: promo.endDate || null,
                label: promo.label || null,
            }
        });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN: Set promo mode (activate / deactivate / change end date) ─────────
// POST /api/subscription/admin/promo
exports.setPromo = async (req, res, next) => {
    try {
        const { active, endDate, label } = req.body;

        if (typeof active !== 'boolean') {
            return res.status(400).json({ success: false, message: '"active" (boolean) is required' });
        }

        // Upsert all three settings
        const upsert = `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`;

        await pool.query(upsert, ['promo_active', String(active)]);
        await pool.query(upsert, ['promo_end_date', endDate || null]);
        await pool.query(upsert, ['promo_label', label || null]);

        const action = active ? 'activated' : 'deactivated';
        console.log(`🎉 Promo mode ${action} by admin (ends: ${endDate || 'no end date'})`);

        res.json({
            success: true,
            message: `Promo mode ${action} successfully`,
            promo: { active, endDate: endDate || null, label: label || null }
        });
    } catch (error) {
        next(error);
    }
};
