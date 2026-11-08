const { pool } = require('../config/database');
const {
    writeAuditLog,
    getPagination,
    toCsv
} = require('../services/platformService');
const { RESOURCES } = require('../services/platformResources');

const sumStatus = (rows, status) => {
    const row = rows.find((r) => r.status === status);
    return row ? Number(row.count) : 0;
};

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

const placeholders = (list) => list.map(() => '?').join(',');

const notEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const literal = (ctx) => (ctx.schoolId ? 'AND school_id = ?' : '');
const literalParams = (ctx) => (ctx.schoolId ? [ctx.schoolId] : []);

const slugify = (value = '') => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'resource';

const normalizePublicLibraryItem = (row = {}) => ({
    id: row.id,
    title: row.title || 'Untitled resource',
    slug: `${slugify(row.title || 'resource')}-${row.id}`,
    author: row.author || '21CTA Library',
    category: row.category || 'General',
    subject: row.category || 'General',
    resource_type: row.resource_type || 'book',
    description: row.description || 'Educational resource for the classroom and learner community.',
    file_url: row.file_url || '',
    cover_url: row.cover_url || 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80',
    file_format: row.file_format || (row.file_url ? String(row.file_url).split('?')[0].split('.').pop().toUpperCase() : 'PDF'),
    file_size: row.file_size || null,
    education_level: row.education_level || 'General',
    language: row.language || 'en',
    status: row.status || 'active',
    created_at: row.created_at || new Date().toISOString(),
    isbn: row.isbn || null
});

/* ==========================================================================
 * Public homepage and registration
 * ========================================================================== */

