const { pool } = require('../config/database');
const { RESOURCES } = require('../services/platformResources');
const { writeAuditLog, getPagination, notify, parseBoolean } = require('../services/platformService');

/**
 * Generic, permission-checked CRUD over the resources declared in
 * platformResources.js. All identifiers come from that registry; request
 * bodies only supply values for whitelisted columns.
 */

const WRITE_SCHOOL_OPTIONAL = new Set(['subjects', 'cpd', 'portfolio', 'announcements']);
const CLASS_SCOPED = new Set(['diary', 'attendance', 'marks', 'assessments']);
const OWNER_COLUMN = {
    diary: 'teacher_id',
    marks: 'teacher_id',
    assessments: 'teacher_id',
    attendance: 'recorded_by'
};

const teacherTeachesClass = async (ctx, classId) => {
    const [rows] = await pool.query(
        `SELECT c.id FROM classes c
         WHERE c.id = ? AND c.school_id = ?
           AND (c.teacher_id = ? OR c.id IN (
                SELECT cs.class_id FROM class_subjects cs WHERE cs.teacher_id = ?
           )) LIMIT 1`,
        [classId, ctx.schoolId, ctx.user.id, ctx.user.id]
    );
    return rows.length > 0;
};

const teacherOwnsRecord = async (ctx, resource, id) => {
    const column = OWNER_COLUMN[resource];
    if (!column) return true;
    const [rows] = await pool.query(
        `SELECT id FROM ${resource === 'attendance' ? 'student_attendance' : resource === 'diary' ? 'class_diaries' : resource === 'marks' ? 'marks' : 'assessments'}
         WHERE id = ? AND \`${column}\` = ? LIMIT 1`,
        [id, ctx.user.id]
    );
    return rows.length > 0;
};

