/**
 * Platform resource registry
 * --------------------------
 * Declarative description of every CRUD resource exposed through
 * /api/platform/resources/:resource. Keeping this in one place guarantees that
 * column names, permissions, search fields and school scoping are consistent
 * and that no client-supplied SQL identifier ever reaches the database.
 */

const teacherClassIds = `(SELECT c2.id FROM classes c2 WHERE c2.teacher_id = ?)
                         UNION (SELECT cs2.class_id FROM class_subjects cs2 WHERE cs2.teacher_id = ?)`;

const ownStudentId = `(SELECT sp2.id FROM student_profiles sp2 WHERE sp2.user_id = ?)`;
const linkedStudentIds = `(SELECT psl.student_profile_id FROM parent_student_links psl
                           JOIN parent_profiles pp2 ON pp2.id = psl.parent_profile_id
                           WHERE pp2.user_id = ? AND psl.is_verified = 1)`;
const linkedClassIds = `(SELECT sp3.class_id FROM student_profiles sp3 WHERE sp3.id IN (${linkedStudentIds}))`;
const ownClassId = `(SELECT sp4.class_id FROM student_profiles sp4 WHERE sp4.user_id = ?)`;

const schoolOnly = (ctx, alias, requested) => {
    if (ctx.isSuperAdmin) {
        const requestedId = requested === undefined || requested === null || requested === ''
            ? null : Number(requested);
        if (requestedId !== null && Number.isFinite(requestedId)) {
            return { clause: `${alias}.school_id = ?`, params: [requestedId] };
        }
        return { clause: '1 = 1', params: [] };
    }
    return { clause: `${alias}.school_id = ?`, params: [ctx.defaultSchoolId] };
};

const schoolWithGlobal = (ctx, alias, requested) => {
    if (ctx.isSuperAdmin) {
        const requestedId = requested === undefined || requested === null || requested === ''
            ? null : Number(requested);
        if (requestedId !== null && Number.isFinite(requestedId)) {
            return { clause: `(${alias}.school_id = ? OR ${alias}.school_id IS NULL)`, params: [requestedId] };
        }
        return { clause: '1 = 1', params: [] };
    }
    return { clause: `(${alias}.school_id = ? OR ${alias}.school_id IS NULL)`, params: [ctx.defaultSchoolId] };
};

const teacherStudents = (ctx, alias, requested) => {
    const base = schoolOnly(ctx, alias, requested);
    if (!ctx.isTeacher || ctx.isSuperAdmin) return base;
    return {
        clause: `(${base.clause}) AND (${alias}.class_id IN (${teacherClassIds}))`,
        params: [...base.params, ctx.user.id, ctx.user.id]
    };
};

const ownOrParentStudents = (ctx, alias, requested) => {
    const base = schoolOnly(ctx, alias, requested);
    if (ctx.isSuperAdmin) return base;
    if (ctx.isStudent) {
        return { clause: `(${base.clause}) AND ${alias}.user_id = ?`, params: [...base.params, ctx.user.id] };
    }
    if (ctx.isParent) {
        return { clause: `(${base.clause}) AND ${alias}.id IN (${linkedStudentIds})`, params: [...base.params, ctx.user.id] };
    }
    return base;
};

const teacherClasses = (ctx, alias, requested) => {
    const base = schoolOnly(ctx, alias, requested);
    if (ctx.isSuperAdmin) return base;
    if (ctx.isStudent) {
        return { clause: `(${base.clause}) AND ${alias}.id = ${ownClassId}`, params: [...base.params, ctx.user.id] };
    }
    if (ctx.isParent) {
        return { clause: `(${base.clause}) AND ${alias}.id IN (${linkedClassIds})`, params: [...base.params, ctx.user.id, ctx.user.id] };
    }
    if (ctx.isTeacher) {
        return { clause: `(${base.clause}) AND (${alias}.teacher_id = ? OR ${alias}.id IN (${teacherClassIds}))`, params: [...base.params, ctx.user.id, ctx.user.id, ctx.user.id] };
    }
    return base;
};

