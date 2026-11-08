const { pool } = require('../config/database');

/**
 * Platform service
 * ----------------
 * Central helper for multi-school context, permissions, audit logging and
 * notifications. Every platform request is resolved through this module so
 * that school isolation and RBAC are enforced in one place.
 */

const SUPER_ADMIN = 'super_admin';

const getClientIp = (req) => {
    if (!req) return null;
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim().slice(0, 64);
    return (req.socket && req.socket.remoteAddress) || null;
};

const safeJson = (value) => {
    try {
        return value === undefined ? null : JSON.stringify(value);
    } catch (err) {
        return null;
    }
};

/**
 * Read the per-school module overrides. A module that has no explicit row is
 * enabled by default, matching the platform default.
 */
const loadSchoolModuleOverrides = async (schoolId) => {
    if (!schoolId) return null;
    const [rows] = await pool.query(
        'SELECT module_code, is_enabled FROM school_modules WHERE school_id = ?',
        [schoolId]
    );
    return new Map(rows.map((row) => [row.module_code, Number(row.is_enabled) === 1]));
};

/**
 * Drop modules a school has disabled and annotate every row with the effective
 * `school_enabled` flag so the frontend can show both scopes.
 */
const filterBySchoolModules = (modules, overrides) => {
    if (!overrides) {
        return modules.map((m) => ({ ...m, school_enabled: Boolean(m.is_enabled) }));
    }
    return modules
        .filter((m) => overrides.get(m.code) !== false)
        .map((m) => ({
            ...m,
            school_enabled: overrides.has(m.code) ? overrides.get(m.code) : true
        }));
};

/**
 * Re-apply the school module filter after the request's working school has
 * been resolved (a user can belong to more than one school).
 */
const applySchoolModules = async (ctx, schoolId) => {
    const overrides = await loadSchoolModuleOverrides(schoolId);
    ctx.modules = filterBySchoolModules(ctx.baseModules || ctx.modules, overrides);
    return ctx.modules;
};

/**
 * Load the full authorization context for a user.
 * Returns null when the user no longer exists or is suspended.
 */
const loadPlatformContext = async (userId) => {
    const [users] = await pool.query(
        `SELECT id, full_name, email, phone_number, role, school_name, school_id,
                is_suspended, is_email_verified, language, theme, profile_photo,
                created_at, last_login_at
         FROM users WHERE id = ?`,
        [userId]
    );
    if (users.length === 0) return null;
    const user = users[0];

    const [memberships] = await pool.query(
        `SELECT m.id, m.school_id, m.status AS membership_status, m.is_primary, m.joined_at,
                r.id AS role_id, r.code AS role_code, r.name AS role_name, r.level AS role_level,
                s.name AS school_name, s.code AS school_code, s.status AS school_status,
                s.logo_url, s.district, s.province, s.subscription_plan
         FROM school_memberships m
         JOIN roles r ON r.id = m.role_id
         JOIN schools s ON s.id = m.school_id
         WHERE m.user_id = ?
         ORDER BY m.is_primary DESC, r.level DESC`,
        [userId]
    );

    const isSuperAdmin = user.role === SUPER_ADMIN ||
        memberships.some((m) => m.role_code === SUPER_ADMIN);

    const activeMemberships = memberships.filter(
        (m) => m.membership_status === 'active' && m.school_status === 'active'
    );
    const roleCodes = new Set(activeMemberships.map((m) => m.role_code));
    if (user.role) roleCodes.add(user.role);

    let permissions = new Set();
    if (isSuperAdmin) {
        const [rows] = await pool.query('SELECT code FROM permissions');
        permissions = new Set(rows.map((r) => r.code));
    } else if (activeMemberships.length > 0) {
        const roleIds = [...new Set(activeMemberships.map((m) => m.role_id))];
        const placeholders = roleIds.map(() => '?').join(',');
        const [rows] = await pool.query(
            `SELECT DISTINCT p.code
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id IN (${placeholders})`,
            roleIds
        );
        permissions = new Set(rows.map((r) => r.code));
    }

    // Resolve the school the user is currently working in.
    const primary = activeMemberships.find((m) => m.is_primary) || activeMemberships[0];
    const defaultSchoolId = primary ? primary.school_id : (user.school_id || null);
    const allowedSchoolIds = [...new Set(activeMemberships.map((m) => m.school_id))];

    // Modules available to this user based on role audience.
    const [moduleRows] = await pool.query(
        'SELECT code, name, description, icon, audience, route, is_enabled, sort_order FROM modules WHERE is_enabled = 1 ORDER BY sort_order'
    );
    const audienceMatches = (audience) => {
        if (isSuperAdmin) return true;
        if (!audience || audience === 'all') return true;
        if (audience === 'all-staff') {
            return !['student', 'parent'].some((r) => roleCodes.has(r));
        }
        if (audience === 'management') {
            return ['school_admin', 'headteacher', 'dos', SUPER_ADMIN].some((r) => roleCodes.has(r));
        }
        return audience.split(',').map((s) => s.trim()).some((r) => roleCodes.has(r));
    };
    const visibleModules = moduleRows.filter((m) => audienceMatches(m.audience));
    // A school administrator can disable a platform module for their school.
    // The toggle is stored in `school_modules` and enforced here so a disabled
    // module disappears from the menu AND its API calls are rejected.
    const overrides = await loadSchoolModuleOverrides(defaultSchoolId);
    const modules = filterBySchoolModules(visibleModules, overrides);

    const hasPermission = (code) => {
        if (!code) return true;
        if (isSuperAdmin) return true;
        return permissions.has(code);
    };

    return {
        user,
        isSuperAdmin,
        memberships,
        activeMemberships,
        permissions,
        roleCodes,
        primaryRole: primary ? primary.role_code : (isSuperAdmin ? SUPER_ADMIN : user.role),
        defaultSchoolId,
        allowedSchoolIds,
        schoolId: defaultSchoolId,
        modules,
        baseModules: visibleModules,
        hasPermission,
        isStudent: roleCodes.has('student'),
        isParent: roleCodes.has('parent'),
        isTeacher: roleCodes.has('teacher') || roleCodes.has('hod'),
        pendingMembership: memberships.find((m) => m.membership_status === 'pending') || null
    };
};