const recordClassId = async (resource, id) => {
    const table = resource === 'diary' ? 'class_diaries' : resource === 'attendance' ? 'student_attendance' : resource === 'marks' ? 'marks' : 'assessments';
    const [rows] = await pool.query(`SELECT class_id FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return rows.length ? rows[0].class_id : null;
};
const VERIFY_PARENT = {
    'assessment-questions': { table: 'assessments', key: 'assessment_id', schoolColumn: 'school_id', allowGlobal: false },
    'assessment-submissions': { table: 'assessments', key: 'assessment_id', schoolColumn: 'school_id', allowGlobal: false },
    'cpd-enrollments': { table: 'cpd_activities', key: 'cpd_activity_id', schoolColumn: 'school_id', allowGlobal: true }
};

const pickFields = (def, body) => {
    const values = {};
    (def.fields || []).forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            values[field] = body[field] === '' ? null : body[field];
        }
    });
    return values;
};

const gradeFor = (score, maxScore) => {
    const max = Number(maxScore) || 100;
    const ratio = (Number(score) || 0) / max;
    if (ratio >= 0.8) return 'A';
    if (ratio >= 0.7) return 'B';
    if (ratio >= 0.6) return 'C';
    if (ratio >= 0.5) return 'D';
    return 'E';
};

const tableFor = (def) => def.from.trim().split(/\s+/)[0];

const writeSchoolId = (resource, def, ctx, body) => {
    if (ctx.schoolId) return ctx.schoolId;
    if (ctx.isSuperAdmin) {
        if (WRITE_SCHOOL_OPTIONAL.has(resource)) {
            return body.school_id === undefined || body.school_id === null || body.school_id === ''
                ? null : Number(body.school_id);
        }
        const requested = Number(body.school_id);
        return Number.isFinite(requested) ? requested : null;
    }
    return ctx.defaultSchoolId;
};

const recordInScope = async (def, ctx, id, requestedSchool) => {
    const scope = def.scopes.read(ctx, requestedSchool);
    const [rows] = await pool.query(
        `SELECT ${def.idColumn} AS id FROM ${def.from} ${def.joins}
         WHERE ${def.idColumn} = ? AND (${scope.clause}) LIMIT 1`,
        [id, ...scope.params]
    );
    return rows.length > 0;
};

const verifyParent = async (resource, ctx, body) => {
    const rule = VERIFY_PARENT[resource];
    if (!rule) return true;
    const value = body[rule.key];
    if (!value) return false;
    const [rows] = await pool.query(
        `SELECT id FROM ${rule.table} WHERE id = ? ${rule.allowGlobal ? '' : `AND ${rule.schoolColumn} = ?`}`,
        rule.allowGlobal ? [value] : [value, ctx.schoolId]
    );
    return rows.length > 0;
};

const fetchOne = async (def, ctx, id) => {
    const scope = def.scopes.read(ctx, null);
    const [rows] = await pool.query(
        `SELECT ${def.select} FROM ${def.from} ${def.joins}
         WHERE ${def.idColumn} = ? AND (${scope.clause}) LIMIT 1`,
        [id, ...scope.params]
    );
    return rows[0] || null;
};

/* ========================================================================== */

exports.list = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const resource = req.params.resource;
        const def = RESOURCES[resource];
        if (!def) return res.status(404).json({ success: false, message: 'Unknown resource.' });
        if (!ctx.isSuperAdmin && !ctx.hasPermission(def.viewPermission)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to view this resource.' });
        }

        const scope = def.scopes.read(ctx, req.query.school_id);
        const where = [`(${scope.clause})`];
        const params = [...scope.params];

        const q = String(req.query.q || '').trim();
        if (q) {
            const like = `%${q}%`;
            where.push(`(${def.search.map((col) => `${col} LIKE ?`).join(' OR ')})`);
            def.search.forEach(() => params.push(like));
        }

        Object.entries(def.filters || {}).forEach(([key, column]) => {
            const value = req.query[key];
            if (value === undefined || value === '') return;
            if (key === 'date_from') {
                where.push(`${column} >= ?`);
                params.push(value);
            } else if (key === 'date_to') {
                where.push(`${column} <= ?`);
                params.push(value);
            } else if (key === 'status' && value.includes(',')) {
                const statuses = value.split(',').map((s) => s.trim()).filter(Boolean);
                where.push(`${column} IN (${statuses.map(() => '?').join(',')})`);
                params.push(...statuses);
            } else {
                where.push(`${column} = ?`);
                params.push(value);
            }
        });

        const { page, limit, offset } = getPagination(req.query, 20, 100);
        const whereSql = where.join(' AND ');

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM ${def.from} ${def.joins} WHERE ${whereSql}`,
            params
        );
        const [rows] = await pool.query(
            `SELECT ${def.select} FROM ${def.from} ${def.joins}
             WHERE ${whereSql} ORDER BY ${def.order} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = Number(countRows[0].total);
        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            resource: { name: resource, read_only: Boolean(def.readOnly) }
        });
    } catch (error) {
        next(error);
    }
};

exports.getOne = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const def = RESOURCES[req.params.resource];
        if (!def) return res.status(404).json({ success: false, message: 'Unknown resource.' });
        if (!ctx.isSuperAdmin && !ctx.hasPermission(def.viewPermission)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to view this resource.' });
        }
        const row = await fetchOne(def, ctx, req.params.id);
        if (!row) return res.status(404).json({ success: false, message: 'Record not found or outside your school.' });
        res.json({ success: true, data: row });
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const resource = req.params.resource;
        const def = RESOURCES[resource];
        if (!def) return res.status(404).json({ success: false, message: 'Unknown resource.' });
        if (def.readOnly) return res.status(405).json({ success: false, message: 'This resource is read-only.' });

        const isStudentSubmission = resource === 'assessment-submissions' && ctx.isStudent;
        // Staff may enrol themselves in a CPD activity they can see, even without cpd.manage.
        const isOwnCpdEnrollment = resource === 'cpd-enrollments' &&
            Number(body.user_id) === Number(ctx.user.id) && ctx.hasPermission('cpd.view');
        if (!isStudentSubmission && !isOwnCpdEnrollment && !ctx.isSuperAdmin && !ctx.hasPermission(def.writePermission)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to create this record.' });
        }

        const body = { ...req.body };
        if (!(await verifyParent(resource, ctx, body))) {
            return res.status(400).json({ success: false, message: 'The linked assessment or activity is invalid.' });
        }

        for (const field of def.required || []) {
            if (body[field] === undefined || body[field] === null || body[field] === '') {
                return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
            }
        }

        const values = pickFields(def, body);

        // Teachers may only record data for classes they actually teach.
        if (!ctx.isSuperAdmin && ctx.isTeacher && CLASS_SCOPED.has(resource)) {
            if (!values.class_id) {
                return res.status(400).json({ success: false, message: 'A class is required.' });
            }
            if (!(await teacherTeachesClass(ctx, values.class_id))) {
                return res.status(403).json({ success: false, message: 'You can only record data for classes you teach.' });
            }
        }
        const table = tableFor(def);
        const schoolId = writeSchoolId(resource, def, ctx, body);

        if (['students', 'classes', 'assessments', 'marks', 'attendance', 'teacher-attendance', 'timetable',
            'library', 'loans', 'diary', 'academic-years', 'terms'].includes(resource) && !schoolId) {
            return res.status(400).json({ success: false, message: 'A school must be selected for this record.' });
        }

        if (resource !== 'assessment-questions' && resource !== 'assessment-submissions' &&
            resource !== 'cpd-enrollments' && resource !== 'portfolio' && resource !== 'subjects') {
            values.school_id = schoolId;
        }

        // Resource-specific defaults and safety rules
        if (resource === 'marks') {
            if (isStudentSubmission) {
                return res.status(403).json({ success: false, message: 'Students cannot create marks.' });
            }
            values.teacher_id = (!ctx.isSuperAdmin && ctx.isTeacher)
                ? ctx.user.id
                : (body.teacher_id || ctx.user.id);
            values.grade = gradeFor(values.score, values.max_score);
            if (!body.status) values.status = 'submitted';
            if (values.status === 'approved' && !ctx.hasPermission('marks.approve')) {
                values.status = 'submitted';
            }
            if (!body.term_id) {
                const [termRows] = await pool.query(
                    'SELECT id FROM terms WHERE school_id = ? AND is_current = 1 LIMIT 1', [ctx.schoolId]
                );
                if (termRows.length) values.term_id = termRows[0].id;
            }
        }

        if (resource === 'assessments') {
            values.created_by = ctx.user.id;
            if (!ctx.isSuperAdmin && ctx.isTeacher) {
                values.teacher_id = ctx.user.id;
            } else if (!values.teacher_id) {
                values.teacher_id = ctx.user.id;
            }
        }

        if (resource === 'diary') {
            if (!ctx.isSuperAdmin && ctx.isTeacher) values.teacher_id = ctx.user.id;
            else if (!values.teacher_id) values.teacher_id = ctx.user.id;
        }
        if (resource === 'attendance') values.recorded_by = ctx.user.id;
        if (resource === 'teacher-attendance') values.recorded_by = ctx.user.id;
        if (resource === 'library') values.uploaded_by = ctx.user.id;
        if (resource === 'loans') values.issued_by = ctx.user.id;
        if (resource === 'announcements') {
            values.created_by = ctx.user.id;
            values.published_at = new Date();
        }
        if (resource === 'portfolio') {
            values.user_id = values.user_id || ctx.user.id;
            values.school_id = values.school_id || schoolId;
        }
        if (resource === 'subjects') values.school_id = schoolId;
        if (resource === 'cpd') values.school_id = schoolId;
        if (resource === 'cpd-enrollments' && isOwnCpdEnrollment) {
            values.user_id = ctx.user.id;
            if (!values.status) values.status = 'enrolled';
            if (values.status === 'completed' && !values.completed_at) values.completed_at = new Date();
        }
        if (resource === 'academic-years' || resource === 'terms') {
            if (parseBoolean(values.is_current)) {
                await pool.query(
                    `UPDATE ${table} SET is_current = 0 WHERE school_id = ?`, [schoolId]
                );
            }
        }

        if (isStudentSubmission) {
            const [students] = await pool.query(
                'SELECT id FROM student_profiles WHERE user_id = ? LIMIT 1', [ctx.user.id]
            );
            if (students.length === 0) {
                return res.status(403).json({ success: false, message: 'No student profile is linked to your account.' });
            }
            values.student_id = students[0].id;
            values.score = null;
            values.feedback = null;
            values.status = 'submitted';
            values.submitted_at = new Date();
        }

        if (resource === 'loans') {
            const [resources] = await pool.query(
                'SELECT id, available_copies, school_id FROM library_resources WHERE id = ? AND school_id = ?',
                [values.resource_id, ctx.schoolId]
            );
            if (resources.length === 0) {
                return res.status(400).json({ success: false, message: 'Library resource not found in your school.' });
            }
            if (Number(resources[0].available_copies) <= 0) {
                return res.status(409).json({ success: false, message: 'No copies of this resource are available.' });
            }
            values.borrowed_at = new Date();
            values.status = 'borrowed';
        }

        const columns = Object.keys(values);
        if (columns.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields supplied.' });
        }
        const [result] = await pool.query(
            `INSERT INTO ${table} (${columns.map((c) => `\`${c}\``).join(', ')})
             VALUES (${columns.map(() => '?').join(', ')})`,
            columns.map((c) => values[c])
        );

        if (resource === 'loans') {
            await pool.query(
                'UPDATE library_resources SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0',
                [values.resource_id]
            );
        }

        await writeAuditLog({
            userId: ctx.user.id, schoolId: schoolId || ctx.schoolId,
            action: `${resource}.create`, module: resource.split('-')[0], entity: resource,
            entityId: result.insertId, details: values, req
        });

        const row = await fetchOne(def, ctx, result.insertId);
        res.status(201).json({ success: true, message: 'Record created.', data: row });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
        }
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const resource = req.params.resource;
        const def = RESOURCES[resource];
        if (!def) return res.status(404).json({ success: false, message: 'Unknown resource.' });
        if (def.readOnly) return res.status(405).json({ success: false, message: 'This resource is read-only.' });
        const id = req.params.id;
        let isOwnCpdEnrollment = false;
        if (resource === 'cpd-enrollments' && !ctx.isSuperAdmin && !ctx.hasPermission(def.writePermission)) {
            if (ctx.hasPermission('cpd.view')) {
                const [own] = await pool.query(
                    'SELECT id FROM cpd_enrollments WHERE id = ? AND user_id = ? LIMIT 1',
                    [id, ctx.user.id]
                );
                isOwnCpdEnrollment = own.length > 0;
            }
            if (!isOwnCpdEnrollment) {
                return res.status(403).json({ success: false, message: 'You do not have permission to edit this record.' });
            }
        } else if (!ctx.isSuperAdmin && !ctx.hasPermission(def.writePermission)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to edit this record.' });
        }
        if (!(await recordInScope(def, ctx, id, null))) {
            return res.status(404).json({ success: false, message: 'Record not found or outside your school.' });
        }

        if (!ctx.isSuperAdmin && ctx.isTeacher && CLASS_SCOPED.has(resource)) {
            const classId = req.body.class_id || await recordClassId(resource, id);
            if (!classId || !(await teacherTeachesClass(ctx, classId))) {
                return res.status(403).json({ success: false, message: 'You can only edit records for classes you teach.' });
            }
            if (!(await teacherOwnsRecord(ctx, resource, id))) {
                return res.status(403).json({ success: false, message: 'You can only edit records you created.' });
            }
        }

        const values = pickFields(def, req.body);

        if (isOwnCpdEnrollment) {
            Object.keys(values).forEach((key) => {
                if (!['status', 'completed_at', 'certificate_url'].includes(key)) delete values[key];
            });
            if (values.status === 'completed' && !values.completed_at) values.completed_at = new Date();
        }

        if (resource === 'marks') {
            const [existing] = await pool.query(
                'SELECT is_locked, status, score, max_score FROM marks WHERE id = ?', [id]
            );
            if (existing.length === 0) return res.status(404).json({ success: false, message: 'Mark not found.' });
            if (existing[0].is_locked && !ctx.hasPermission('marks.lock')) {
                return res.status(409).json({ success: false, message: 'This mark is locked. Ask the Director of Studies to reopen it.' });
            }
            if (values.status === 'approved' && !ctx.hasPermission('marks.approve')) {
                delete values.status;
            }
            if (req.body.score !== undefined || req.body.max_score !== undefined) {
                values.grade = gradeFor(
                    req.body.score !== undefined ? req.body.score : existing[0].score,
                    req.body.max_score !== undefined ? req.body.max_score : existing[0].max_score
                );
            }
        }

        if (resource === 'academic-years' || resource === 'terms') {
            if (parseBoolean(values.is_current)) {
                await pool.query('UPDATE ' + tableFor(def) + ' SET is_current = 0 WHERE school_id = ?', [ctx.schoolId]);
            }
        }

        const columns = Object.keys(values);
        if (columns.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields supplied.' });
        }

        await pool.query(
            `UPDATE ${tableFor(def)} SET ${columns.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
            [...columns.map((c) => values[c]), id]
        );

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId,
            action: `${resource}.update`, module: resource.split('-')[0], entity: resource,
            entityId: id, details: values, req
        });

        const row = await fetchOne(def, ctx, id);
        res.json({ success: true, message: 'Record updated.', data: row });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
        }
        next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const ctx = req.platform;
        const resource = req.params.resource;
        const def = RESOURCES[resource];
        if (!def) return res.status(404).json({ success: false, message: 'Unknown resource.' });
        if (def.readOnly) return res.status(405).json({ success: false, message: 'This resource is read-only.' });
        if (!ctx.isSuperAdmin && !ctx.hasPermission(def.writePermission)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to delete this record.' });
        }

        const id = req.params.id;
        if (!(await recordInScope(def, ctx, id, null))) {
            return res.status(404).json({ success: false, message: 'Record not found or outside your school.' });
        }

        if (!ctx.isSuperAdmin && ctx.isTeacher && CLASS_SCOPED.has(resource)) {
            const classId = await recordClassId(resource, id);
            if (!classId || !(await teacherTeachesClass(ctx, classId)) ||
                !(await teacherOwnsRecord(ctx, resource, id))) {
                return res.status(403).json({ success: false, message: 'You can only delete records you created for your own classes.' });
            }
        }

        if (resource === 'marks') {
            const [existing] = await pool.query('SELECT is_locked FROM marks WHERE id = ?', [id]);
            if (existing.length && existing[0].is_locked && !ctx.hasPermission('marks.lock')) {
                return res.status(409).json({ success: false, message: 'This mark is locked and cannot be deleted.' });
            }
        }

        if (def.softDelete) {
            await pool.query(
                `UPDATE ${tableFor(def)} SET \`${def.softDelete.column}\` = ? WHERE id = ?`,
                [def.softDelete.value, id]
            );
        } else {
            await pool.query(`DELETE FROM ${tableFor(def)} WHERE id = ?`, [id]);
        }

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId,
            action: `${resource}.delete`, module: resource.split('-')[0], entity: resource,
            entityId: id, details: { soft: Boolean(def.softDelete) }, req
        });

        res.json({ success: true, message: def.softDelete ? 'Record archived.' : 'Record deleted.' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ success: false, message: 'This record is referenced by other data and cannot be deleted.' });
        }
        next(error);
    }
};

