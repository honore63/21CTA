const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const {
    writeAuditLog,
    getPagination,
    notify,
    parseBoolean
} = require('../services/platformService');

/**
 * Platform administration controller
 * --------------------------------
 * Users, schools, registrations, settings, modules and audit logs. Every
 * handler re-checks the acting user's platform context; super administrators
 * may act across schools, everyone else is pinned to their own school.
 */

const SUPER_ADMIN = 'super_admin';

const notEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const temporaryPassword = () => {
    // Readable, high-entropy temporary password: 3 words + digits in base32.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const pick = (n) => Array.from({ length: n }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
    return `${pick(4)}-${pick(4)}-${pick(4)}`;
};

const hashPassword = (plain) => bcrypt.hash(plain, 10);

const dayStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

const uniqueSchoolCode = async (name) => {
    const base = String(name || 'SCHOOL')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 18) || 'SCHOOL';
    let candidate = base;
    for (let i = 0; i < 50; i += 1) {
        const [rows] = await pool.query('SELECT id FROM schools WHERE code = ? LIMIT 1', [candidate]);
        if (rows.length === 0) return candidate;
        candidate = `${base}-${dayStamp()}${i > 0 ? i : ''}`.slice(0, 40);
    }
    return `${base}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

/* ==========================================================================
 * Scope helpers
 * ========================================================================== */

const scopedSchoolId = (ctx) => (ctx.isSuperAdmin ? null : ctx.schoolId);

const targetUserInScope = async (ctx, userId) => {
    if (ctx.isSuperAdmin) {
        const [rows] = await pool.query(
            'SELECT id, full_name, email, role, school_id, is_suspended FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    }
    const [rows] = await pool.query(
        `SELECT DISTINCT u.id, u.full_name, u.email, u.role, u.school_id, u.is_suspended
         FROM users u
         JOIN school_memberships m ON m.user_id = u.id AND m.school_id = ?
         WHERE u.id = ?`,
        [ctx.schoolId, userId]
    );
    return rows[0] || null;
};

const assignableRoleCodes = async (ctx) => {
    const [rows] = await pool.query('SELECT code, name, scope, level FROM roles ORDER BY level DESC');
    if (ctx.isSuperAdmin) return rows;
    // School-level actors may only assign school-scoped roles below their own level.
    const myLevel = Math.max(
        0,
        ...ctx.activeMemberships.filter((m) => m.school_id === ctx.schoolId).map((m) => Number(m.role_level || 0))
    );
    return rows.filter((r) => r.scope === 'school' && r.code !== 'school_admin' && Number(r.level) < myLevel);
};

const canManageUser = (ctx, target) => {
    if (!target) return false;
    if (ctx.isSuperAdmin) return true;
    if (target.id === ctx.user.id) return false;
    // A school administrator cannot demote or suspend another school administrator.
    return true;
};

/* ==========================================================================
 * Users
 * ========================================================================== */

exports.listUsers = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const { page, limit, offset } = getPagination(req.query, 20, 100);
        const q = String(req.query.q || '').trim();
        const status = String(req.query.status || '').trim();
        const roleFilter = String(req.query.role || '').trim();

        const where = [];
        const params = [];

        if (!ctx.isSuperAdmin) {
            where.push('u.id IN (SELECT user_id FROM school_memberships WHERE school_id = ?)');
            params.push(ctx.schoolId);
        } else if (req.query.school_id) {
            where.push('u.id IN (SELECT user_id FROM school_memberships WHERE school_id = ?)');
            params.push(Number(req.query.school_id));
        }
        if (q) {
            where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (status === 'suspended') where.push('u.is_suspended = 1');
        if (status === 'active') where.push('u.is_suspended = 0');
        if (roleFilter) {
            where.push(`u.id IN (
                SELECT m2.user_id FROM school_memberships m2
                JOIN roles r2 ON r2.id = m2.role_id WHERE r2.code = ?
            )`);
            params.push(roleFilter);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const [countRows] = await pool.query(
            `SELECT COUNT(DISTINCT u.id) AS total FROM users u ${whereSql}`, params
        );

        const [rows] = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone_number, u.role, u.school_id,
                    u.is_suspended, u.is_email_verified, u.language, u.theme,
                    u.last_login_at, u.created_at,
                    GROUP_CONCAT(DISTINCT CONCAT(r.code, ':', s.name) ORDER BY r.level DESC SEPARATOR '|') AS assignments
             FROM users u
             LEFT JOIN school_memberships m ON m.user_id = u.id
             LEFT JOIN roles r ON r.id = m.role_id
             LEFT JOIN schools s ON s.id = m.school_id
             ${whereSql}
             GROUP BY u.id
             ORDER BY u.full_name ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const users = rows.map((row) => {
            const assignments = (row.assignments || '')
                .split('|')
                .filter(Boolean)
                .map((entry) => {
                    const [code, ...rest] = entry.split(':');
                    return { role_code: code, school_name: rest.join(':') };
                });
            delete row.assignments;
            return { ...row, assignments };
        });

        res.json({
            success: true,
            data: users,
            pagination: { page, limit, total: Number(countRows[0].total), pages: Math.ceil(Number(countRows[0].total) / limit) },
            available_roles: await assignableRoleCodes(ctx)
        });
    } catch (error) {
        next(error);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const {
            full_name, email, phone_number, password, role_code, school_id,
            language = 'en', theme = 'light'
        } = req.body;

        if (!notEmpty(full_name) || !validEmail(email) || !notEmpty(role_code)) {
            return res.status(400).json({ success: false, message: 'Full name, a valid email address and a role are required.' });
        }

        const [roleRows] = await pool.query('SELECT id, code, scope, level FROM roles WHERE code = ?', [role_code]);
        if (roleRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Unknown role.' });
        }
        const role = roleRows[0];

        if (!ctx.isSuperAdmin) {
            if (role.code === SUPER_ADMIN || role.scope === 'platform') {
                return res.status(403).json({ success: false, message: 'You cannot create platform administrators.' });
            }
            if (role.code === 'school_admin') {
                return res.status(403).json({ success: false, message: 'Only a super administrator can create another school administrator.' });
            }
        }

        const targetSchoolId = ctx.isSuperAdmin
            ? (school_id ? Number(school_id) : (ctx.schoolId || null))
            : ctx.schoolId;

        if (role.code !== SUPER_ADMIN) {
            if (!targetSchoolId) {
                return res.status(400).json({ success: false, message: 'A school must be selected for this user.' });
            }
            const [schoolRows] = await pool.query("SELECT id FROM schools WHERE id = ? AND status = 'active'", [targetSchoolId]);
            if (schoolRows.length === 0) {
                return res.status(400).json({ success: false, message: 'Select an active school.' });
            }
        }

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR (phone_number IS NOT NULL AND phone_number = ?) LIMIT 1',
            [email.trim().toLowerCase(), phone_number || null]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email or phone number already exists.' });
        }

        const plainPassword = notEmpty(password) ? password : temporaryPassword();
        if (plainPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        }
        const password_hash = await hashPassword(plainPassword);

        const connection = await pool.getConnection();
        let userId;
        try {
            await connection.beginTransaction();
            const [result] = await connection.query(
                `INSERT INTO users (full_name, email, phone_number, password_hash, role, school_name,
                                    school_id, is_email_verified, language, theme)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                [
                    full_name.trim(), email.trim().toLowerCase(), phone_number || null, password_hash,
                    role.code, null, role.code === SUPER_ADMIN ? null : targetSchoolId,
                    ['en', 'fr', 'rw', 'sw'].includes(language) ? language : 'en',
                    ['light', 'dark'].includes(theme) ? theme : 'light'
                ]
            );
            userId = result.insertId;

            if (role.code !== SUPER_ADMIN) {
                await connection.query(
                    `INSERT INTO school_memberships (user_id, school_id, role_id, status, is_primary)
                     VALUES (?, ?, ?, 'active', 1)`,
                    [userId, targetSchoolId, role.id]
                );
                await connection.query(
                    'UPDATE users SET school_name = (SELECT name FROM schools WHERE id = ?) WHERE id = ?',
                    [targetSchoolId, userId]
                );
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        await writeAuditLog({
            userId: ctx.user.id, schoolId: targetSchoolId, action: 'user.create', module: 'users',
            entity: 'user', entityId: userId,
            details: { email: email.trim().toLowerCase(), role_code: role.code, school_id: targetSchoolId }, req
        });

        res.status(201).json({
            success: true,
            message: 'User account created.',
            data: {
                id: userId,
                email: email.trim().toLowerCase(),
                role_code: role.code,
                school_id: targetSchoolId,
                temporary_password: notEmpty(password) ? null : plainPassword
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const target = await targetUserInScope(ctx, req.params.id);
        if (!target) return res.status(404).json({ success: false, message: 'User not found in your school.' });
        if (!canManageUser(ctx, target)) {
            return res.status(403).json({ success: false, message: 'You cannot modify this account.' });
        }

        const allowed = ['full_name', 'phone_number', 'is_email_verified', 'language', 'theme', 'is_suspended'];
        const updates = [];
        const values = [];

        for (const field of allowed) {
            if (req.body[field] === undefined) continue;
            if (field === 'full_name' && !notEmpty(req.body.full_name)) {
                return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
            }
            if (field === 'language' && !['en', 'fr', 'rw', 'sw'].includes(req.body.language)) {
                return res.status(400).json({ success: false, message: 'Unsupported language.' });
            }
            if (field === 'theme' && !['light', 'dark'].includes(req.body.theme)) {
                return res.status(400).json({ success: false, message: 'Unsupported theme.' });
            }
            if (field === 'is_suspended' && target.id === ctx.user.id) {
                return res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
            }
            updates.push(`${field} = ?`);
            values.push(['is_email_verified', 'is_suspended'].includes(field)
                ? (parseBoolean(req.body[field]) ? 1 : 0)
                : (req.body[field] === '' ? null : req.body[field]));
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(target.id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId, action: 'user.update', module: 'users',
            entity: 'user', entityId: target.id, details: req.body, req
        });

        res.json({ success: true, message: 'User updated.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'That phone number is already in use.' });
        }
        next(error);
    }
};

exports.setUserRoles = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const target = await targetUserInScope(ctx, req.params.id);
        if (!target) return res.status(404).json({ success: false, message: 'User not found in your school.' });
        if (!canManageUser(ctx, target)) {
            return res.status(403).json({ success: false, message: 'You cannot modify this account.' });
        }

        const roleCodes = Array.isArray(req.body.roles)
            ? req.body.roles
            : [req.body.role_code].filter(Boolean);
        if (roleCodes.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one role is required.' });
        }

        const targetSchoolId = ctx.isSuperAdmin
            ? (req.body.school_id ? Number(req.body.school_id) : ctx.schoolId)
            : ctx.schoolId;
        if (!targetSchoolId) {
            return res.status(400).json({ success: false, message: 'A school must be selected.' });
        }

        const allowed = await assignableRoleCodes(ctx);
        const allowedCodes = new Set(allowed.map((r) => r.code));
        if (!ctx.isSuperAdmin) {
            for (const code of roleCodes) {
                if (!allowedCodes.has(code)) {
                    return res.status(403).json({ success: false, message: `You cannot assign the ${code} role.` });
                }
            }
        }

        const [roleRows] = await pool.query(
            `SELECT id, code FROM roles WHERE code IN (${roleCodes.map(() => '?').join(',')})`,
            roleCodes
        );
        if (roleRows.length !== new Set(roleCodes).size) {
            return res.status(400).json({ success: false, message: 'One or more roles do not exist.' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query(
                'DELETE FROM school_memberships WHERE user_id = ? AND school_id = ?',
                [target.id, targetSchoolId]
            );
            for (let i = 0; i < roleRows.length; i += 1) {
                await connection.query(
                    `INSERT INTO school_memberships (user_id, school_id, role_id, status, is_primary)
                     VALUES (?, ?, ?, 'active', ?)`,
                    [target.id, targetSchoolId, roleRows[i].id, i === 0 ? 1 : 0]
                );
            }
            await connection.query(
                'UPDATE users SET role = ?, school_id = ? WHERE id = ?',
                [roleRows[0].code, targetSchoolId, target.id]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        await notify({
            userId: target.id, schoolId: targetSchoolId,
            title: 'Your roles were updated',
            message: `An administrator updated your role to: ${roleRows.map((r) => r.code).join(', ')}.`,
            type: 'users', link: '/app/settings'
        });
        await writeAuditLog({
            userId: ctx.user.id, schoolId: targetSchoolId, action: 'user.roles.update', module: 'users',
            entity: 'user', entityId: target.id, details: { roles: roleCodes, school_id: targetSchoolId }, req
        });

        res.json({ success: true, message: 'Roles updated.' });
    } catch (error) {
        next(error);
    }
};

exports.resetUserPassword = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const target = await targetUserInScope(ctx, req.params.id);
        if (!target) return res.status(404).json({ success: false, message: 'User not found in your school.' });
        if (!canManageUser(ctx, target)) {
            return res.status(403).json({ success: false, message: 'You cannot modify this account.' });
        }

        const plain = temporaryPassword();
        const password_hash = await hashPassword(plain);
        await pool.query(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [password_hash, target.id]
        );

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId, action: 'user.password.reset', module: 'users',
            entity: 'user', entityId: target.id, details: {}, req
        });

        res.json({
            success: true,
            message: 'Password reset. Share the temporary password with the user and ask them to change it after signing in.',
            data: { temporary_password: plain }
        });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Schools
 * ========================================================================== */

exports.listSchools = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const { page, limit, offset } = getPagination(req.query, 20, 100);
        const q = String(req.query.q || '').trim();
        const status = String(req.query.status || '').trim();

        const where = [];
        const params = [];
        if (!ctx.isSuperAdmin) {
            where.push('s.id = ?');
            params.push(ctx.schoolId);
        }
        if (q) {
            where.push('(s.name LIKE ? OR s.code LIKE ? OR s.district LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (status) {
            where.push('s.status = ?');
            params.push(status);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM schools s ${whereSql}`, params);
        const [rows] = await pool.query(
            `SELECT s.*,
                    (SELECT COUNT(*) FROM student_profiles sp WHERE sp.school_id = s.id AND sp.status = 'active') AS students,
                    (SELECT COUNT(*) FROM teacher_profiles tp WHERE tp.school_id = s.id AND tp.status = 'active') AS teachers,
                    (SELECT COUNT(*) FROM school_memberships m WHERE m.school_id = s.id AND m.status = 'active') AS users,
                    (SELECT COUNT(*) FROM classes c WHERE c.school_id = s.id) AS classes
             FROM schools s ${whereSql}
             ORDER BY s.name ASC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total: Number(countRows[0].total), pages: Math.ceil(Number(countRows[0].total) / limit) }
        });
    } catch (error) {
        next(error);
    }
};