/**
 * Resolve which school a request is operating on. Super administrators may
 * pass a school_id; everyone else is forced to a school they belong to.
 */
const resolveSchoolId = (ctx, requested) => {
    const requestedId = requested === undefined || requested === null || requested === ''
        ? null
        : Number(requested);

    if (ctx.isSuperAdmin) {
        if (requestedId !== null && Number.isFinite(requestedId)) return requestedId;
        return null; // null means "all schools" for platform-wide queries
    }

    if (requestedId !== null && ctx.allowedSchoolIds.includes(requestedId)) {
        return requestedId;
    }
    return ctx.defaultSchoolId;
};

const schoolScope = (ctx, schoolColumn, requested) => {
    const schoolId = resolveSchoolId(ctx, requested);
    if (schoolId === null) {
        return { clause: '1 = 1', params: [], schoolId: null };
    }
    return { clause: `${schoolColumn} = ?`, params: [schoolId], schoolId };
};

const writeAuditLog = async ({ userId, schoolId, action, module, entity, entityId, details, req }) => {
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, school_id, action, module, entity, entity_id, details, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                schoolId || null,
                action,
                module || null,
                entity || null,
                entityId === undefined || entityId === null ? null : String(entityId),
                safeJson(details),
                getClientIp(req),
                req && req.headers ? String(req.headers['user-agent'] || '').slice(0, 500) : null
            ]
        );
    } catch (err) {
        console.error('Audit log write failed:', err.message);
    }
};

const notify = async ({ userId, schoolId, title, message, type, link }) => {
    if (!userId) return;
    try {
        await pool.query(
            `INSERT INTO platform_notifications (user_id, school_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, schoolId || null, title, message || null, type || 'info', link || null]
        );
    } catch (err) {
        console.error('Notification write failed:', err.message);
    }
};

const notifyUsers = async (userIds, payload) => {
    const unique = [...new Set((userIds || []).filter(Boolean).map(Number))];
    await Promise.all(unique.map((userId) => notify({ ...payload, userId })));
};

const userIdsWithPermission = async (permission, schoolId) => {
    const [rows] = await pool.query(
        `SELECT DISTINCT m.user_id
         FROM school_memberships m
         JOIN role_permissions rp ON rp.role_id = m.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE p.code = ? AND m.status = 'active'
           AND (? IS NULL OR m.school_id = ?)`,
        [permission, schoolId || null, schoolId || null]
    );
    return rows.map((r) => r.user_id);
};

const getPagination = (query, defaultLimit = 20, maxLimit = 100) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, offset: (page - 1) * limit };
};

const parseIntOrNull = (value) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
};

const parseBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const formatDate = (value) => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
};

const toCsv = (headers, rows) => {
    const head = headers.map((h) => csvEscape(h.label)).join(',');
    const body = rows.map((row) => headers.map((h) => csvEscape(row[h.key])).join(',')).join('\r\n');
    return `${head}\r\n${body}\r\n`;
};

module.exports = {
    SUPER_ADMIN,
    loadPlatformContext,
    applySchoolModules,
    resolveSchoolId,
    schoolScope,
    writeAuditLog,
    notify,
    notifyUsers,
    userIdsWithPermission,
    getPagination,
    parseIntOrNull,
    parseBoolean,
    formatDate,
    toCsv,
    getClientIp
};