/* ==========================================================================
 * Specialised actions
 * ========================================================================== */

exports.bulkAttendance = async (req, res, next) => {
    const { class_id, attendance_date, records } = req.body;
    const ctx = req.platform;
    const connection = await pool.getConnection();
    try {
        if (!class_id || !attendance_date || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'Class, date and attendance records are required.' });
        }
        const [classes] = await connection.query(
            'SELECT id FROM classes WHERE id = ? AND school_id = ?', [class_id, ctx.schoolId]
        );
        if (classes.length === 0) {
            return res.status(400).json({ success: false, message: 'Class not found in your school.' });
        }
        if (!ctx.isSuperAdmin && ctx.isTeacher && !(await teacherTeachesClass(ctx, class_id))) {
            return res.status(403).json({ success: false, message: 'You can only record attendance for classes you teach.' });
        }
        const [students] = await connection.query(
            'SELECT id FROM student_profiles WHERE class_id = ? AND school_id = ?', [class_id, ctx.schoolId]
        );
        const allowed = new Set(students.map((s) => s.id));
        const validStatuses = new Set(['present', 'absent', 'late', 'excused']);

        await connection.beginTransaction();
        let saved = 0;
        for (const record of records) {
            const studentId = Number(record.student_id);
            if (!allowed.has(studentId) || !validStatuses.has(record.status)) continue;
            await connection.query(
                `INSERT INTO student_attendance (school_id, student_id, class_id, attendance_date, status, notes, recorded_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), recorded_by = VALUES(recorded_by)`,
                [ctx.schoolId, studentId, class_id, attendance_date, record.status, record.notes || null, ctx.user.id]
            );
            saved += 1;
        }
        await connection.commit();

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId, action: 'attendance.bulk',
            module: 'attendance', entity: 'class', entityId: class_id,
            details: { date: attendance_date, saved }, req
        });

        res.json({ success: true, message: `Attendance saved for ${saved} learner(s).`, data: { saved } });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