const studentRecordsScope = (ctx, schoolAlias, studentAlias, requested) => {
    const base = schoolOnly(ctx, schoolAlias, requested);
    if (ctx.isSuperAdmin) return base;
    if (ctx.isStudent) {
        return { clause: `(${base.clause}) AND ${studentAlias} = ${ownStudentId}`, params: [...base.params, ctx.user.id] };
    }
    if (ctx.isParent) {
        return { clause: `(${base.clause}) AND ${studentAlias} IN (${linkedStudentIds})`, params: [...base.params, ctx.user.id] };
    }
    return base;
};

const teacherRecordScope = (ctx, schoolAlias, teacherAlias, requested) => {
    const base = schoolOnly(ctx, schoolAlias, requested);
    if (!ctx.isSuperAdmin && ctx.isTeacher) {
        return { clause: `(${base.clause}) AND (${teacherAlias} = ? OR ${teacherAlias} IN (SELECT c3.teacher_id FROM classes c3 WHERE c3.id IN (${teacherClassIds})))`, params: [...base.params, ctx.user.id, ctx.user.id, ctx.user.id] };
    }
    return base;
};

const studentClassScope = (ctx, schoolAlias, classAlias, requested, extraWhere = '1=1') => {
    const base = schoolOnly(ctx, schoolAlias, requested);
    if (ctx.isSuperAdmin) return { clause: `(${base.clause}) AND (${extraWhere})`, params: base.params };
    if (ctx.isStudent) {
        return { clause: `(${base.clause}) AND ${classAlias} = ${ownClassId} AND (${extraWhere})`, params: [...base.params, ctx.user.id] };
    }
    if (ctx.isParent) {
        return { clause: `(${base.clause}) AND ${classAlias} IN (${linkedClassIds}) AND (${extraWhere})`, params: [...base.params, ctx.user.id, ctx.user.id] };
    }
    if (ctx.isTeacher) {
        return { clause: `(${base.clause}) AND ${classAlias} IN (${teacherClassIds}) AND (${extraWhere})`, params: [...base.params, ctx.user.id, ctx.user.id] };
    }
    return { clause: `(${base.clause}) AND (${extraWhere})`, params: base.params };
};