const createSchoolRecord = async ({ name, code, ...rest }) => {
    const schoolCode = code || await uniqueSchoolCode(name);
    const [result] = await pool.query(
        `INSERT INTO schools
         (name, code, school_type, ownership, district, province, sector, cell, address, phone, email,
          website, logo_url, motto, status, subscription_plan, max_users, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            name.trim(), schoolCode,
            rest.school_type || 'secondary', rest.ownership || 'public',
            rest.district || null, rest.province || null, rest.sector || null, rest.cell || null,
            rest.address || null, rest.phone || null, rest.email || null,
            rest.website || null, rest.logo_url || null, rest.motto || null,
            rest.status || 'active', rest.subscription_plan || 'trial', Number(rest.max_users) || 500
        ]
    );
    return { id: result.insertId, code: schoolCode };
};

const provisionSchool = async (schoolId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            `INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
             VALUES (?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE is_current = 1`,
            [schoolId, '2026-2027', '2026-09-01', '2027-07-16']
        );
        const [years] = await connection.query(
            'SELECT id FROM academic_years WHERE school_id = ? AND name = ? LIMIT 1',
            [schoolId, '2026-2027']
        );
        if (years.length > 0) {
            await connection.query(
                `INSERT INTO terms (school_id, academic_year_id, name, start_date, end_date, is_current)
                 VALUES (?, ?, 'Term 1', '2026-09-01', '2026-12-04', 1)
                 ON DUPLICATE KEY UPDATE is_current = 1`,
                [schoolId, years[0].id]
            );
        }
        await connection.query(
            `INSERT IGNORE INTO school_modules (school_id, module_code, is_enabled)
             SELECT ?, code, 1 FROM modules WHERE is_enabled = 1`,
            [schoolId]
        );
        await connection.query(
            `INSERT IGNORE INTO school_settings (school_id, setting_key, setting_value) VALUES
             (?, 'academic_year', '2026-2027'),
             (?, 'grading_scale', 'A:80-100,B:70-79,C:60-69,D:50-59,E:0-49')`,
            [schoolId, schoolId]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

exports.createSchool = async (req, res, next) => {
    try {
        const ctx = req.platform;
        if (!notEmpty(req.body.name)) {
            return res.status(400).json({ success: false, message: 'School name is required.' });
        }
        const created = await createSchoolRecord(req.body);
        await provisionSchool(created.id);

        await writeAuditLog({
            userId: ctx.user.id, schoolId: created.id, action: 'school.create', module: 'platform',
            entity: 'school', entityId: created.id, details: { name: req.body.name, code: created.code }, req
        });

        res.status(201).json({
            success: true,
            message: 'School created and provisioned.',
            data: { id: created.id, code: created.code }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'A school with this name or code already exists.' });
        }
        next(error);
    }
};

exports.updateSchool = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const id = ctx.isSuperAdmin ? Number(req.params.id) : ctx.schoolId;
        const [existing] = await pool.query('SELECT id FROM schools WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'School not found.' });
        }

        const fields = ['name', 'school_type', 'ownership', 'district', 'province', 'sector', 'cell',
            'address', 'phone', 'email', 'website', 'logo_url', 'motto', 'subscription_plan', 'max_users'];
        const updates = [];
        const values = [];
        for (const field of fields) {
            if (req.body[field] === undefined) continue;
            updates.push(`${field} = ?`);
            values.push(req.body[field] === '' ? null : req.body[field]);
        }
        // Status changes are platform-level only.
        if (req.body.status !== undefined) {
            if (!ctx.isSuperAdmin) {
                return res.status(403).json({ success: false, message: 'Only a super administrator can change a school status.' });
            }
            if (!['pending', 'active', 'suspended', 'rejected'].includes(req.body.status)) {
                return res.status(400).json({ success: false, message: 'Invalid school status.' });
            }
            updates.push('status = ?');
            values.push(req.body.status);
            if (req.body.status === 'active') {
                updates.push('approved_at = COALESCE(approved_at, NOW())');
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }
        values.push(id);
        await pool.query(`UPDATE schools SET ${updates.join(', ')} WHERE id = ?`, values);

        await writeAuditLog({
            userId: ctx.user.id, schoolId: id, action: 'school.update', module: 'school',
            entity: 'school', entityId: id, details: req.body, req
        });

        res.json({ success: true, message: 'School updated.' });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Registrations
 * ========================================================================== */

exports.listRegistrations = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const { page, limit, offset } = getPagination(req.query, 20, 100);
        const status = String(req.query.status || 'pending').trim();

        const where = [];
        const params = [];
        if (status !== 'all') {
            where.push('rr.status = ?');
            params.push(status);
        }
        if (!ctx.isSuperAdmin) {
            where.push('(rr.school_id = ? OR (rr.school_id IS NULL AND rr.school_name = (SELECT name FROM schools WHERE id = ?)))');
            params.push(ctx.schoolId, ctx.schoolId);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM registration_requests rr ${whereSql}`, params
        );
        const [rows] = await pool.query(
            `SELECT rr.*, s.name AS linked_school_name, u.full_name AS reviewed_by_name
             FROM registration_requests rr
             LEFT JOIN schools s ON s.id = rr.school_id
             LEFT JOIN users u ON u.id = rr.reviewed_by
             ${whereSql}
             ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total: Number(countRows[0].total), pages: Math.ceil(Number(countRows[0].total) / limit) }
        });
    } catch (error) {
        next(error);
    }
};

exports.reviewRegistration = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const decision = String(req.body.decision || '').toLowerCase();
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
        }

        const [rows] = await pool.query('SELECT * FROM registration_requests WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Registration request not found.' });
        }
        const request = rows[0];
        if (request.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This request has already been reviewed.' });
        }

        // School-level actors may only review user requests for their own school.
        if (!ctx.isSuperAdmin) {
            if (request.request_type !== 'user' || request.school_id !== ctx.schoolId) {
                return res.status(403).json({ success: false, message: 'You can only review user requests for your own school.' });
            }
        }

        const notes = req.body.review_notes ? String(req.body.review_notes).slice(0, 255) : null;

        if (decision === 'rejected') {
            await pool.query(
                `UPDATE registration_requests
                 SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
                 WHERE id = ?`,
                [ctx.user.id, notes, request.id]
            );
            await notify({
                userId: ctx.user.id, schoolId: request.school_id,
                title: 'Registration rejected', message: `${request.contact_name} (${request.email}) was rejected.`,
                type: 'registrations', link: '/app/registrations'
            });
            await writeAuditLog({
                userId: ctx.user.id, schoolId: request.school_id, action: 'registration.reject',
                module: 'registrations', entity: 'registration_request', entityId: request.id,
                details: { email: request.email, notes }, req
            });
            return res.json({ success: true, message: 'Registration request rejected.' });
        }

        // ---- Approval ----
        let createdUserId = null;
        let createdSchoolId = request.school_id || null;
        let tempPasswordOut = null;
        let roleCodeOut = request.role_code || 'teacher';

        if (request.request_type === 'school') {
            const [existingSchool] = await pool.query('SELECT id FROM schools WHERE name = ? LIMIT 1', [request.school_name]);
            if (existingSchool.length > 0) {
                createdSchoolId = existingSchool[0].id;
                await pool.query("UPDATE schools SET status = 'active', approved_at = COALESCE(approved_at, NOW()) WHERE id = ?", [createdSchoolId]);
            } else {
                const created = await createSchoolRecord({
                    name: request.school_name,
                    district: request.district,
                    province: request.province,
                    phone: request.phone,
                    email: request.email,
                    status: 'active'
                });
                createdSchoolId = created.id;
            }
            await provisionSchool(createdSchoolId);
            roleCodeOut = 'school_admin';
        } else if (!createdSchoolId) {
            const [schoolRows] = await pool.query('SELECT id FROM schools WHERE name = ? LIMIT 1', [request.school_name]);
            createdSchoolId = schoolRows.length ? schoolRows[0].id : null;
        }

        // Create the applicant account when one does not already exist.
        const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [request.email]);
        if (existingUser.length > 0) {
            createdUserId = existingUser[0].id;
        } else if (createdSchoolId) {
            const [roleRows] = await pool.query('SELECT id, code FROM roles WHERE code = ?', [roleCodeOut]);
            const role = roleRows[0] || null;
            if (!role) {
                return res.status(400).json({ success: false, message: 'The requested role no longer exists.' });
            }
            const plain = temporaryPassword();
            tempPasswordOut = plain;
            const password_hash = await hashPassword(plain);
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                const [result] = await connection.query(
                    `INSERT INTO users (full_name, email, phone_number, password_hash, role, school_name,
                                        school_id, is_email_verified, language, theme)
                     VALUES (?, ?, ?, ?, ?, (SELECT name FROM schools WHERE id = ?), ?, 1, 'en', 'light')`,
                    [request.contact_name, request.email.toLowerCase(), request.phone || null,
                        password_hash, role.code, createdSchoolId, createdSchoolId]
                );
                createdUserId = result.insertId;
                await connection.query(
                    `INSERT INTO school_memberships (user_id, school_id, role_id, status, is_primary)
                     VALUES (?, ?, ?, 'active', 1)`,
                    [createdUserId, createdSchoolId, role.id]
                );
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }

        await pool.query(
            `UPDATE registration_requests
             SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_notes = ?, school_id = COALESCE(school_id, ?)
             WHERE id = ?`,
            [ctx.user.id, notes, createdSchoolId, request.id]
        );

        if (createdUserId) {
            await notify({
                userId: createdUserId, schoolId: createdSchoolId,
                title: 'Registration approved',
                message: 'Your account has been approved. Sign in to access your dashboard.',
                type: 'registrations', link: '/app/dashboard'
            });
        }
        await writeAuditLog({
            userId: ctx.user.id, schoolId: createdSchoolId, action: 'registration.approve',
            module: 'registrations', entity: 'registration_request', entityId: request.id,
            details: { email: request.email, role: roleCodeOut, user_id: createdUserId }, req
        });

        res.json({
            success: true,
            message: request.request_type === 'school'
                ? 'School approved and provisioned.'
                : 'Registration approved and account created.',
            data: {
                user_id: createdUserId,
                school_id: createdSchoolId,
                role_code: roleCodeOut,
                temporary_password: tempPasswordOut
            }
        });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Settings
 * ========================================================================== */

exports.getSettings = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const [platformRows] = await pool.query(
            'SELECT setting_key, setting_value, category FROM platform_settings ORDER BY category, setting_key'
        );
        const [schoolRows] = await pool.query(
            'SELECT setting_key, setting_value FROM school_settings WHERE school_id = ? ORDER BY setting_key',
            [ctx.schoolId || 0]
        );

        const group = (rows) => {
            const out = {};
            rows.forEach((row) => {
                if (!out[row.category]) out[row.category] = {};
                out[row.category][row.setting_key] = row.setting_value;
            });
            return out;
        };

        res.json({
            success: true,
            data: {
                platform: group(platformRows),
                school: Object.fromEntries(schoolRows.map((r) => [r.setting_key, r.setting_value])),
                can_manage_platform: ctx.isSuperAdmin,
                can_manage_school: ctx.hasPermission('settings.manage')
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const platformUpdates = req.body.platform && typeof req.body.platform === 'object' ? req.body.platform : null;
        const schoolUpdates = req.body.school && typeof req.body.school === 'object' ? req.body.school : null;

        if (!platformUpdates && !schoolUpdates) {
            return res.status(400).json({ success: false, message: 'No settings supplied.' });
        }

        if (platformUpdates) {
            if (!ctx.isSuperAdmin) {
                return res.status(403).json({ success: false, message: 'Only a super administrator can change platform settings.' });
            }
            for (const [key, value] of Object.entries(platformUpdates)) {
                await pool.query(
                    `INSERT INTO platform_settings (setting_key, setting_value, category)
                     VALUES (?, ?, 'general')
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [key, value === null || value === undefined ? null : String(value)]
                );
            }
        }

        if (schoolUpdates) {
            if (!ctx.hasPermission('settings.manage')) {
                return res.status(403).json({ success: false, message: 'You do not have permission to change school settings.' });
            }
            if (!ctx.schoolId) {
                return res.status(400).json({ success: false, message: 'Select a school before changing school settings.' });
            }
            for (const [key, value] of Object.entries(schoolUpdates)) {
                await pool.query(
                    `INSERT INTO school_settings (school_id, setting_key, setting_value)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [ctx.schoolId, key, value === null || value === undefined ? null : String(value)]
                );
            }
        }

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId, action: 'settings.update', module: 'settings',
            entity: 'settings', entityId: ctx.schoolId || 'platform',
            details: { platform: platformUpdates ? Object.keys(platformUpdates) : [], school: schoolUpdates ? Object.keys(schoolUpdates) : [] },
            req
        });

        res.json({ success: true, message: 'Settings saved.' });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Audit log
 * ========================================================================== */

exports.listAudit = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const { page, limit, offset } = getPagination(req.query, 25, 100);
        const where = [];
        const params = [];

        if (!ctx.isSuperAdmin) {
            where.push('al.school_id = ?');
            params.push(ctx.schoolId);
        } else if (req.query.school_id) {
            where.push('al.school_id = ?');
            params.push(Number(req.query.school_id));
        }
        if (req.query.module) {
            where.push('al.module = ?');
            params.push(req.query.module);
        }
        if (req.query.action) {
            where.push('al.action LIKE ?');
            params.push(`%${req.query.action}%`);
        }
        if (req.query.user_id) {
            where.push('al.user_id = ?');
            params.push(Number(req.query.user_id));
        }
        if (req.query.date_from) {
            where.push('al.created_at >= ?');
            params.push(req.query.date_from);
        }
        if (req.query.date_to) {
            where.push('al.created_at <= ?');
            params.push(`${req.query.date_to} 23:59:59`);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs al ${whereSql}`, params);
        const [rows] = await pool.query(
            `SELECT al.id, al.action, al.module, al.entity, al.entity_id, al.details,
                    al.ip_address, al.created_at, u.full_name AS user_name, u.email AS user_email,
                    s.name AS school_name
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             LEFT JOIN schools s ON s.id = al.school_id
             ${whereSql}
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total: Number(countRows[0].total), pages: Math.ceil(Number(countRows[0].total) / limit) }
        });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Modules
 * ========================================================================== */

exports.listModules = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const [modules] = await pool.query(
            'SELECT * FROM modules ORDER BY sort_order ASC'
        );
        let schoolModules = [];
        if (ctx.schoolId) {
            [schoolModules] = await pool.query(
                'SELECT module_code, is_enabled FROM school_modules WHERE school_id = ?',
                [ctx.schoolId]
            );
        }
        const enabledMap = Object.fromEntries(schoolModules.map((m) => [m.module_code, Boolean(m.is_enabled)]));
        res.json({
            success: true,
            data: modules.map((m) => ({
                ...m,
                school_enabled: ctx.schoolId ? (enabledMap[m.code] === undefined ? Boolean(m.is_enabled) : enabledMap[m.code]) : Boolean(m.is_enabled)
            })),
            can_manage_platform: ctx.isSuperAdmin
        });
    } catch (error) {
        next(error);
    }
};

exports.toggleModule = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const code = req.params.code;
        const enabled = parseBoolean(req.body.enabled);

        const [modules] = await pool.query('SELECT id, code FROM modules WHERE code = ?', [code]);
        if (modules.length === 0) {
            return res.status(404).json({ success: false, message: 'Module not found.' });
        }

        if (req.body.scope === 'platform') {
            if (!ctx.isSuperAdmin) {
                return res.status(403).json({ success: false, message: 'Only a super administrator can disable a module platform-wide.' });
            }
            await pool.query('UPDATE modules SET is_enabled = ? WHERE code = ?', [enabled ? 1 : 0, code]);
        } else {
            if (!ctx.schoolId) {
                return res.status(400).json({ success: false, message: 'Select a school first.' });
            }
            await pool.query(
                `INSERT INTO school_modules (school_id, module_code, is_enabled)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
                [ctx.schoolId, code, enabled ? 1 : 0]
            );
        }

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId,
            action: 'module.toggle', module: 'modules', entity: 'module', entityId: code,
            details: { enabled, scope: req.body.scope === 'platform' ? 'platform' : 'school' }, req
        });

        res.json({ success: true, message: `Module ${enabled ? 'enabled' : 'disabled'}.` });
    } catch (error) {
        next(error);
    }
};