const setMarkState = async (req, res, next, action) => {
    const connection = await pool.getConnection();
    try {
        const ctx = req.platform;
        const id = req.params.id;
        const [marks] = await connection.query(
            `SELECT mk.id, mk.status, mk.is_locked, mk.teacher_id, mk.school_id
             FROM marks mk WHERE mk.id = ? AND mk.school_id = ?`, [id, ctx.schoolId]
        );
        if (marks.length === 0) {
            return res.status(404).json({ success: false, message: 'Mark not found in your school.' });
        }
        const mark = marks[0];

        await connection.beginTransaction();
        if (action === 'approve') {
            if (mark.status === 'approved') {
                await connection.rollback();
                return res.status(409).json({ success: false, message: 'This mark is already approved.' });
            }
            await connection.query(
                'UPDATE marks SET status = \'approved\', approved_by = ?, approved_at = NOW() WHERE id = ?',
                [ctx.user.id, id]
            );
        } else if (action === 'lock') {
            await connection.query('UPDATE marks SET is_locked = 1, status = \'approved\' WHERE id = ?', [id]);
        } else if (action === 'reopen') {
            await connection.query('UPDATE marks SET is_locked = 0, status = \'submitted\' WHERE id = ?', [id]);
        }
        await connection.commit();

        if (mark.teacher_id && mark.teacher_id !== ctx.user.id) {
            await notify({
                userId: mark.teacher_id, schoolId: ctx.schoolId,
                title: `Marks ${action === 'approve' ? 'approved' : action === 'lock' ? 'locked' : 'reopened'}`,
                message: `A mark record was ${action}d by an authorised staff member.`,
                type: 'marks', link: '/app/marks'
            });
        }

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId, action: `mark.${action}`,
            module: 'marks', entity: 'mark', entityId: id, details: {}, req
        });

        res.json({ success: true, message: `Mark ${action === 'approve' ? 'approved' : action === 'lock' ? 'locked' : 'reopened'}.` });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.approveMark = (req, res, next) => setMarkState(req, res, next, 'approve');
