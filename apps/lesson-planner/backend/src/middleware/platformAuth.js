const { loadPlatformContext, resolveSchoolId, applySchoolModules } = require('../services/platformService');

/**
 * Loads the platform context (school, roles, permissions, modules) for the
 * authenticated user. Must run after authMiddleware.
 */
const platformAuth = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Authentication required' });
        }

        const ctx = await loadPlatformContext(req.user.id);
        if (!ctx) {
            return res.status(401).json({ success: false, code: 'USER_NOT_FOUND', message: 'Account not found' });
        }
        if (ctx.user.is_suspended) {
            return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended.' });
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
                message: 'You are not linked to an active school. Please contact your school administrator.'
            });
        }

        const requested = req.headers['x-school-id'] || req.query.school_id;
        if (requested && !ctx.isSuperAdmin && !ctx.allowedSchoolIds.includes(Number(requested))) {
            return res.status(403).json({
                success: false,
                code: 'SCHOOL_FORBIDDEN',
                message: 'You do not have access to that school.'
            });
        }

        ctx.schoolId = resolveSchoolId(ctx, requested);
        await applySchoolModules(ctx, ctx.schoolId);
        req.platform = ctx;
        next();
    } catch (error) {
        console.error('platformAuth error:', error);
        res.status(500).json({ success: false, message: 'Unable to load your platform permissions.' });
    }
};

/** Require at least one of the supplied permission codes. */
const requirePermission = (...codes) => (req, res, next) => {
    const ctx = req.platform;
    if (!ctx) {
        return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Authentication required' });
    }
    if (ctx.isSuperAdmin) return next();
    const ok = codes.some((code) => ctx.hasPermission(code));
    if (!ok) {
        return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to perform this action.',
            required: codes
        });
    }
    next();
};

/** Require every supplied permission code. */
const requireAllPermissions = (...codes) => (req, res, next) => {
    const ctx = req.platform;
    if (!ctx) {
        return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Authentication required' });
    }
    if (ctx.isSuperAdmin) return next();
    const missing = codes.filter((code) => !ctx.hasPermission(code));
    if (missing.length > 0) {
        return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to perform this action.',
            missing
        });
    }
    next();
};

/**
 * Require that a module is enabled for the request's working school.
 * Super administrators bypass this so they can inspect and repair any school.
 */
const requireModule = (code) => (req, res, next) => {
    const ctx = req.platform;
    if (!ctx) {
        return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Authentication required' });
    }
    if (ctx.isSuperAdmin) return next();
    const enabled = (ctx.modules || []).some((m) => m.code === code);
    if (!enabled) {
        return res.status(403).json({
            success: false,
            code: 'MODULE_DISABLED',
            message: 'This module is not enabled for your school.',
            module: code
        });
    }
    next();
};

const requireSuperAdmin = (req, res, next) => {    if (!req.platform || !req.platform.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            code: 'SUPER_ADMIN_REQUIRED',
            message: 'This action is restricted to platform super administrators.'
        });
    }
    next();
};

module.exports = { platformAuth, requirePermission, requireAllPermissions, requireSuperAdmin, requireModule };