const RESOURCES = {
    students: {
        from: 'student_profiles sp',
        idColumn: 'sp.id',
        select: `sp.*, CONCAT(sp.first_name, ' ', sp.last_name) AS full_name,
                 c.name AS class_name, c.stream AS class_stream, u.email AS user_email`,
        joins: `LEFT JOIN classes c ON c.id = sp.class_id
                LEFT JOIN users u ON u.id = sp.user_id`,
        viewPermission: 'students.view',
        writePermission: 'students.manage',
        scopes: {
            read: (ctx, requested) => ownOrParentStudents(ctx, 'sp', requested),
            write: (ctx, requested) => schoolOnly(ctx, 'sp', requested)
        },
        search: ['sp.first_name', 'sp.last_name', 'sp.admission_number', 'sp.guardian_name', 'c.name'],
        fields: ['user_id', 'admission_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'class_id',
            'guardian_name', 'guardian_phone', 'guardian_email', 'address', 'status'],
        required: ['admission_number', 'first_name', 'last_name'],
        filters: { class_id: 'sp.class_id', status: 'sp.status', gender: 'sp.gender' },
        order: 'sp.created_at DESC',
        softDelete: { column: 'status', value: 'inactive' }
    },

    teachers: {
        from: 'teacher_profiles tp JOIN users u ON u.id = tp.user_id',
        idColumn: 'tp.id',
        select: `tp.*, u.full_name, u.email, u.phone_number, u.profile_photo, u.is_suspended,
                 u.last_login_at, u.language, u.theme`,
        joins: '',
        viewPermission: 'teachers.view',
        writePermission: 'teachers.manage',
        scopes: { read: (ctx, r) => schoolOnly(ctx, 'tp', r), write: (ctx, r) => schoolOnly(ctx, 'tp', r) },
        search: ['u.full_name', 'u.email', 'tp.staff_number', 'tp.specialization'],
        fields: ['staff_number', 'qualification', 'specialization', 'employment_date', 'status'],
        required: [],
        filters: { status: 'tp.status' },
        order: 'u.full_name ASC'
    },

    parents: {
        from: 'parent_profiles pp JOIN users u ON u.id = pp.user_id',
        idColumn: 'pp.id',
        select: `pp.*, u.full_name, u.email, u.phone_number, u.is_suspended,
                 (SELECT COUNT(*) FROM parent_student_links psl WHERE psl.parent_profile_id = pp.id) AS children_count`,
        joins: '',
        viewPermission: 'students.view',
        writePermission: 'students.manage',
        scopes: { read: (ctx, r) => schoolOnly(ctx, 'pp', r), write: (ctx, r) => schoolOnly(ctx, 'pp', r) },
        search: ['u.full_name', 'u.email', 'u.phone_number', 'pp.occupation'],
        fields: ['occupation', 'phone'],
        required: [],
        filters: {},
        order: 'u.full_name ASC'
    },

    classes: {
        from: 'classes c',
        idColumn: 'c.id',
        select: `c.*, u.full_name AS teacher_name, s.name AS school_name,
                 (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = c.id AND sp.status = 'active') AS student_count,
                 (SELECT COUNT(*) FROM class_subjects cs WHERE cs.class_id = c.id) AS subject_count`,
        joins: `LEFT JOIN users u ON u.id = c.teacher_id
                LEFT JOIN schools s ON s.id = c.school_id`,
        viewPermission: 'classes.view',
        writePermission: 'classes.manage',
        scopes: { read: (ctx, r) => teacherClasses(ctx, 'c', r), write: (ctx, r) => schoolOnly(ctx, 'c', r) },
        search: ['c.name', 'c.stream', 'c.level', 'u.full_name'],
        fields: ['name', 'stream', 'level', 'class_size', 'academic_year', 'academic_year_id', 'teacher_id'],
        required: ['name'],
        filters: { teacher_id: 'c.teacher_id', level: 'c.level', academic_year: 'c.academic_year' },
        order: 'c.name ASC'
    },

    subjects: {
        from: 'subjects s',
        idColumn: 's.id',
        select: `s.*, sch.name AS school_name,
                 (SELECT COUNT(*) FROM class_subjects cs WHERE cs.subject_id = s.id) AS class_count`,
        joins: 'LEFT JOIN schools sch ON sch.id = s.school_id',
        viewPermission: 'subjects.view',
        writePermission: 'subjects.manage',
        scopes: { read: (ctx, r) => schoolWithGlobal(ctx, 's', r), write: (ctx, r) => schoolOnly(ctx, 's', r) },
        search: ['s.name', 's.code', 's.description'],
        fields: ['name', 'code', 'description', 'category', 'is_custom'],
        required: ['name'],
        filters: { category: 's.category' },
        order: 's.name ASC'
    },

    assessments: {
        from: 'assessments a',
        idColumn: 'a.id',
        select: `a.*, c.name AS class_name, s.name AS subject_name, t.name AS term_name,
                 u.full_name AS teacher_name,
                 (SELECT COUNT(*) FROM assessment_submissions sub WHERE sub.assessment_id = a.id) AS submission_count,
                 (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count`,
        joins: `JOIN classes c ON c.id = a.class_id
                JOIN subjects s ON s.id = a.subject_id
                LEFT JOIN terms t ON t.id = a.term_id
                LEFT JOIN users u ON u.id = a.teacher_id`,
        viewPermission: 'assessments.view',
        writePermission: 'assessments.manage',
        scopes: {
            read: (ctx, r) => studentClassScope(ctx, 'a', 'a.class_id', r, ctx.isStudent ? "a.status = 'published'" : '1=1'),
            write: (ctx, r) => schoolOnly(ctx, 'a', r)
        },
        search: ['a.title', 'a.description', 'c.name', 's.name'],
        fields: ['class_id', 'subject_id', 'term_id', 'teacher_id', 'title', 'description', 'type',
            'total_marks', 'weight', 'assessment_date', 'due_date', 'duration_minutes', 'status'],
        required: ['class_id', 'subject_id', 'title'],
        filters: { class_id: 'a.class_id', subject_id: 'a.subject_id', status: 'a.status', type: 'a.type', term_id: 'a.term_id', teacher_id: 'a.teacher_id' },
        order: 'a.assessment_date DESC, a.created_at DESC'
    },

    'assessment-questions': {
        from: 'assessment_questions q JOIN assessments a ON a.id = q.assessment_id',
        idColumn: 'q.id',
        select: 'q.*, a.title AS assessment_title, a.school_id, a.class_id, a.subject_id',
        joins: '',
        viewPermission: 'assessments.view',
        writePermission: 'assessments.manage',
        scopes: { read: (ctx, r) => schoolOnly(ctx, 'a', r), write: (ctx, r) => schoolOnly(ctx, 'a', r) },
        search: ['q.question_text', 'a.title'],
        fields: ['assessment_id', 'question_text', 'question_type', 'options', 'correct_answer', 'marks', 'sort_order'],
        required: ['assessment_id', 'question_text'],
        filters: { assessment_id: 'q.assessment_id' },
        order: 'q.sort_order ASC'
    },

    'assessment-submissions': {
        from: 'assessment_submissions sub JOIN assessments a ON a.id = sub.assessment_id',
        idColumn: 'sub.id',
        select: `sub.*, a.title AS assessment_title, a.school_id, a.class_id, a.subject_id,
                 CONCAT(sp.first_name, ' ', sp.last_name) AS student_name, sp.admission_number`,
        joins: 'JOIN student_profiles sp ON sp.id = sub.student_id',
        viewPermission: 'assessments.view',
        writePermission: 'assessments.grade',
        scopes: {
            read: (ctx, r) => studentRecordsScope(ctx, 'a', 'sub.student_id', r),
            write: (ctx, r) => schoolOnly(ctx, 'a', r)
        },
        search: ['sp.first_name', 'sp.last_name', 'a.title'],
        fields: ['student_id', 'submitted_at', 'answers', 'score', 'status', 'feedback'],
        required: [],
        filters: { assessment_id: 'sub.assessment_id', student_id: 'sub.student_id', status: 'sub.status' },
        order: 'sub.created_at DESC'
    },

    marks: {
        from: 'marks mk',
        idColumn: 'mk.id',
        select: `mk.*, CONCAT(sp.first_name, ' ', sp.last_name) AS student_name, sp.admission_number,
                 c.name AS class_name, s.name AS subject_name, u.full_name AS teacher_name,
                 ap.full_name AS approved_by_name, a.title AS assessment_title`,
        joins: `JOIN student_profiles sp ON sp.id = mk.student_id
                JOIN classes c ON c.id = mk.class_id
                JOIN subjects s ON s.id = mk.subject_id
                LEFT JOIN users u ON u.id = mk.teacher_id
                LEFT JOIN users ap ON ap.id = mk.approved_by
                LEFT JOIN assessments a ON a.id = mk.assessment_id`,
        viewPermission: 'marks.view',
        writePermission: 'marks.enter',
        scopes: {
            read: (ctx, r) => {
                const base = studentRecordsScope(ctx, 'mk', 'mk.student_id', r);
                if (ctx.isSuperAdmin) return base;
                if (ctx.isStudent || ctx.isParent) {
                    return { clause: `(${base.clause}) AND mk.status = 'approved'`, params: base.params };
                }
                if (ctx.isTeacher) {
                    return {
                        clause: `(${base.clause}) AND (mk.teacher_id = ? OR mk.class_id IN (${teacherClassIds}))`,
                        params: [...base.params, ctx.user.id, ctx.user.id, ctx.user.id]
                    };
                }
                return base;
            },
            write: (ctx, r) => schoolOnly(ctx, 'mk', r)
        },
        search: ['sp.first_name', 'sp.last_name', 'sp.admission_number', 's.name', 'c.name'],
        fields: ['assessment_id', 'student_id', 'subject_id', 'class_id', 'term_id', 'teacher_id',
            'score', 'max_score', 'grade', 'remarks', 'status'],
        required: ['student_id', 'subject_id', 'class_id', 'score'],
        filters: { class_id: 'mk.class_id', subject_id: 'mk.subject_id', student_id: 'mk.student_id', status: 'mk.status', term_id: 'mk.term_id', assessment_id: 'mk.assessment_id', teacher_id: 'mk.teacher_id' },
        order: 'mk.created_at DESC',
        grade: true
    },

    attendance: {
        from: 'student_attendance sa',
        idColumn: 'sa.id',
        select: `sa.*, CONCAT(sp.first_name, ' ', sp.last_name) AS student_name, sp.admission_number,
                 c.name AS class_name`,
        joins: `JOIN student_profiles sp ON sp.id = sa.student_id
                LEFT JOIN classes c ON c.id = sa.class_id`,
        viewPermission: 'attendance.view',
        writePermission: 'attendance.record',
        scopes: {
            read: (ctx, r) => studentClassScope(ctx, 'sa', 'sa.class_id', r),
            write: (ctx, r) => schoolOnly(ctx, 'sa', r)
        },
        search: ['sp.first_name', 'sp.last_name', 'sp.admission_number'],
        fields: ['student_id', 'class_id', 'attendance_date', 'status', 'notes'],
        required: ['student_id', 'attendance_date', 'status'],
        filters: { class_id: 'sa.class_id', student_id: 'sa.student_id', status: 'sa.status', date_from: 'sa.attendance_date', date_to: 'sa.attendance_date' },
        order: 'sa.attendance_date DESC, sp.last_name ASC'
    },

    'teacher-attendance': {
        from: 'teacher_attendance ta JOIN users tu ON tu.id = ta.teacher_id',
        idColumn: 'ta.id',
        select: 'ta.*, tu.full_name AS teacher_name, tu.email AS teacher_email',
        joins: '',
        viewPermission: 'attendance.view',
        writePermission: 'attendance.record',
        scopes: { read: (ctx, r) => teacherRecordScope(ctx, 'ta', 'ta.teacher_id', r), write: (ctx, r) => schoolOnly(ctx, 'ta', r) },
        search: ['tu.full_name', 'tu.email'],
        fields: ['teacher_id', 'attendance_date', 'status', 'check_in', 'check_out', 'notes'],
        required: ['teacher_id', 'attendance_date', 'status'],
        filters: { teacher_id: 'ta.teacher_id', status: 'ta.status', date_from: 'ta.attendance_date', date_to: 'ta.attendance_date' },
        order: 'ta.attendance_date DESC'
    },

    timetable: {
        from: 'timetable_slots tsl',
        idColumn: 'tsl.id',
        select: `tsl.*, c.name AS class_name, s.name AS subject_name, u.full_name AS teacher_name`,
        joins: `JOIN classes c ON c.id = tsl.class_id
                JOIN subjects s ON s.id = tsl.subject_id
                LEFT JOIN users u ON u.id = tsl.teacher_id`,
        viewPermission: 'timetable.view',
        writePermission: 'timetable.manage',
        scopes: {
            read: (ctx, r) => studentClassScope(ctx, 'tsl', 'tsl.class_id', r),
            write: (ctx, r) => schoolOnly(ctx, 'tsl', r)
        },
        search: ['c.name', 's.name', 'u.full_name', 'tsl.room'],
        fields: ['class_id', 'subject_id', 'teacher_id', 'day_of_week', 'start_time', 'end_time', 'room', 'academic_year'],
        required: ['class_id', 'subject_id', 'day_of_week', 'start_time', 'end_time'],
        filters: { class_id: 'tsl.class_id', subject_id: 'tsl.subject_id', teacher_id: 'tsl.teacher_id', day_of_week: 'tsl.day_of_week' },
        order: 'FIELD(tsl.day_of_week,"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"), tsl.start_time'
    },

    library: {
        from: 'library_resources lr',
        idColumn: 'lr.id',
        select: `lr.*,
                 (SELECT COUNT(*) FROM library_loans ll WHERE ll.resource_id = lr.id AND ll.status IN ('borrowed','overdue')) AS active_loans`,
        joins: '',
        viewPermission: 'library.view',
        writePermission: 'library.manage',
        scopes: { read: (ctx, r) => schoolOnly(ctx, 'lr', r), write: (ctx, r) => schoolOnly(ctx, 'lr', r) },
        search: ['lr.title', 'lr.author', 'lr.category', 'lr.isbn', 'lr.description'],
        fields: ['title', 'author', 'category', 'resource_type', 'isbn', 'description', 'file_url',
            'cover_url', 'total_copies', 'available_copies', 'status'],
        required: ['title'],
        filters: { category: 'lr.category', resource_type: 'lr.resource_type', status: 'lr.status' },
        order: 'lr.created_at DESC'
    },

    loans: {
        from: 'library_loans ll',
        idColumn: 'll.id',
        select: `ll.*, lr.title AS resource_title, lr.author AS resource_author,
                 u.full_name AS borrower_name, u.email AS borrower_email,
                 CONCAT(sp.first_name, ' ', sp.last_name) AS student_name`,
        joins: `JOIN library_resources lr ON lr.id = ll.resource_id
                JOIN users u ON u.id = ll.borrower_user_id
                LEFT JOIN student_profiles sp ON sp.id = ll.student_id`,
        viewPermission: 'library.view',
        writePermission: 'library.manage',
        scopes: {
            read: (ctx, r) => {
                if (!ctx.isSuperAdmin && (ctx.isStudent || ctx.isParent)) {
                    const base = schoolOnly(ctx, 'll', r);
                    if (ctx.isStudent) {
                        return { clause: `(${base.clause}) AND ll.borrower_user_id = ?`, params: [...base.params, ctx.user.id] };
                    }
                    return { clause: `(${base.clause}) AND ll.student_id IN (${linkedStudentIds})`, params: [...base.params, ctx.user.id] };
                }
                return schoolOnly(ctx, 'll', r);
            },
            write: (ctx, r) => schoolOnly(ctx, 'll', r)
        },
        search: ['lr.title', 'u.full_name', 'u.email'],
        fields: ['resource_id', 'borrower_user_id', 'student_id', 'due_at', 'status', 'issued_by', 'notes'],
        required: ['resource_id', 'borrower_user_id', 'due_at'],
        filters: { status: 'll.status', resource_id: 'll.resource_id', borrower_user_id: 'll.borrower_user_id', student_id: 'll.student_id' },
        order: 'll.borrowed_at DESC'
    },

    diary: {
        from: 'class_diaries d',
        idColumn: 'd.id',
        select: `d.*, c.name AS class_name, s.name AS subject_name, u.full_name AS teacher_name`,
        joins: `JOIN classes c ON c.id = d.class_id
                JOIN subjects s ON s.id = d.subject_id
                LEFT JOIN users u ON u.id = d.teacher_id`,
        viewPermission: 'diary.view',
        writePermission: 'diary.manage',
        scopes: {
            read: (ctx, r) => studentClassScope(ctx, 'd', 'd.class_id', r),
            write: (ctx, r) => schoolOnly(ctx, 'd', r)
        },
        search: ['d.topic', 'd.activities', 'd.reflection', 'c.name', 's.name'],
        fields: ['class_id', 'subject_id', 'teacher_id', 'lesson_date', 'topic', 'activities',
            'homework', 'reflection', 'syllabus_unit', 'status'],
        required: ['class_id', 'subject_id', 'lesson_date', 'topic'],
        filters: { class_id: 'd.class_id', subject_id: 'd.subject_id', teacher_id: 'd.teacher_id', status: 'd.status', date_from: 'd.lesson_date', date_to: 'd.lesson_date' },
        order: 'd.lesson_date DESC'
    },

    cpd: {
        from: 'cpd_activities cp',
        idColumn: 'cp.id',
        select: `cp.*, s.name AS school_name,
                 (SELECT COUNT(*) FROM cpd_enrollments ce WHERE ce.cpd_activity_id = cp.id) AS enrollment_count`,
        joins: 'LEFT JOIN schools s ON s.id = cp.school_id',
        viewPermission: 'cpd.view',
        writePermission: 'cpd.manage',
        scopes: { read: (ctx, r) => schoolWithGlobal(ctx, 'cp', r), write: (ctx, r) => schoolOnly(ctx, 'cp', r) },
        search: ['cp.title', 'cp.description', 'cp.provider'],
        fields: ['title', 'description', 'provider', 'start_date', 'end_date', 'hours', 'status'],
        required: ['title'],
        filters: { status: 'cp.status' },
        order: 'cp.start_date DESC'
    },

    'cpd-enrollments': {
        from: 'cpd_enrollments ce JOIN cpd_activities cp ON cp.id = ce.cpd_activity_id',
        idColumn: 'ce.id',
        select: `ce.*, cp.title AS activity_title, cp.hours, cp.start_date, cp.end_date,
                 u.full_name AS user_name, u.email AS user_email, cp.school_id`,
        joins: 'JOIN users u ON u.id = ce.user_id',
        viewPermission: 'cpd.view',
        writePermission: 'cpd.manage',
        scopes: {
            read: (ctx, r) => {
                if (!ctx.isSuperAdmin && ctx.isTeacher) {
                    const base = schoolWithGlobal(ctx, 'cp', r);
                    return { clause: `(${base.clause}) AND ce.user_id = ?`, params: [...base.params, ctx.user.id] };
                }
                return schoolWithGlobal(ctx, 'cp', r);
            },
            write: (ctx, r) => schoolOnly(ctx, 'cp', r)
        },
        search: ['cp.title', 'u.full_name', 'u.email'],
        fields: ['cpd_activity_id', 'user_id', 'status', 'completed_at', 'certificate_url'],
        required: ['cpd_activity_id', 'user_id'],
        filters: { status: 'ce.status', user_id: 'ce.user_id', cpd_activity_id: 'ce.cpd_activity_id' },
        order: 'ce.created_at DESC'
    },

    portfolio: {
        from: 'professional_portfolios pf',
        idColumn: 'pf.id',
        select: 'pf.*, u.full_name AS user_name, u.email AS user_email',
        joins: 'JOIN users u ON u.id = pf.user_id',
        viewPermission: 'portfolio.view',
        writePermission: 'portfolio.manage',
        scopes: {
            read: (ctx, r) => {
                const base = schoolWithGlobal(ctx, 'pf', r);
                if (ctx.isSuperAdmin) return base;
                if (ctx.isTeacher && !ctx.roleCodes.has('cpd_coordinator') && !ctx.roleCodes.has('headteacher') && !ctx.roleCodes.has('dos')) {
                    return { clause: `(${base.clause}) AND pf.user_id = ?`, params: [...base.params, ctx.user.id] };
                }
                return base;
            },
            write: (ctx, r) => schoolWithGlobal(ctx, 'pf', r)
        },
        search: ['pf.title', 'pf.description', 'pf.category', 'u.full_name'],
        fields: ['user_id', 'title', 'category', 'description', 'evidence_url', 'achieved_on'],
        required: ['title'],
        filters: { user_id: 'pf.user_id', category: 'pf.category' },
        order: 'pf.achieved_on DESC'
    },

    announcements: {
        from: 'announcements an',
        idColumn: 'an.id',
        select: 'an.*, u.full_name AS created_by_name, s.name AS school_name',
        joins: 'LEFT JOIN users u ON u.id = an.created_by LEFT JOIN schools s ON s.id = an.school_id',
        viewPermission: 'notifications.view',
        writePermission: 'notifications.send',
        scopes: {
            read: (ctx, r) => {
                const base = schoolWithGlobal(ctx, 'an', r);
                if (ctx.isSuperAdmin) return base;
                const audience = ['all'];
                if (ctx.roleCodes.has('teacher') || ctx.roleCodes.has('hod')) audience.push('teachers', 'staff');
                if (ctx.roleCodes.has('student')) audience.push('students');
                if (ctx.roleCodes.has('parent')) audience.push('parents');
                if (['school_admin', 'headteacher', 'dos'].some((x) => ctx.roleCodes.has(x))) audience.push('admins', 'staff');
                const list = audience.map(() => '?').join(',');
                return { clause: `(${base.clause}) AND an.audience IN (${list})`, params: [...base.params, ...audience] };
            },
            write: (ctx, r) => schoolOnly(ctx, 'an', r)
        },
        search: ['an.title', 'an.body'],
        fields: ['title', 'body', 'audience', 'priority', 'expires_at'],
        required: ['title', 'body'],
        filters: { audience: 'an.audience', priority: 'an.priority' },
        order: 'an.published_at DESC'
    },

    'academic-years': {
        from: 'academic_years ay',
        idColumn: 'ay.id',
        select: 'ay.*, (SELECT COUNT(*) FROM terms t WHERE t.academic_year_id = ay.id) AS term_count',
        joins: '',
        viewPermission: 'school.view',
        writePermission: 'school.manage',
        scopes: { read: (ctx, r) => schoolOnly(ctx, 'ay', r), write: (ctx, r) => schoolOnly(ctx, 'ay', r) },
        search: ['ay.name'],
        fields: ['name', 'start_date', 'end_date', 'is_current'],
        required: ['name'],
        filters: {},
        order: 'ay.start_date DESC'
    },

    terms: {
        from: 'terms t',
        idColumn: 't.id',
        select: 't.*, ay.name AS academic_year_name',
        joins: 'JOIN academic_years ay ON ay.id = t.academic_year_id',
        viewPermission: 'school.view',
        writePermission: 'school.manage',
        scopes: { read: (ctx, r) => schoolOnly(ctx, 't', r), write: (ctx, r) => schoolOnly(ctx, 't', r) },
        search: ['t.name', 'ay.name'],
        fields: ['academic_year_id', 'name', 'start_date', 'end_date', 'is_current'],
        required: ['academic_year_id', 'name'],
        filters: { academic_year_id: 't.academic_year_id' },
        order: 't.start_date ASC'
    },

    'lesson-plans': {
        from: `lesson_plans lp
               JOIN lessons l ON l.id = lp.lesson_id
               JOIN units un ON un.id = l.unit_id
               JOIN class_subjects cs ON cs.id = un.class_subject_id
               JOIN classes c ON c.id = cs.class_id
               LEFT JOIN subjects s ON s.id = cs.subject_id`,
        idColumn: 'lp.id',
        select: `lp.*, l.lesson_title, l.teaching_date, l.term, l.is_completed,
                 c.name AS class_name, s.name AS subject_name, u.full_name AS teacher_name`,
        joins: 'LEFT JOIN users u ON u.id = c.teacher_id',
        viewPermission: 'lesson_plans.view',
        writePermission: 'lesson_plans.create',
        readOnly: true,
        scopes: {
            read: (ctx, r) => {
                const base = schoolOnly(ctx, 'lp', r);
                if (ctx.isSuperAdmin) return base;
                if (ctx.isStudent) {
                    return { clause: `(${base.clause}) AND c.id = ${ownClassId}`, params: [...base.params, ctx.user.id] };
                }
                if (ctx.isParent) {
                    return { clause: `(${base.clause}) AND c.id IN (${linkedClassIds})`, params: [...base.params, ctx.user.id, ctx.user.id] };
                }
                if (ctx.isTeacher) {
                    return { clause: `(${base.clause}) AND (c.teacher_id = ? OR cs.teacher_id = ?)`, params: [...base.params, ctx.user.id, ctx.user.id] };
                }
                return base;
            }
        },
        search: ['l.lesson_title', 'c.name', 's.name'],
        fields: [],
        filters: { class_id: 'c.id', subject_id: 'cs.subject_id' },
        order: 'lp.created_at DESC'
    }
};

module.exports = { RESOURCES };