exports.lockMark = (req, res, next) => setMarkState(req, res, next, 'lock');
exports.reopenMark = (req, res, next) => setMarkState(req, res, next, 'reopen');

exports.returnLoan = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const ctx = req.platform;
        const [loans] = await connection.query(
            `SELECT id, resource_id, status FROM library_loans WHERE id = ? AND school_id = ?`,
            [req.params.id, ctx.schoolId]
        );
        if (loans.length === 0) {
            return res.status(404).json({ success: false, message: 'Loan not found in your school.' });
        }
        if (loans[0].status === 'returned') {
            return res.status(409).json({ success: false, message: 'This loan has already been returned.' });
        }

        await connection.beginTransaction();
        await connection.query(
            "UPDATE library_loans SET status = 'returned', returned_at = NOW() WHERE id = ?", [req.params.id]
        );
        await connection.query(
            'UPDATE library_resources SET available_copies = LEAST(total_copies, available_copies + 1) WHERE id = ?',
            [loans[0].resource_id]
        );
        await connection.commit();

        await writeAuditLog({
            userId: ctx.user.id, schoolId: ctx.schoolId, action: 'loan.return',
            module: 'library', entity: 'loan', entityId: req.params.id, details: {}, req
        });
        res.json({ success: true, message: 'Resource returned.' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