exports.publicHome = async (req, res, next) => {
    try {
        const [[schools], [students], [teachers], [users], [modules], [announcements], [settings], [districts]] = await Promise.all([
            pool.query("SELECT COUNT(*) AS count FROM schools WHERE status = 'active'"),
            pool.query("SELECT COUNT(*) AS count FROM student_profiles WHERE status = 'active'"),
            pool.query("SELECT COUNT(*) AS count FROM teacher_profiles WHERE status = 'active'"),
            pool.query('SELECT COUNT(*) AS count FROM users'),
            pool.query('SELECT code, name, description, icon, audience, route FROM modules WHERE is_enabled = 1 ORDER BY sort_order'),
            pool.query(`SELECT id, title, body, priority, published_at FROM announcements
                        WHERE school_id IS NULL AND (expires_at IS NULL OR expires_at > NOW())
                        ORDER BY published_at DESC LIMIT 3`),
            pool.query("SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('platform_name','tagline','support_email','support_phone','default_language','enabled_languages')"),
            pool.query("SELECT COUNT(DISTINCT district) AS count FROM schools WHERE status = 'active' AND district IS NOT NULL")
        ]);

        const settingMap = {};
        settings.forEach((s) => { settingMap[s.setting_key] = s.setting_value; });

        res.json({
            success: true,
            data: {
                stats: {
                    schools: schools[0].count,
                    students: students[0].count,
                    teachers: teachers[0].count,
                    users: users[0].count,
                    districts: districts[0].count
                },
                modules,
                announcements,
                settings: settingMap
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.publicSchools = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));
        const offset = (page - 1) * limit;
        const search = String(req.query.q || '').trim();
        const district = String(req.query.district || '').trim();
        const sector = String(req.query.sector || '').trim();
        const province = String(req.query.province || '').trim();
        const category = String(req.query.category || '').trim();
        const educationLevel = String(req.query.education_level || '').trim();

        const filters = ["s.status = 'active'", "p.portal_status = 'approved'", 'p.is_public = 1'];
        const params = [];
        if (search) {
            filters.push('(s.name LIKE ? OR s.district LIKE ? OR s.sector LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (district) {
            filters.push('s.district LIKE ?');
            params.push(`%${district}%`);
        }
        if (sector) {
            filters.push('s.sector LIKE ?');
            params.push(`%${sector}%`);
        }
        if (province) {
            filters.push('s.province = ?');
            params.push(province);
        }
        if (category) {
            filters.push('s.school_type = ?');
            params.push(category);
        }
        if (educationLevel) {
            filters.push('JSON_CONTAINS(p.education_levels, JSON_QUOTE(?))');
            params.push(educationLevel);
        }
        const where = filters.join(' AND ');

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM schools s
             JOIN school_public_profiles p ON p.school_id = s.id
             WHERE ${where}`,
            params
        );
        const [rows] = await pool.query(
            `SELECT s.id, s.name, s.code, s.school_type, s.ownership, s.district, s.province,
                    s.sector, s.website, s.logo_url, s.motto, p.slug, p.short_description,
                    p.school_photo_url, p.hero_image_url, p.brand_primary, p.brand_accent,
                    p.portal_sections, p.education_levels, p.is_featured, s.created_at
             FROM schools s
             JOIN school_public_profiles p ON p.school_id = s.id
             WHERE ${where}
             ORDER BY p.is_featured DESC, s.name ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [featured] = await pool.query(
            `SELECT s.id, s.name, s.school_type, s.district, s.province, s.sector, s.website,
                    s.logo_url, s.motto, p.slug, p.short_description, p.school_photo_url, p.hero_image_url,
                    p.brand_primary, p.brand_accent, p.portal_sections, p.education_levels, p.is_featured, s.created_at
             FROM schools s
             JOIN school_public_profiles p ON p.school_id = s.id
             WHERE ${where} AND p.is_featured = 1
             ORDER BY s.name ASC LIMIT 6`,
            params
        );
        const [recentlyAdded] = await pool.query(
            `SELECT s.id, s.name, s.school_type, s.district, s.province, s.sector, s.website,
                    s.logo_url, s.motto, p.slug, p.short_description, p.school_photo_url, p.hero_image_url,
                    p.brand_primary, p.brand_accent, p.portal_sections, p.education_levels, p.is_featured, s.created_at
             FROM schools s
             JOIN school_public_profiles p ON p.school_id = s.id
             WHERE ${where}
             ORDER BY s.created_at DESC LIMIT 6`,
            params
        );
        const [filtersRows] = await pool.query(
            `SELECT DISTINCT s.province, s.school_type, level.value AS education_level
             FROM schools s
             JOIN school_public_profiles p ON p.school_id = s.id
             LEFT JOIN JSON_TABLE(COALESCE(p.education_levels, JSON_ARRAY()), '$[*]' COLUMNS (value VARCHAR(100) PATH '$')) AS level ON TRUE
             WHERE s.status = 'active' AND p.portal_status = 'approved' AND p.is_public = 1`
        );
        const total = Number(countRows[0]?.total || 0);
        res.json({
            success: true,
            data: rows,
            featured,
            recentlyAdded,
            filters: {
                provinces: [...new Set(filtersRows.map((row) => row.province).filter(Boolean))].sort(),
                categories: [...new Set(filtersRows.map((row) => row.school_type).filter(Boolean))].sort(),
                education_levels: [...new Set(filtersRows.map((row) => row.education_level).filter(Boolean))].sort()
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

exports.publicSchoolPortal = async (req, res, next) => {
    try {
        const slug = String(req.params.slug || '').trim();
        const [schoolRows] = await pool.query(
            `SELECT s.id, s.name, s.code, s.school_type, s.ownership, s.district, s.province,
                    s.sector, s.cell, s.address, s.phone, s.email, s.website, s.logo_url, s.motto,
                    p.slug, p.short_description, p.school_photo_url, p.hero_image_url,
                    p.brand_primary, p.brand_accent, p.portal_sections, p.welcome_message, p.history,
                    p.vision, p.mission, p.core_values, p.headteacher_name, p.headteacher_message,
                    p.education_levels, p.facilities, p.admissions_info, p.office_hours, p.map_url,
                    p.social_links, p.seo_title, p.seo_description
             FROM schools s
             JOIN school_public_profiles p ON p.school_id = s.id
             WHERE p.slug = ? AND p.portal_status = 'approved' AND p.is_public = 1
                   AND s.status = 'active'
             LIMIT 1`,
            [slug]
        );
        if (schoolRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Public school portal not found.' });
        }

        const school = schoolRows[0];
        const [announcements] = await pool.query(
            `SELECT id, title, body, category, priority, cover_image_url, attachment_url,
                    published_at, expires_at, is_featured
             FROM announcements
             WHERE school_id = ? AND is_public = 1 AND audience = 'all'
                   AND published_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY is_featured DESC, published_at DESC LIMIT 12`,
            [school.id]
        );
        const [resources] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at
             FROM library_resources
             WHERE school_id = ? AND status = 'active' AND is_published = 1 AND visibility = 'public'
             ORDER BY created_at DESC LIMIT 8`,
            [school.id]
        );

        res.json({ success: true, data: { school, announcements, resources } });
    } catch (error) {
        next(error);
    }
};

exports.schoolPortalProfile = async (req, res, next) => {
    try {
        const schoolId = req.platform.schoolId;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'Select a school before managing its public portal.' });
        }
        const [rows] = await pool.query(
            `SELECT p.*, s.name AS school_name, s.logo_url, s.website, s.district, s.province, s.sector, s.school_type
             FROM schools s
             LEFT JOIN school_public_profiles p ON p.school_id = s.id
             WHERE s.id = ? LIMIT 1`,
            [schoolId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'School not found.' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
};

exports.updateSchoolPortalProfile = async (req, res, next) => {
    try {
        const schoolId = req.platform.schoolId;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'Select a school before managing its public portal.' });
        }
        const [schools] = await pool.query('SELECT id, name FROM schools WHERE id = ? LIMIT 1', [schoolId]);
        if (!schools.length) return res.status(404).json({ success: false, message: 'School not found.' });

        const fields = {
            slug: 'slug', short_description: 'short_description', school_photo_url: 'school_photo_url',
            hero_image_url: 'hero_image_url', brand_primary: 'brand_primary', brand_accent: 'brand_accent',
            welcome_message: 'welcome_message', history: 'history', vision: 'vision', mission: 'mission',
            core_values: 'core_values', headteacher_name: 'headteacher_name', headteacher_message: 'headteacher_message',
            education_levels: 'education_levels', facilities: 'facilities', admissions_info: 'admissions_info',
            office_hours: 'office_hours', map_url: 'map_url', social_links: 'social_links',
            portal_sections: 'portal_sections', seo_title: 'seo_title', seo_description: 'seo_description'
        };
        const jsonFields = new Set(['education_levels', 'facilities', 'social_links', 'portal_sections']);
        const values = {};
        Object.entries(fields).forEach(([input, column]) => {
            if (req.body[input] !== undefined) {
                const value = req.body[input];
                values[column] = jsonFields.has(input) && value !== null ? JSON.stringify(value) : value;
            }
        });

        const slug = String(values.slug || slugify(schools[0].name)).trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            return res.status(400).json({ success: false, message: 'Portal URL must contain lowercase letters, numbers and hyphens only.' });
        }
        values.slug = slug;

        const [conflicts] = await pool.query(
            'SELECT school_id FROM school_public_profiles WHERE slug = ? AND school_id <> ? LIMIT 1',
            [slug, schoolId]
        );
        if (conflicts.length) return res.status(409).json({ success: false, message: 'That public portal URL is already in use.' });

        const columns = Object.keys(values);
        const updates = columns.filter((column) => column !== 'slug').map((column) => `\`${column}\` = VALUES(\`${column}\`)`);
        const sql = `INSERT INTO school_public_profiles (school_id, ${columns.map((column) => `\`${column}\``).join(', ')})
                     VALUES (?, ${columns.map(() => '?').join(', ')})
                     ON DUPLICATE KEY UPDATE ${updates.length ? `${updates.join(', ')},` : ''} slug = VALUES(slug)`;
        await pool.query(sql, [schoolId, ...columns.map((column) => values[column])]);
        await writeAuditLog({
            action: 'school.portal.profile.update', module: 'school', entity: 'school_public_profile',
            entityId: schoolId, details: { fields: columns }, req
        });

        const [profileRows] = await pool.query(
            'SELECT slug, portal_status, is_public FROM school_public_profiles WHERE school_id = ? LIMIT 1',
            [schoolId]
        );
        res.json({ success: true, message: 'Public portal profile saved. Portal publication still requires super-admin approval.', data: profileRows[0] });
    } catch (error) {
        next(error);
    }
};

exports.reviewSchoolPortal = async (req, res, next) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const action = String(req.body.action || '').trim();
        const state = { approve: 'approved', reject: 'rejected', suspend: 'suspended' }[action];
        if (!Number.isInteger(schoolId) || schoolId < 1 || !state) {
            return res.status(400).json({ success: false, message: 'Choose a valid school and review action.' });
        }
        const [result] = await pool.query(
            `UPDATE school_public_profiles
             SET portal_status = ?, is_public = ?, approved_by = ?, approved_at = ${action === 'approve' ? 'NOW()' : 'NULL'}
             WHERE school_id = ?`,
            [state, action === 'approve' ? 1 : 0, action === 'approve' ? req.platform.user.id : null, schoolId]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'School portal profile not found.' });
        await writeAuditLog({
            action: `school.portal.${action}`, module: 'school', entity: 'school_public_profile',
            entityId: schoolId, details: { portal_status: state }, req
        });
        res.json({ success: true, message: `School portal ${state}.`, data: { school_id: schoolId, portal_status: state, is_public: action === 'approve' } });
    } catch (error) {
        next(error);
    }
};

exports.publicLibraryHome = async (req, res, next) => {
    try {
        const [stats] = await pool.query(
            `SELECT COUNT(*) AS total_resources,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS recent_additions
             FROM library_resources WHERE status = 'active' AND is_published = 1 AND visibility = 'public'`
        );

        const [featured] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at, status
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
             ORDER BY created_at DESC LIMIT 6`
        );

        const [recent] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at, status
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
             ORDER BY created_at DESC LIMIT 6`
        );

        const [popular] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at, status
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
             ORDER BY id DESC LIMIT 6`
        );

        const [categories] = await pool.query(
            `SELECT category, COUNT(*) AS count
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
                 AND category IS NOT NULL AND category <> ''
             GROUP BY category
             ORDER BY count DESC, category LIMIT 12`
        );

        const [subjects] = await pool.query(
            `SELECT category AS subject, COUNT(*) AS count
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
                 AND category IS NOT NULL AND category <> ''
             GROUP BY category
             ORDER BY count DESC, category LIMIT 12`
        );

        res.json({
            success: true,
            data: {
                stats: {
                    totalResources: Number(stats[0]?.total_resources || 0),
                    recentAdditions: Number(stats[0]?.recent_additions || 0),
                    categoriesCount: categories.length
                },
                featured: featured.map(normalizePublicLibraryItem),
                recent: recent.map(normalizePublicLibraryItem),
                popular: popular.map(normalizePublicLibraryItem),
                categories: categories.map((row) => ({ category: row.category, count: Number(row.count) })),
                subjects: subjects.map((row) => ({ subject: row.subject, count: Number(row.count) }))
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.publicLibraryCategories = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT category
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
                 AND category IS NOT NULL AND category <> ''
             ORDER BY category`
        );
        res.json({ success: true, data: rows.map((row) => ({ category: row.category })) });
    } catch (error) {
        next(error);
    }
};

exports.publicLibraryResources = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(60, Math.max(1, Number(req.query.limit || 20)));
        const offset = (page - 1) * limit;
        const search = String(req.query.q || '').trim();
        const category = String(req.query.category || '').trim();
        const resourceType = String(req.query.resource_type || '').trim();

        const params = [];
        const whereClauses = ['status = ?', 'is_published = 1', 'visibility = ?'];
        params.push('active', 'public');

        if (search) {
            whereClauses.push('(title LIKE ? OR author LIKE ? OR description LIKE ? OR category LIKE ? OR resource_type LIKE ?)');
            const phrase = `%${search}%`;
            params.push(phrase, phrase, phrase, phrase, phrase);
        }

        if (category) {
            whereClauses.push('category = ?');
            params.push(category);
        }

        if (resourceType) {
            whereClauses.push('resource_type = ?');
            params.push(resourceType);
        }

        const whereSql = whereClauses.join(' AND ');

        const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM library_resources WHERE ${whereSql}`, params);
        const [rows] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at, status, file_size, education_level, language
             FROM library_resources
             WHERE ${whereSql}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: rows.map(normalizePublicLibraryItem),
            pagination: {
                page,
                limit,
                total: Number(countRows[0]?.total || 0),
                pages: Math.max(1, Math.ceil((Number(countRows[0]?.total || 0)) / limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.publicLibraryResource = async (req, res, next) => {
    try {
        const rawId = String(req.params.id || '').trim();
        const id = Number(rawId.match(/(\d+)$/)?.[1] || rawId);

        if (!Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: 'Resource identifier is invalid.' });
        }

        const [rows] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at, status, file_size, education_level, language, isbn
             FROM library_resources
             WHERE id = ? AND status = 'active' AND is_published = 1 AND visibility = 'public' LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        const resource = normalizePublicLibraryItem(rows[0]);
        const [relatedRows] = await pool.query(
            `SELECT id, title, author, category, resource_type, description, file_url, cover_url, created_at, status
             FROM library_resources
             WHERE status = 'active' AND is_published = 1 AND visibility = 'public'
                 AND id <> ? AND category = ?
             ORDER BY created_at DESC LIMIT 4`,
            [id, resource.category]
        );

        res.json({
            success: true,
            data: {
                ...resource,
                related: relatedRows.map(normalizePublicLibraryItem)
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.registerSchool = async (req, res, next) => {
    try {
        const {
            school_name, school_type, ownership, district, province, sector, cell,
            contact_name, email, phone, message
        } = req.body;

        if (!notEmpty(school_name) || !notEmpty(contact_name) || !validEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'School name, contact name and a valid email address are required.'
            });
        }

        const [existingSchool] = await pool.query('SELECT id FROM schools WHERE name = ? LIMIT 1', [school_name.trim()]);
        if (existingSchool.length > 0) {
            return res.status(409).json({ success: false, message: 'A school with this name is already registered.' });
        }

        const [existingRequest] = await pool.query(
            "SELECT id FROM registration_requests WHERE request_type='school' AND status='pending' AND (school_name = ? OR email = ?) LIMIT 1",
            [school_name.trim(), email.trim()]
        );
        if (existingRequest.length > 0) {
            return res.status(409).json({ success: false, message: 'A pending registration already exists for this school or email.' });
        }

        const [result] = await pool.query(
            `INSERT INTO registration_requests
             (request_type, school_name, district, province, contact_name, email, phone, message, status)
             VALUES ('school', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                school_name.trim(), district || null, province || null, contact_name.trim(),
                email.trim().toLowerCase(), phone || null,
                [school_type, ownership, sector, cell, message].filter(Boolean).join(' | ') || null
            ]
        );

        await writeAuditLog({
            action: 'registration.school.request', module: 'registrations', entity: 'registration_request',
            entityId: result.insertId, details: { school_name, email }, req
        });

        res.status(201).json({
            success: true,
            message: 'School registration submitted. A platform administrator will review it before activation.',
            data: { id: result.insertId, status: 'pending' }
        });
    } catch (error) {
        next(error);
    }
};

exports.registerUser = async (req, res, next) => {
    try {
        const { full_name, email, phone, school_id, role_code, message } = req.body;
        const publicRoles = ['teacher', 'student', 'parent', 'librarian', 'secretary', 'accountant',
            'ict_admin', 'exam_officer', 'hod', 'cpd_coordinator', 'staff'];

        if (!notEmpty(full_name) || !validEmail(email) || !school_id || !role_code) {
            return res.status(400).json({ success: false, message: 'Full name, valid email, school and role are required.' });
        }
        if (!publicRoles.includes(role_code)) {
            return res.status(400).json({ success: false, message: 'That role cannot be requested through public registration.' });
        }

        const [schools] = await pool.query("SELECT id, name FROM schools WHERE id = ? AND status = 'active'", [school_id]);
        if (schools.length === 0) {
            return res.status(400).json({ success: false, message: 'Select an active school.' });
        }

        const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }
        const [existingRequest] = await pool.query(
            "SELECT id FROM registration_requests WHERE request_type='user' AND status='pending' AND email = ? LIMIT 1",
            [email.trim().toLowerCase()]
        );
        if (existingRequest.length > 0) {
            return res.status(409).json({ success: false, message: 'A pending registration already exists for this email.' });
        }

        const [result] = await pool.query(
            `INSERT INTO registration_requests
             (request_type, school_id, school_name, contact_name, email, phone, role_code, message, status)
             VALUES ('user', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [schools[0].id, schools[0].name, full_name.trim(), email.trim().toLowerCase(),
                phone || null, role_code, message || null]
        );

        await writeAuditLog({
            action: 'registration.user.request', module: 'registrations', entity: 'registration_request',
            entityId: result.insertId, details: { email, role_code, school_id: schools[0].id }, req
        });

        res.status(201).json({
            success: true,
            message: 'Registration submitted. Your school administrator must approve your account before you can sign in.',
            data: { id: result.insertId, status: 'pending' }
        });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Current user / session
 * ========================================================================== */

exports.me = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const [[unread], [schoolRows]] = await Promise.all([
            pool.query('SELECT COUNT(*) AS count FROM platform_notifications WHERE user_id = ? AND is_read = 0', [ctx.user.id]),
            ctx.isSuperAdmin
                ? pool.query("SELECT id, name, code, district, province, logo_url, status, subscription_plan FROM schools WHERE status <> 'rejected' ORDER BY name")
                : Promise.resolve([ctx.activeMemberships.map((m) => ({
                    id: m.school_id, name: m.school_name, code: m.school_code, district: m.district,
                    province: m.province, logo_url: m.logo_url, status: m.school_status, subscription_plan: m.subscription_plan
                }))])
        ]);

        const currentSchool = ctx.schoolId
            ? schoolRows.find((s) => s.id === ctx.schoolId) || null
            : null;

        res.json({
            success: true,
            data: {
                user: ctx.user,
                is_super_admin: ctx.isSuperAdmin,
                primary_role: ctx.primaryRole,
                roles: [...ctx.roleCodes],
                permissions: [...ctx.permissions],
                school: currentSchool,
                schools: schoolRows,
                modules: ctx.modules,
                unread_notifications: unread[0].count,
                language: ctx.user.language || 'en',
                theme: ctx.user.theme || 'light'
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.updatePreferences = async (req, res, next) => {
    try {
        const { language, theme } = req.body;
        const allowedLanguages = ['en', 'fr', 'rw', 'sw'];
        const allowedThemes = ['light', 'dark'];
        const updates = [];
        const values = [];

        if (language !== undefined) {
            if (!allowedLanguages.includes(language)) {
                return res.status(400).json({ success: false, message: 'Unsupported language.' });
            }
            updates.push('language = ?');
            values.push(language);
        }
        if (theme !== undefined) {
            if (!allowedThemes.includes(theme)) {
                return res.status(400).json({ success: false, message: 'Unsupported theme.' });
            }
            updates.push('theme = ?');
            values.push(theme);
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No preferences supplied.' });
        }
        values.push(req.platform.user.id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, message: 'Preferences updated.', data: { language, theme } });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const { full_name, phone_number, profile_photo } = req.body;
        const updates = [];
        const values = [];
        if (full_name !== undefined) {
            if (!notEmpty(full_name)) return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
            updates.push('full_name = ?');
            values.push(full_name.trim());
        }
        if (phone_number !== undefined) {
            updates.push('phone_number = ?');
            values.push(phone_number ? String(phone_number).trim() : null);
        }
        if (profile_photo !== undefined) {
            updates.push('profile_photo = ?');
            values.push(profile_photo || null);
        }
        if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields supplied.' });
        values.push(req.platform.user.id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        await writeAuditLog({
            userId: req.platform.user.id, schoolId: req.platform.schoolId, action: 'profile.update',
            module: 'settings', entity: 'user', entityId: req.platform.user.id, details: req.body, req
        });
        res.json({ success: true, message: 'Profile updated.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'That phone number is already in use.' });
        }
        next(error);
    }
};

/* ==========================================================================
 * Role-aware overview
 * ========================================================================== */

const baseStats = async (ctx) => {
    const schoolClause = ctx.schoolId ? 'school_id = ?' : '1=1';
    const params = ctx.schoolId ? [ctx.schoolId] : [];

    const [
        [students], [teachers], [parents], [classes], [subjects], [members],
        [assessments], [resources], [attendanceToday], [pendingMarks], [announcements]
    ] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS count FROM student_profiles WHERE status = 'active' AND ${schoolClause}`, params),
        pool.query(`SELECT COUNT(*) AS count FROM teacher_profiles WHERE status = 'active' AND ${schoolClause}`, params),
        pool.query(`SELECT COUNT(*) AS count FROM parent_profiles WHERE ${ctx.schoolId ? 'school_id = ?' : '1=1'}`, params),
        pool.query(`SELECT COUNT(*) AS count FROM classes WHERE ${schoolClause}`, params),
        pool.query(`SELECT COUNT(*) AS count FROM subjects WHERE (${schoolClause} OR school_id IS NULL)`, params),
        pool.query(
            `SELECT COUNT(*) AS count FROM school_memberships m
             WHERE m.status='active' ${ctx.schoolId ? 'AND m.school_id = ?' : ''}`, params
        ),
        pool.query(`SELECT COUNT(*) AS count FROM assessments WHERE ${schoolClause}`, params),
        pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total_copies),0) AS copies FROM library_resources WHERE ${ctx.schoolId ? 'school_id = ?' : '1=1'}`, params),
        pool.query(
            `SELECT status, COUNT(*) AS count FROM student_attendance
             WHERE attendance_date = CURDATE() AND ${schoolClause} GROUP BY status`, params
        ),
        pool.query(`SELECT COUNT(*) AS count FROM marks WHERE status IN ('submitted','draft') AND ${schoolClause}`, params),
        pool.query(`SELECT COUNT(*) AS count FROM announcements WHERE (expires_at IS NULL OR expires_at > NOW()) AND ${ctx.schoolId ? '(school_id = ? OR school_id IS NULL)' : '1=1'}`, params)
    ]);

    const present = sumStatus(attendanceToday, 'present');
    const absent = sumStatus(attendanceToday, 'absent');
    const late = sumStatus(attendanceToday, 'late');
    const excused = sumStatus(attendanceToday, 'excused');
    const totalToday = present + absent + late + excused;

    return {
        students: students[0].count,
        teachers: teachers[0].count,
        parents: parents[0].count,
        classes: classes[0].count,
        subjects: subjects[0].count,
        users: members[0].count,
        assessments: assessments[0].count,
        library_resources: resources[0].count,
        library_copies: Number(resources[0].copies),
        pending_marks: pendingMarks[0].count,
        announcements: announcements[0].count,
        attendance_today: {
            present, absent, late, excused, total: totalToday,
            rate: pct(present + late, totalToday)
        }
    };
};

const chartData = async (ctx) => {
    const params = ctx.schoolId ? [ctx.schoolId] : [];
    const schoolClause = ctx.schoolId ? 'AND a.school_id = ?' : '';
    const attClause = ctx.schoolId ? 'AND school_id = ?' : '';
    const [enrollment, performance, attendanceTrend] = await Promise.all([
        pool.query(
            `SELECT c.id, c.name, COUNT(sp.id) AS count
             FROM classes c LEFT JOIN student_profiles sp ON sp.class_id = c.id AND sp.status='active'
             WHERE ${ctx.schoolId ? 'c.school_id = ?' : '1=1'}
             GROUP BY c.id, c.name ORDER BY c.name LIMIT 12`, params
        ),
        pool.query(
            `SELECT c.name, ROUND(AVG(mk.score / NULLIF(mk.max_score,0) * 100), 1) AS average
             FROM marks mk JOIN classes c ON c.id = mk.class_id
             WHERE mk.status = 'approved' ${ctx.schoolId ? 'AND mk.school_id = ?' : ''}
             GROUP BY c.id, c.name ORDER BY c.name LIMIT 12`, params
        ),
        pool.query(
            `SELECT attendance_date AS date,
                    SUM(status='present') AS present, SUM(status='absent') AS absent,
                    SUM(status='late') AS late, SUM(status='excused') AS excused
             FROM student_attendance
             WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${attClause}
             GROUP BY attendance_date ORDER BY attendance_date`, params
        )
    ]);

    return {
        enrollment: enrollment[0].map((r) => ({ label: r.name, value: Number(r.count) })),
        performance: performance[0].map((r) => ({ label: r.name, value: Number(r.average) })),
        attendance: attendanceTrend[0].map((r) => ({
            label: String(r.date).slice(0, 10),
            present: Number(r.present), absent: Number(r.absent),
            late: Number(r.late), excused: Number(r.excused)
        }))
    };
};

const recentActivity = async (ctx, limit = 10) => {
    const params = ctx.schoolId ? [ctx.schoolId, limit] : [limit];
    const [rows] = await pool.query(
        `SELECT al.id, al.action, al.module, al.entity, al.entity_id, al.created_at,
                u.full_name AS user_name
         FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
         WHERE ${ctx.schoolId ? 'al.school_id = ?' : '1=1'}
         ORDER BY al.created_at DESC LIMIT ?`, params
    );
    return rows;
};

const upcomingEvents = async (ctx) => {
    const params = [];
    let sql = `SELECT 'assessment' AS kind, a.id, a.title, a.assessment_date AS event_date, c.name AS context
               FROM assessments a JOIN classes c ON c.id = a.class_id
               WHERE a.assessment_date >= CURDATE()`;
    if (ctx.schoolId) { sql += ' AND a.school_id = ?'; params.push(ctx.schoolId); }
    sql += ` UNION ALL
             SELECT 'cpd' AS kind, cp.id, cp.title, cp.start_date AS event_date, cp.provider AS context
             FROM cpd_activities cp WHERE cp.start_date >= CURDATE()`;
    if (ctx.schoolId) { sql += ' AND (cp.school_id = ? OR cp.school_id IS NULL)'; params.push(ctx.schoolId); }
    sql += ' ORDER BY event_date ASC LIMIT 8';
    const [rows] = await pool.query(sql, params);
    return rows;
};

const teacherOverview = async (ctx, schoolId) => {
    const userId = ctx.user.id;
    const classParams = [userId, userId];
    const [classes] = await pool.query(
        `SELECT c.id, c.name, c.stream, c.level, c.class_size,
                (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = c.id AND sp.status='active') AS student_count
         FROM classes c
         WHERE c.school_id = ? AND (c.teacher_id = ? OR c.id IN (SELECT cs.class_id FROM class_subjects cs WHERE cs.teacher_id = ?))
         ORDER BY c.name`,
        [schoolId, userId, userId]
    );
    const classIds = classes.map((c) => c.id);
    const classList = classIds.length ? placeholders(classIds) : null;

    const [subjects] = await pool.query(
        `SELECT DISTINCT s.id, s.name, s.code
         FROM subjects s JOIN class_subjects cs ON cs.subject_id = s.id
         WHERE cs.school_id = ? AND (cs.teacher_id = ? OR cs.class_id IN (${classList || 'NULL'}))
         ORDER BY s.name`,
        classList ? [schoolId, userId, ...classIds] : [schoolId, userId]
    );

    const [todaySlots] = await pool.query(
        `SELECT tsl.*, c.name AS class_name, s.name AS subject_name
         FROM timetable_slots tsl JOIN classes c ON c.id = tsl.class_id JOIN subjects s ON s.id = tsl.subject_id
         WHERE tsl.school_id = ? AND tsl.day_of_week = DAYNAME(CURDATE())
           AND (tsl.teacher_id = ? ${classList ? `OR tsl.class_id IN (${classList})` : ''})
         ORDER BY tsl.start_time`,
        classList ? [schoolId, userId, ...classIds] : [schoolId, userId]
    );

    const [counts] = await pool.query(
        `SELECT
            (SELECT COUNT(*) FROM lesson_plans lp
             JOIN lessons l ON l.id=lp.lesson_id JOIN units un ON un.id=l.unit_id
             JOIN class_subjects cs ON cs.id=un.class_subject_id
             WHERE cs.school_id = ? AND (cs.teacher_id = ? OR cs.class_id IN (${classList || 'NULL'}))) AS lesson_plans,
            (SELECT COUNT(*) FROM class_diaries d WHERE d.school_id = ? AND d.teacher_id = ?) AS diary_entries,
            (SELECT COUNT(*) FROM assessments a WHERE a.school_id = ? AND a.teacher_id = ? AND a.status='draft') AS draft_assessments,
            (SELECT COUNT(*) FROM marks mk WHERE mk.school_id = ? AND mk.teacher_id = ? AND mk.status='draft') AS draft_marks,
            (SELECT COUNT(*) FROM cpd_enrollments ce WHERE ce.user_id = ?) AS cpd_enrollments`,
        [schoolId, userId, ...(classList ? classIds : []),
            schoolId, userId, schoolId, userId, schoolId, userId, userId]
    );

    const [recentMarks] = await pool.query(
        `SELECT mk.id, mk.score, mk.max_score, mk.status, mk.created_at,
                CONCAT(sp.first_name,' ',sp.last_name) AS student_name, s.name AS subject_name
         FROM marks mk JOIN student_profiles sp ON sp.id=mk.student_id JOIN subjects s ON s.id=mk.subject_id
         WHERE mk.school_id = ? AND (mk.teacher_id = ? OR mk.class_id IN (${classList || 'NULL'}))
         ORDER BY mk.created_at DESC LIMIT 6`,
        classList ? [schoolId, userId, ...classIds] : [schoolId, userId]
    );

    return {
        my_classes: classes,
        my_class_count: classes.length,
        my_student_count: classes.reduce((acc, c) => acc + Number(c.student_count || 0), 0),
        my_subjects: subjects,
        today_timetable: todaySlots,
        counts: counts[0],
        recent_marks: recentMarks,
        tasks: [
            { title: 'Marks awaiting submission', count: Number(counts[0].draft_marks || 0), link: '/app/marks', type: 'marks' },
            { title: 'Draft assessments', count: Number(counts[0].draft_assessments || 0), link: '/app/assessment', type: 'assessment' },
            { title: 'CPD activities', count: Number(counts[0].cpd_enrollments || 0), link: '/app/cpd', type: 'cpd' }
        ]
    };
};

const studentOverview = async (ctx, schoolId) => {
    const [students] = await pool.query(
        `SELECT sp.*, c.name AS class_name, c.stream, c.level
         FROM student_profiles sp LEFT JOIN classes c ON c.id = sp.class_id
         WHERE sp.user_id = ?`, [ctx.user.id]
    );
    if (students.length === 0) {
        return { student: null, tasks: [], attendance: null, performance: null, timetable: [], assessments: [], recent_marks: [], loans: [] };
    }
    const student = students[0];
    const [[attendance], [performance], [timetable], [assessments], [recentMarks], [loans]] = await Promise.all([
        pool.query(
            `SELECT COUNT(*) AS total, SUM(status='present') AS present, SUM(status='absent') AS absent,
                    SUM(status='late') AS late, SUM(status='excused') AS excused
             FROM student_attendance WHERE student_id = ?`, [student.id]
        ),
        pool.query(
            `SELECT COUNT(*) AS count, ROUND(AVG(score / NULLIF(max_score,0) * 100),1) AS average,
                    MAX(score / NULLIF(max_score,0) * 100) AS best
             FROM marks WHERE student_id = ? AND status='approved'`, [student.id]
        ),
        pool.query(
            `SELECT tsl.*, s.name AS subject_name, u.full_name AS teacher_name
             FROM timetable_slots tsl JOIN subjects s ON s.id=tsl.subject_id
             LEFT JOIN users u ON u.id=tsl.teacher_id
             WHERE tsl.class_id = ? AND tsl.day_of_week = DAYNAME(CURDATE())
             ORDER BY tsl.start_time`, [student.class_id]
        ),
        pool.query(
            `SELECT a.id, a.title, a.type, a.assessment_date, a.total_marks, s.name AS subject_name
             FROM assessments a JOIN subjects s ON s.id=a.subject_id
             WHERE a.class_id = ? AND a.status='published' AND a.assessment_date >= CURDATE()
             ORDER BY a.assessment_date LIMIT 6`, [student.class_id]
        ),
        pool.query(
            `SELECT mk.id, mk.score, mk.max_score, mk.grade, mk.approved_at,
                    s.name AS subject_name
             FROM marks mk JOIN subjects s ON s.id=mk.subject_id
             WHERE mk.student_id = ? AND mk.status='approved'
             ORDER BY mk.approved_at DESC LIMIT 6`, [student.id]
        ),
        pool.query(
            `SELECT ll.id, lr.title, ll.due_at, ll.status
             FROM library_loans ll JOIN library_resources lr ON lr.id=ll.resource_id
             WHERE ll.student_id = ? AND ll.status IN ('borrowed','overdue')`, [student.id]
        )
    ]);

    const att = attendance[0];
    const total = Number(att.total || 0);
    const present = Number(att.present || 0);
    return {
        student,
        attendance: {
            total, present, absent: Number(att.absent || 0), late: Number(att.late || 0),
            excused: Number(att.excused || 0), rate: pct(present + Number(att.late || 0), total)
        },
        performance: {
            assessments: Number(performance[0].count || 0),
            average: performance[0].average === null ? null : Number(performance[0].average),
            best: performance[0].best === null ? null : Math.round(Number(performance[0].best))
        },
        timetable, assessments, recent_marks: recentMarks, loans,
        tasks: assessments.length ? [{ title: 'Upcoming assessments', count: assessments.length, link: '/app/assessment', type: 'assessment' }] : []
    };
};

const parentOverview = async (ctx) => {
    const [children] = await pool.query(
        `SELECT sp.id, CONCAT(sp.first_name,' ',sp.last_name) AS full_name, sp.admission_number,
                c.name AS class_name,
                (SELECT COUNT(*) FROM student_attendance sa WHERE sa.student_id=sp.id) AS attendance_total,
                (SELECT SUM(sa.status IN ('present','late')) FROM student_attendance sa WHERE sa.student_id=sp.id) AS attendance_present,
                (SELECT ROUND(AVG(mk.score / NULLIF(mk.max_score,0) * 100),1) FROM marks mk WHERE mk.student_id=sp.id AND mk.status='approved') AS average
         FROM parent_profiles pp
         JOIN parent_student_links psl ON psl.parent_profile_id = pp.id AND psl.is_verified = 1
         JOIN student_profiles sp ON sp.id = psl.student_profile_id
         LEFT JOIN classes c ON c.id = sp.class_id
         WHERE pp.user_id = ?`, [ctx.user.id]
    );
    const formatted = children.map((c) => ({
        ...c,
        attendance_rate: pct(Number(c.attendance_present || 0), Number(c.attendance_total || 0)),
        average: c.average === null ? null : Number(c.average)
    }));

    const [announcements] = await pool.query(
        `SELECT id, title, body, priority, published_at FROM announcements
         WHERE (school_id = ? OR school_id IS NULL) AND audience IN ('all','parents')
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY published_at DESC LIMIT 5`, [ctx.schoolId]
    );

    return {
        children: formatted,
        child_count: formatted.length,
        announcements,
        tasks: formatted.map((c) => ({
            title: `${c.full_name} attendance`, count: c.attendance_rate,
            link: '/app/attendance', type: 'attendance', unit: '%'
        }))
    };
};

const librarianOverview = async (ctx, schoolId) => {
    const params = [schoolId];
    const [[resources], [loans], [categories], [recentLoans]] = await Promise.all([
        pool.query(
            `SELECT COUNT(*) AS titles, COALESCE(SUM(total_copies),0) AS copies,
                    COALESCE(SUM(available_copies),0) AS available
             FROM library_resources WHERE school_id = ? AND status='active'`, params
        ),
        pool.query(
            `SELECT status, COUNT(*) AS count FROM library_loans WHERE school_id = ? GROUP BY status`, params
        ),
        pool.query(
            `SELECT category, COUNT(*) AS count FROM library_resources
             WHERE school_id = ? AND status='active' GROUP BY category ORDER BY count DESC`, params
        ),
        pool.query(
            `SELECT ll.id, lr.title, ll.borrowed_at, ll.due_at, ll.returned_at, ll.status,
                    u.full_name AS borrower_name
             FROM library_loans ll JOIN library_resources lr ON lr.id=ll.resource_id
             JOIN users u ON u.id=ll.borrower_user_id
             WHERE ll.school_id = ? ORDER BY ll.borrowed_at DESC LIMIT 8`, params
        )
    ]);

    return {
        resources: Number(resources[0].titles),
        copies: Number(resources[0].copies),
        available: Number(resources[0].available),
        borrowed: sumStatus(loans, 'borrowed'),
        overdue: sumStatus(loans, 'overdue'),
        returned: sumStatus(loans, 'returned'),
        categories,
        recent_loans: recentLoans,
        tasks: [
            { title: 'Overdue loans', count: sumStatus(loans, 'overdue'), link: '/app/library', type: 'library' },
            { title: 'Active loans', count: sumStatus(loans, 'borrowed'), link: '/app/library', type: 'library' }
        ]
    };
};

const superAdminOverview = async (ctx) => {
    const [[schools], [schoolStatus], [usersByRole], [districts], [provinces], [pendingRegs], [moduleUsage], [auditRecent], [health]] = await Promise.all([
        pool.query('SELECT COUNT(*) AS count FROM schools'),
        pool.query('SELECT status, COUNT(*) AS count FROM schools GROUP BY status'),
        pool.query(
            `SELECT r.code, r.name, COUNT(DISTINCT m.user_id) AS count
             FROM roles r LEFT JOIN school_memberships m ON m.role_id=r.id AND m.status='active'
             GROUP BY r.id, r.code, r.name ORDER BY count DESC`
        ),
        pool.query("SELECT district AS label, COUNT(*) AS value FROM schools WHERE status='active' AND district IS NOT NULL GROUP BY district ORDER BY value DESC"),
        pool.query("SELECT province AS label, COUNT(*) AS value FROM schools WHERE status='active' AND province IS NOT NULL GROUP BY province ORDER BY value DESC"),
        pool.query("SELECT COUNT(*) AS count FROM registration_requests WHERE status='pending'"),
        pool.query(
            `SELECT module AS label, COUNT(*) AS value FROM audit_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND module IS NOT NULL
             GROUP BY module ORDER BY value DESC LIMIT 10`
        ),
        pool.query(
            `SELECT al.id, al.action, al.module, al.created_at, u.full_name AS user_name, s.name AS school_name
             FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id LEFT JOIN schools s ON s.id=al.school_id
             ORDER BY al.created_at DESC LIMIT 10`
        ),
        pool.query("SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()) AS tables, NOW() AS checked_at")
    ]);

    const statusMap = {};
    schoolStatus.forEach((r) => { statusMap[r.status] = Number(r.count); });

    return {
        schools: Number(schools[0].count),
        schools_active: statusMap.active || 0,
        schools_pending: statusMap.pending || 0,
        schools_suspended: statusMap.suspended || 0,
        schools_by_district: districts,
        schools_by_province: provinces,
        users_by_role: usersByRole.map((r) => ({ label: r.name, value: Number(r.count), code: r.code })),
        pending_registrations: Number(pendingRegs[0].count),
        module_usage: moduleUsage.map((r) => ({ label: r.label, value: Number(r.value) })),
        recent_activity: auditRecent,
        system_health: {
            database: 'connected',
            tables: Number(health[0].tables),
            checked_at: health[0].checked_at,
            api: 'operational'
        },
        tasks: pendingRegs[0].count ? [{ title: 'Pending registrations', count: Number(pendingRegs[0].count), link: '/app/registrations', type: 'registrations' }] : []
    };
};

exports.overview = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const stats = await baseStats(ctx);
        const charts = await chartData(ctx);
        const recent = await recentActivity(ctx, 10);
        const upcoming = await upcomingEvents(ctx);
        const role = ctx.primaryRole;

        const payload = {
            role,
            is_super_admin: ctx.isSuperAdmin,
            school: ctx.schoolId ? ctx.activeMemberships.find((m) => m.school_id === ctx.schoolId) || null : null,
            stats,
            charts,
            recent_activity: recent,
            upcoming,
            tasks: []
        };

        if (ctx.isSuperAdmin && !ctx.schoolId) {
            Object.assign(payload, await superAdminOverview(ctx));
        } else if (role === 'teacher' || (role === 'hod' && ctx.isTeacher)) {
            Object.assign(payload, await teacherOverview(ctx, ctx.schoolId));
        } else if (role === 'student') {
            Object.assign(payload, await studentOverview(ctx, ctx.schoolId));
        } else if (role === 'parent') {
            Object.assign(payload, await parentOverview(ctx));
        } else if (role === 'librarian') {
            Object.assign(payload, await librarianOverview(ctx, ctx.schoolId));
        } else {
            // School administrator, headteacher, DOS, exam officer, secretary, etc.
            const [pendingByClass] = await pool.query(
                `SELECT c.name AS label, ROUND(AVG(mk.score / NULLIF(mk.max_score,0) * 100),1) AS value
                 FROM marks mk JOIN classes c ON c.id=mk.class_id
                 WHERE mk.school_id = ? AND mk.status='approved'
                 GROUP BY c.id, c.name ORDER BY value DESC LIMIT 10`, [ctx.schoolId]
            );
            const [staffActivity] = await pool.query(
                `SELECT u.full_name AS label,
                        (SELECT COUNT(*) FROM class_diaries d WHERE d.teacher_id=u.id) AS diary,
                        (SELECT COUNT(*) FROM lesson_plans lp JOIN lessons l ON l.id=lp.lesson_id
                         JOIN units un ON un.id=l.unit_id JOIN class_subjects cs ON cs.id=un.class_subject_id
                         WHERE cs.teacher_id=u.id) AS plans
                 FROM users u
                 JOIN school_memberships m ON m.user_id=u.id AND m.school_id=? AND m.status='active'
                 JOIN roles r ON r.id=m.role_id AND r.code IN ('teacher','hod')
                 ORDER BY plans DESC LIMIT 8`, [ctx.schoolId]
            );
            const [registrationCount] = await pool.query(
                "SELECT COUNT(*) AS count FROM registration_requests WHERE status='pending' AND (school_id = ? OR school_id IS NULL)",
                [ctx.schoolId]
            );
            payload.performance_by_class = pendingByClass.map((r) => ({ label: r.label, value: Number(r.value) }));
            payload.staff_activity = staffActivity.map((r) => ({
                label: r.label, diary: Number(r.diary), plans: Number(r.plans)
            }));
            payload.pending_registrations = Number(registrationCount[0].count);
            if (role === 'dos' || role === 'headteacher' || role === 'school_admin' || role === 'exam_officer') {
                payload.tasks = [
                    { title: 'Marks awaiting approval', count: stats.pending_marks, link: '/app/marks', type: 'marks' },
                    { title: 'Pending registrations', count: payload.pending_registrations, link: '/app/registrations', type: 'registrations' }
                ].filter((t) => t.count > 0);
            }
        }

        res.json({ success: true, data: payload });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Analytics
 * ========================================================================== */

exports.analytics = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const type = req.query.type || 'summary';
        const schoolClause = ctx.schoolId ? 'AND school_id = ?' : '';
        const params = ctx.schoolId ? [ctx.schoolId] : [];

        if (type === 'attendance') {
            const [byClass, byStatus, byDay] = await Promise.all([
                pool.query(
                    `SELECT c.name AS label, COUNT(*) AS total,
                            SUM(sa.status='present') AS present, SUM(sa.status='absent') AS absent,
                            SUM(sa.status='late') AS late
                     FROM student_attendance sa JOIN classes c ON c.id=sa.class_id
                     WHERE 1=1 ${ctx.schoolId ? 'AND sa.school_id = ?' : ''}
                     GROUP BY c.id, c.name ORDER BY c.name`, params
                ),
                pool.query(
                    `SELECT status AS label, COUNT(*) AS value FROM student_attendance
                     WHERE 1=1 ${schoolClause} GROUP BY status`, params
                ),
                pool.query(
                    `SELECT attendance_date AS label, SUM(status='present') AS present, SUM(status='absent') AS absent
                     FROM student_attendance WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY) ${schoolClause}
                     GROUP BY attendance_date ORDER BY attendance_date`, params
                )
            ]);
            return res.json({
                success: true,
                data: {
                    by_class: byClass[0].map((r) => ({
                        label: r.label, total: Number(r.total), present: Number(r.present),
                        absent: Number(r.absent), late: Number(r.late),
                        rate: pct(Number(r.present) + Number(r.late), Number(r.total))
                    })),
                    by_status: byStatus[0].map((r) => ({ label: r.label, value: Number(r.value) })),
                    by_day: byDay[0].map((r) => ({ label: String(r.label).slice(0, 10), present: Number(r.present), absent: Number(r.absent) }))
                }
            });
        }

        if (type === 'performance') {
            const [bySubject, byClass, distribution, topStudents] = await Promise.all([
                pool.query(
                    `SELECT s.name AS label, ROUND(AVG(mk.score / NULLIF(mk.max_score,0) * 100),1) AS average, COUNT(*) AS records
                     FROM marks mk JOIN subjects s ON s.id=mk.subject_id
                     WHERE mk.status='approved' ${ctx.schoolId ? 'AND mk.school_id = ?' : ''}
                     GROUP BY s.id, s.name ORDER BY average DESC`, params
                ),
                pool.query(
                    `SELECT c.name AS label, ROUND(AVG(mk.score / NULLIF(mk.max_score,0) * 100),1) AS average, COUNT(*) AS records
                     FROM marks mk JOIN classes c ON c.id=mk.class_id
                     WHERE mk.status='approved' ${ctx.schoolId ? 'AND mk.school_id = ?' : ''}
                     GROUP BY c.id, c.name ORDER BY average DESC`, params
                ),
                pool.query(
                    `SELECT CASE
                        WHEN mk.score / NULLIF(mk.max_score,0) >= 0.8 THEN 'A'
                        WHEN mk.score / NULLIF(mk.max_score,0) >= 0.7 THEN 'B'
                        WHEN mk.score / NULLIF(mk.max_score,0) >= 0.6 THEN 'C'
                        WHEN mk.score / NULLIF(mk.max_score,0) >= 0.5 THEN 'D'
                        ELSE 'E' END AS label, COUNT(*) AS value
                     FROM marks mk WHERE mk.status='approved' ${ctx.schoolId ? 'AND mk.school_id = ?' : ''}
                     GROUP BY label ORDER BY label`, params
                ),
                pool.query(
                    `SELECT CONCAT(sp.first_name,' ',sp.last_name) AS label, c.name AS class_name,
                            ROUND(AVG(mk.score / NULLIF(mk.max_score,0) * 100),1) AS average
                     FROM marks mk JOIN student_profiles sp ON sp.id=mk.student_id JOIN classes c ON c.id=mk.class_id
                     WHERE mk.status='approved' ${ctx.schoolId ? 'AND mk.school_id = ?' : ''}
                     GROUP BY sp.id, sp.first_name, sp.last_name, c.name
                     ORDER BY average DESC LIMIT 10`, params
                )
            ]);
            return res.json({
                success: true,
                data: {
                    by_subject: bySubject[0].map((r) => ({ label: r.label, value: Number(r.average), records: Number(r.records) })),
                    by_class: byClass[0].map((r) => ({ label: r.label, value: Number(r.average), records: Number(r.records) })),
                    grade_distribution: distribution[0].map((r) => ({ label: r.label, value: Number(r.value) })),
                    top_students: topStudents[0].map((r) => ({ label: r.label, class_name: r.class_name, value: Number(r.average) }))
                }
            });
        }

        if (type === 'enrollment') {
            const [byClass, byGender, byStatus] = await Promise.all([
                pool.query(
                    `SELECT c.name AS label, COUNT(sp.id) AS value FROM classes c
                     LEFT JOIN student_profiles sp ON sp.class_id=c.id AND sp.status='active'
                     WHERE 1=1 ${ctx.schoolId ? 'AND c.school_id = ?' : ''} GROUP BY c.id, c.name ORDER BY c.name`, params
                ),
                pool.query(
                    `SELECT gender AS label, COUNT(*) AS value FROM student_profiles
                     WHERE status='active' ${schoolClause} GROUP BY gender`, params
                ),
                pool.query(
                    `SELECT status AS label, COUNT(*) AS value FROM student_profiles
                     WHERE 1=1 ${schoolClause} GROUP BY status`, params
                )
            ]);
            return res.json({
                success: true,
                data: {
                    by_class: byClass[0].map((r) => ({ label: r.label, value: Number(r.value) })),
                    by_gender: byGender[0].map((r) => ({ label: r.label || 'unspecified', value: Number(r.value) })),
                    by_status: byStatus[0].map((r) => ({ label: r.label, value: Number(r.value) }))
                }
            });
        }

        if (type === 'library') {
            const [byCategory, byType, monthly] = await Promise.all([
                pool.query(
                    `SELECT category AS label, COUNT(*) AS value FROM library_resources
                     WHERE 1=1 ${schoolClause} GROUP BY category ORDER BY value DESC`, params
                ),
                pool.query(
                    `SELECT resource_type AS label, COUNT(*) AS value FROM library_resources
                     WHERE 1=1 ${schoolClause} GROUP BY resource_type`, params
                ),
                pool.query(
                    `SELECT DATE_FORMAT(borrowed_at, '%Y-%m') AS label, COUNT(*) AS value FROM library_loans
                     WHERE borrowed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) ${schoolClause}
                     GROUP BY label ORDER BY label`, params
                )
            ]);
            return res.json({
                success: true,
                data: {
                    by_category: byCategory[0].map((r) => ({ label: r.label || 'Uncategorised', value: Number(r.value) })),
                    by_type: byType[0].map((r) => ({ label: r.label, value: Number(r.value) })),
                    monthly_loans: monthly[0].map((r) => ({ label: r.label, value: Number(r.value) }))
                }
            });
        }

        // summary
        const stats = await baseStats(ctx);
        const charts = await chartData(ctx);
        res.json({ success: true, data: { stats, charts } });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Global search
 * ========================================================================== */

const SEARCH_CONFIG = {
    students: {
        permission: 'students.view', label: "CONCAT(sp.first_name,' ',sp.last_name)",
        subtitle: 'sp.admission_number', link: '/app/students'
    },
    teachers: {
        permission: 'teachers.view', label: 'u.full_name', subtitle: 'u.email', link: '/app/teachers'
    },
    classes: {
        permission: 'classes.view', label: 'c.name', subtitle: 'c.level', link: '/app/classes'
    },
    subjects: {
        permission: 'subjects.view', label: 's.name', subtitle: 's.code', link: '/app/subjects'
    },
    assessments: {
        permission: 'assessments.view', label: 'a.title', subtitle: 'a.type', link: '/app/assessment'
    },
    library: {
        permission: 'library.view', label: 'lr.title', subtitle: 'lr.author', link: '/app/library'
    },
    announcements: {
        permission: 'notifications.view', label: 'an.title', subtitle: 'an.priority', link: '/app/notifications'
    },
    'lesson-plans': {
        permission: 'lesson_plans.view', label: 'l.lesson_title', subtitle: 'c.name', link: '/app/lesson-planner'
    }
};

exports.search = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const q = String(req.query.q || '').trim();
        if (q.length < 2) {
            return res.status(400).json({ success: false, message: 'Enter at least two characters to search.' });
        }
        const like = `%${q}%`;
        const groups = [];

        for (const [name, config] of Object.entries(SEARCH_CONFIG)) {
            if (!ctx.isSuperAdmin && !ctx.hasPermission(config.permission)) continue;
            const resource = RESOURCES[name];
            if (!resource) continue;
            const scope = resource.scopes.read(ctx, null);
            const searchable = resource.search || [];
            if (searchable.length === 0) continue;
            const searchClause = searchable.map((col) => `${col} LIKE ?`).join(' OR ');
            const sql = `SELECT ${resource.idColumn} AS id, ${config.label} AS label, ${config.subtitle} AS subtitle
                         FROM ${resource.from} ${resource.joins}
                         WHERE (${scope.clause}) AND (${searchClause})
                         LIMIT 5`;
            const [rows] = await pool.query(sql, [...scope.params, ...searchable.map(() => like)]);
            if (rows.length > 0) {
                groups.push({ group: name, link: config.link, items: rows });
            }
        }

        res.json({ success: true, data: { query: q, groups } });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Notifications
 * ========================================================================== */

exports.listNotifications = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const { page, limit, offset } = getPagination(req.query, 20, 100);
        const [rows] = await pool.query(
            `SELECT id, title, message, type, link, is_read, created_at
             FROM platform_notifications WHERE user_id = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [ctx.user.id, limit, offset]
        );
        const [[count], [unread]] = await Promise.all([
            pool.query('SELECT COUNT(*) AS count FROM platform_notifications WHERE user_id = ?', [ctx.user.id]),
            pool.query('SELECT COUNT(*) AS count FROM platform_notifications WHERE user_id = ? AND is_read = 0', [ctx.user.id])
        ]);

        const announcementScope = RESOURCES.announcements.scopes.read(ctx, null);
        const [announcements] = await pool.query(
            `SELECT an.id, an.title, an.body, an.audience, an.priority, an.published_at, an.expires_at
             FROM ${RESOURCES.announcements.from} ${RESOURCES.announcements.joins}
             WHERE (${announcementScope.clause}) AND (an.expires_at IS NULL OR an.expires_at > NOW())
             ORDER BY an.published_at DESC LIMIT 10`,
            announcementScope.params
        );

        res.json({
            success: true,
            data: {
                notifications: rows,
                announcements,
                unread: unread[0].count,
                pagination: { page, limit, total: count[0].count, pages: Math.ceil(count[0].count / limit) }
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.markNotificationRead = async (req, res, next) => {
    try {
        const [result] = await pool.query(
            'UPDATE platform_notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [req.params.id, req.platform.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found.' });
        }
        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (error) {
        next(error);
    }
};

exports.markAllNotificationsRead = async (req, res, next) => {
    try {
        await pool.query('UPDATE platform_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.platform.user.id]);
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};

/* ==========================================================================
 * Reports (JSON + CSV export)
 * ========================================================================== */

const buildReport = async (ctx, type) => {
    const schoolClause = ctx.schoolId ? 'AND school_id = ?' : '';
    const params = ctx.schoolId ? [ctx.schoolId] : [];

    if (type === 'enrollment') {
        const [rows] = await pool.query(
            `SELECT sp.admission_number, sp.first_name, sp.last_name, sp.gender, sp.status,
                    c.name AS class_name, sp.guardian_name, sp.guardian_phone
             FROM student_profiles sp LEFT JOIN classes c ON c.id=sp.class_id
             WHERE 1=1 ${ctx.schoolId ? 'AND sp.school_id = ?' : ''}
             ORDER BY c.name, sp.last_name, sp.first_name`, params
        );
        return {
            title: 'Student enrolment report',
            headers: [
                { key: 'admission_number', label: 'Admission no.' },
                { key: 'first_name', label: 'First name' },
                { key: 'last_name', label: 'Last name' },
                { key: 'gender', label: 'Gender' },
                { key: 'class_name', label: 'Class' },
                { key: 'status', label: 'Status' },
                { key: 'guardian_name', label: 'Guardian' },
                { key: 'guardian_phone', label: 'Guardian phone' }
            ],
            rows
        };
    }

    if (type === 'attendance') {
        const [rows] = await pool.query(
            `SELECT sa.attendance_date, sp.admission_number,
                    CONCAT(sp.first_name,' ',sp.last_name) AS student_name,
                    c.name AS class_name, sa.status, sa.notes
             FROM student_attendance sa
             JOIN student_profiles sp ON sp.id=sa.student_id
             LEFT JOIN classes c ON c.id=sa.class_id
             WHERE 1=1 ${ctx.schoolId ? 'AND sa.school_id = ?' : ''}
             ORDER BY sa.attendance_date DESC, sp.last_name LIMIT 5000`, params
        );
        return {
            title: 'Student attendance report',
            headers: [
                { key: 'attendance_date', label: 'Date' },
                { key: 'admission_number', label: 'Admission no.' },
                { key: 'student_name', label: 'Student' },
                { key: 'class_name', label: 'Class' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Notes' }
            ],
            rows
        };
    }

    if (type === 'marks') {
        const [rows] = await pool.query(
            `SELECT sp.admission_number, CONCAT(sp.first_name,' ',sp.last_name) AS student_name,
                    c.name AS class_name, s.name AS subject_name, a.title AS assessment,
                    mk.score, mk.max_score, mk.grade, mk.status, mk.approved_at
             FROM marks mk
             JOIN student_profiles sp ON sp.id=mk.student_id
             JOIN classes c ON c.id=mk.class_id
             JOIN subjects s ON s.id=mk.subject_id
             LEFT JOIN assessments a ON a.id=mk.assessment_id
             WHERE 1=1 ${ctx.schoolId ? 'AND mk.school_id = ?' : ''}
             ORDER BY c.name, s.name, sp.last_name LIMIT 10000`, params
        );
        return {
            title: 'Marks report',
            headers: [
                { key: 'admission_number', label: 'Admission no.' },
                { key: 'student_name', label: 'Student' },
                { key: 'class_name', label: 'Class' },
                { key: 'subject_name', label: 'Subject' },
                { key: 'assessment', label: 'Assessment' },
                { key: 'score', label: 'Score' },
                { key: 'max_score', label: 'Max' },
                { key: 'grade', label: 'Grade' },
                { key: 'status', label: 'Status' }
            ],
            rows
        };
    }

    if (type === 'library') {
        const [rows] = await pool.query(
            `SELECT lr.title, lr.author, lr.category, lr.resource_type, lr.total_copies,
                    lr.available_copies, lr.status
             FROM library_resources lr
             WHERE 1=1 ${ctx.schoolId ? 'AND lr.school_id = ?' : ''}
             ORDER BY lr.title`, params
        );
        return {
            title: 'Library catalogue report',
            headers: [
                { key: 'title', label: 'Title' },
                { key: 'author', label: 'Author' },
                { key: 'category', label: 'Category' },
                { key: 'resource_type', label: 'Type' },
                { key: 'total_copies', label: 'Copies' },
                { key: 'available_copies', label: 'Available' },
                { key: 'status', label: 'Status' }
            ],
            rows
        };
    }

    if (type === 'cpd') {
        const [rows] = await pool.query(
            `SELECT u.full_name AS teacher_name, cp.title, cp.provider, cp.start_date, cp.end_date,
                    cp.hours, ce.status, ce.completed_at
             FROM cpd_enrollments ce
             JOIN cpd_activities cp ON cp.id=ce.cpd_activity_id
             JOIN users u ON u.id=ce.user_id
             WHERE 1=1 ${ctx.schoolId ? 'AND (cp.school_id = ? OR cp.school_id IS NULL)' : ''}
             ORDER BY cp.start_date DESC`, params
        );
        return {
            title: 'CPD participation report',
            headers: [
                { key: 'teacher_name', label: 'Staff member' },
                { key: 'title', label: 'Activity' },
                { key: 'provider', label: 'Provider' },
                { key: 'start_date', label: 'Start' },
                { key: 'end_date', label: 'End' },
                { key: 'hours', label: 'Hours' },
                { key: 'status', label: 'Status' }
            ],
            rows
        };
    }

    if (type === 'school-summary') {
        const [rows] = await pool.query(
            `SELECT s.name AS school_name, s.code, s.district, s.province, s.status,
                    (SELECT COUNT(*) FROM student_profiles sp WHERE sp.school_id=s.id AND sp.status='active') AS students,
                    (SELECT COUNT(*) FROM teacher_profiles tp WHERE tp.school_id=s.id AND tp.status='active') AS teachers,
                    (SELECT COUNT(*) FROM classes c WHERE c.school_id=s.id) AS classes,
                    (SELECT COUNT(*) FROM school_memberships m WHERE m.school_id=s.id AND m.status='active') AS users
             FROM schools s ${ctx.schoolId ? 'WHERE s.id = ?' : ''}
             ORDER BY s.name`, params
        );
        return {
            title: 'School summary report',
            headers: [
                { key: 'school_name', label: 'School' },
                { key: 'code', label: 'Code' },
                { key: 'district', label: 'District' },
                { key: 'province', label: 'Province' },
                { key: 'status', label: 'Status' },
                { key: 'students', label: 'Students' },
                { key: 'teachers', label: 'Teachers' },
                { key: 'classes', label: 'Classes' },
                { key: 'users', label: 'Users' }
            ],
            rows
        };
    }

    return null;
};

exports.report = async (req, res, next) => {
    try {
        const report = await buildReport(req.platform, req.params.type);
        if (!report) return res.status(400).json({ success: false, message: 'Unknown report type.' });
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

exports.exportReport = async (req, res, next) => {
    try {
        const report = await buildReport(req.platform, req.params.type);
        if (!report) return res.status(400).json({ success: false, message: 'Unknown report type.' });

        await writeAuditLog({
            userId: req.platform.user.id, schoolId: req.platform.schoolId, action: 'report.export',
            module: 'reports', entity: 'report', entityId: req.params.type,
            details: { type: req.params.type, rows: report.rows.length }, req
        });

        if (req.query.format === 'csv') {
            const csv = toCsv(report.headers, report.rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-${Date.now()}.csv"`);
            return res.send('\uFEFF' + csv);
        }

        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};
