import { Badge, formatDate, initials } from './ui';

export const statusOptions = (t) => [
  { value: 'active', label: t('common.active') },
  { value: 'inactive', label: t('common.inactive') }
];

export const classLookup = {
  resource: 'classes',
  label: (row) => `${row.name}${row.stream ? ` · ${row.stream}` : ''}`
};

export const subjectLookup = {
  resource: 'subjects',
  label: (row) => `${row.name}${row.code ? ` (${row.code})` : ''}`
};

export const teacherLookup = {
  resource: 'teachers',
  label: (row) => row.full_name || row.email
};

export const studentLookup = {
  resource: 'students',
  label: (row) => `${row.full_name}${row.admission_number ? ` · ${row.admission_number}` : ''}`
};

export const termLookup = {
  resource: 'terms',
  label: (row) => `${row.name}${row.academic_year_name ? ` · ${row.academic_year_name}` : ''}`
};

export const assessmentLookup = {
  resource: 'assessments',
  label: (row) => `${row.title}${row.class_name ? ` · ${row.class_name}` : ''}`
};

export const personCell = (row) => (
  <div className="pf-profile-line">
    <span className="pf-avatar">{initials(row.full_name)}</span>
    <span className="pf-profile-line__text">
      <span className="pf-profile-line__name">{row.full_name || '—'}</span>
      <span className="pf-profile-line__meta">{row.email || row.admission_number || ''}</span>
    </span>
  </div>
);

export const studentConfig = (t) => ({
  resource: 'students',
  titleKey: 'students.title',
  subtitleKey: 'students.subtitle',
  writePermission: 'students.manage',
  createLabelKey: 'students.add',
  columns: [
    { key: 'admission_number', label: t('students.admission'), render: (row) => <span className="pf-mono">{row.admission_number}</span> },
    { key: 'full_name', label: t('common.name'), render: personCell },
    { key: 'class_name', label: t('common.class'), render: (row) => row.class_name || '—' },
    { key: 'gender', label: t('common.gender'), render: (row) => row.gender ? t(`common.${row.gender}`) : '—' },
    { key: 'guardian_name', label: t('students.guardian'), render: (row) => row.guardian_name || '—' },
    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
  ],
  formFields: [
    { key: 'admission_number', labelKey: 'students.admission', required: true },
    { key: 'first_name', labelKey: 'students.firstName', required: true },
    { key: 'last_name', labelKey: 'students.lastName', required: true },
    { key: 'gender', labelKey: 'common.gender', type: 'select', options: [
      { value: 'male', labelKey: 'common.male' }, { value: 'female', labelKey: 'common.female' }, { value: 'other', labelKey: 'common.other' }
    ] },
    { key: 'date_of_birth', labelKey: 'students.dob', type: 'date' },
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup },
    { key: 'guardian_name', labelKey: 'students.guardian' },
    { key: 'guardian_phone', labelKey: 'students.guardianPhone' },
    { key: 'guardian_email', labelKey: 'students.guardianEmail' },
    { key: 'address', labelKey: 'students.address', span: 2 },
    { key: 'status', labelKey: 'common.status', type: 'select', defaultValue: 'active', options: statusOptions(t) }
  ],
  filters: [
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup },
    { key: 'status', labelKey: 'common.status', options: statusOptions(t) }
  ]
});

export const teacherConfig = (t) => ({
  resource: 'teachers',
  titleKey: 'teachers.title',
  subtitleKey: 'teachers.subtitle',
  writePermission: 'teachers.manage',
  canCreate: false,
  canDelete: false,
  createLabelKey: 'teachers.add',
  columns: [
    { key: 'full_name', label: t('common.name'), render: personCell },
    { key: 'staff_number', label: t('teachers.staffNumber'), render: (row) => <span className="pf-mono">{row.staff_number || '—'}</span> },
    { key: 'specialization', label: t('teachers.specialization'), render: (row) => row.specialization || '—' },
    { key: 'qualification', label: t('teachers.qualification'), render: (row) => row.qualification || '—' },
    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
  ],
  formFields: [
    { key: 'staff_number', labelKey: 'teachers.staffNumber' },
    { key: 'qualification', labelKey: 'teachers.qualification' },
    { key: 'specialization', labelKey: 'teachers.specialization' },
    { key: 'employment_date', labelKey: 'teachers.employmentDate', type: 'date' },
    { key: 'status', labelKey: 'common.status', type: 'select', defaultValue: 'active', options: statusOptions(t) }
  ],
  filters: [{ key: 'status', labelKey: 'common.status', options: statusOptions(t) }]
});

export const classConfig = (t) => ({
  resource: 'classes',
  titleKey: 'classes.title',
  subtitleKey: 'classes.subtitle',
  writePermission: 'classes.manage',
  createLabelKey: 'classes.add',
  columns: [
    { key: 'name', label: t('common.name'), render: (row) => <span className="pf-cell-strong">{row.name}</span> },
    { key: 'stream', label: t('classes.stream'), render: (row) => row.stream || '—' },
    { key: 'level', label: t('classes.level'), render: (row) => row.level || '—' },
    { key: 'teacher_name', label: t('classes.classTeacher'), render: (row) => row.teacher_name || '—' },
    { key: 'student_count', label: t('classes.studentCount'), align: 'right' },
    { key: 'subject_count', label: t('classes.subjectCount'), align: 'right' }
  ],
  formFields: [
    { key: 'name', labelKey: 'common.name', required: true },
    { key: 'stream', labelKey: 'classes.stream' },
    { key: 'level', labelKey: 'classes.level' },
    { key: 'class_size', labelKey: 'classes.classSize', type: 'number' },
    { key: 'academic_year', labelKey: 'common.year' },
    { key: 'teacher_id', labelKey: 'classes.classTeacher', lookup: teacherLookup }
  ],
  filters: [{ key: 'teacher_id', labelKey: 'classes.classTeacher', lookup: teacherLookup }]
});

export const subjectConfig = (t) => ({
  resource: 'subjects',
  titleKey: 'subjects.title',
  subtitleKey: 'subjects.subtitle',
  writePermission: 'subjects.manage',
  createLabelKey: 'subjects.add',
  columns: [
    { key: 'name', label: t('common.name'), render: (row) => <span className="pf-cell-strong">{row.name}</span> },
    { key: 'code', label: t('subjects.code'), render: (row) => <span className="pf-mono">{row.code || '—'}</span> },
    { key: 'category', label: t('common.category'), render: (row) => row.category || '—' },
    { key: 'class_count', label: t('subjects.classCount'), align: 'right' },
    { key: 'school_name', label: t('common.school'), render: (row) => row.school_name || t('common.all') }
  ],
  formFields: [
    { key: 'name', labelKey: 'common.name', required: true },
    { key: 'code', labelKey: 'subjects.code' },
    { key: 'category', labelKey: 'common.category' },
    { key: 'description', labelKey: 'common.description', type: 'textarea', span: 2 }
  ],
  filters: []
});

export const assessmentConfig = (t) => ({
  resource: 'assessments',
  titleKey: 'assessment.title',
  subtitleKey: 'assessment.subtitle',
  writePermission: 'assessments.manage',
  createLabelKey: 'assessment.add',
  columns: [
    { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
    { key: 'class_name', label: t('common.class') },
    { key: 'subject_name', label: t('common.subject') },
    { key: 'type', label: t('common.type'), render: (row) => <Badge value={row.type} tone="brand">{row.type || '—'}</Badge> },
    { key: 'assessment_date', label: t('assessment.date'), render: (row) => formatDate(row.assessment_date) },
    { key: 'submission_count', label: t('assessment.submissions'), align: 'right' },
    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
  ],
  formFields: [
    { key: 'title', labelKey: 'common.title', required: true, span: 2 },
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup, required: true },
    { key: 'subject_id', labelKey: 'common.subject', lookup: subjectLookup, required: true },
    { key: 'term_id', labelKey: 'common.term', lookup: termLookup },
    { key: 'type', labelKey: 'common.type', type: 'select', defaultValue: 'test', options: [
      { value: 'quiz', label: 'Quiz' }, { value: 'test', label: 'Test' }, { value: 'exam', label: 'Exam' },
      { value: 'assignment', label: 'Assignment' }, { value: 'project', label: 'Project' }
    ] },
    { key: 'total_marks', labelKey: 'assessment.totalMarks', type: 'number', defaultValue: 100 },
    { key: 'weight', labelKey: 'assessment.weight', type: 'number' },
    { key: 'assessment_date', labelKey: 'assessment.date', type: 'date' },
    { key: 'due_date', labelKey: 'assessment.due', type: 'date' },
    { key: 'duration_minutes', labelKey: 'assessment.duration', type: 'number' },
    { key: 'status', labelKey: 'common.status', type: 'select', defaultValue: 'draft', options: [
      { value: 'draft', labelKey: 'common.draft' }, { value: 'published', labelKey: 'common.published' },
      { value: 'closed', label: 'Closed' }
    ] },
    { key: 'description', labelKey: 'common.description', type: 'textarea', span: 2 }
  ],
  filters: [
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup },
    { key: 'subject_id', labelKey: 'common.subject', lookup: subjectLookup },
    { key: 'status', labelKey: 'common.status', options: [
      { value: 'draft', labelKey: 'common.draft' }, { value: 'published', labelKey: 'common.published' }, { value: 'closed', label: 'Closed' }
    ] }
  ]
});

export const diaryConfig = (t) => ({
  resource: 'diary',
  titleKey: 'diary.title',
  subtitleKey: 'diary.subtitle',
  writePermission: 'diary.manage',
  createLabelKey: 'diary.add',
  columns: [
    { key: 'lesson_date', label: t('diary.lessonDate'), render: (row) => formatDate(row.lesson_date) },
    { key: 'class_name', label: t('common.class') },
    { key: 'subject_name', label: t('common.subject') },
    { key: 'topic', label: t('diary.topic'), render: (row) => <span className="pf-cell-strong">{row.topic}</span> },
    { key: 'teacher_name', label: t('common.teacher') },
    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
  ],
  formFields: [
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup, required: true },
    { key: 'subject_id', labelKey: 'common.subject', lookup: subjectLookup, required: true },
    { key: 'lesson_date', labelKey: 'diary.lessonDate', type: 'date', required: true },
    { key: 'topic', labelKey: 'diary.topic', required: true },
    { key: 'activities', labelKey: 'diary.activities', type: 'textarea', span: 2 },
    { key: 'homework', labelKey: 'diary.homework', type: 'textarea', span: 2 },
    { key: 'reflection', labelKey: 'diary.reflection', type: 'textarea', span: 2 },
    { key: 'status', labelKey: 'common.status', type: 'select', defaultValue: 'published', options: [
      { value: 'draft', labelKey: 'common.draft' }, { value: 'published', labelKey: 'common.published' }
    ] }
  ],
  filters: [
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup },
    { key: 'subject_id', labelKey: 'common.subject', lookup: subjectLookup }
  ]
});

export const lessonPlanConfig = (t) => ({
  resource: 'lesson-plans',
  titleKey: 'planner.title',
  subtitleKey: 'planner.subtitle',
  canCreate: false,
  canEdit: false,
  canDelete: false,
  columns: [
    { key: 'lesson_title', label: t('planner.lesson'), render: (row) => <span className="pf-cell-strong">{row.lesson_title}</span> },
    { key: 'class_name', label: t('common.class') },
    { key: 'subject_name', label: t('common.subject') },
    { key: 'teacher_name', label: t('common.teacher') },
    { key: 'teaching_date', label: t('planner.teachingDate'), render: (row) => formatDate(row.teaching_date) },
    { key: 'is_completed', label: t('common.status'), render: (row) => <Badge value={row.is_completed ? 'approved' : 'pending'}>{row.is_completed ? t('common.approved') : t('common.pending')}</Badge> }
  ],
  formFields: [],
  filters: [
    { key: 'class_id', labelKey: 'common.class', lookup: classLookup },
    { key: 'subject_id', labelKey: 'common.subject', lookup: subjectLookup }
  ]
});

export const cpdActivityConfig = (t) => ({
  resource: 'cpd',
  titleKey: 'cpd.activities',
  subtitleKey: 'cpd.subtitle',
  writePermission: 'cpd.manage',
  createLabelKey: 'cpd.addActivity',
  columns: [
    { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
    { key: 'provider', label: t('cpd.provider') },
    { key: 'start_date', label: t('cpd.start'), render: (row) => formatDate(row.start_date) },
    { key: 'end_date', label: t('cpd.end'), render: (row) => formatDate(row.end_date) },
    { key: 'hours', label: t('cpd.hours'), align: 'right' },
    { key: 'enrollment_count', label: t('cpd.enrolled'), align: 'right' },
    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
  ],
  formFields: [
    { key: 'title', labelKey: 'common.title', required: true, span: 2 },
    { key: 'provider', labelKey: 'cpd.provider' },
    { key: 'hours', labelKey: 'cpd.hours', type: 'number' },
    { key: 'start_date', labelKey: 'cpd.start', type: 'date' },
    { key: 'end_date', labelKey: 'cpd.end', type: 'date' },
    { key: 'status', labelKey: 'common.status', type: 'select', defaultValue: 'published', options: [
      { value: 'draft', labelKey: 'common.draft' }, { value: 'published', labelKey: 'common.published' }, { value: 'closed', label: 'Closed' }
    ] },
    { key: 'description', labelKey: 'common.description', type: 'textarea', span: 2 }
  ],
  filters: [{ key: 'status', labelKey: 'common.status', options: [
    { value: 'draft', labelKey: 'common.draft' }, { value: 'published', labelKey: 'common.published' }, { value: 'closed', label: 'Closed' }
  ] }]
});

export const portfolioConfig = (t) => ({
  resource: 'portfolio',
  titleKey: 'cpd.portfolio',
  subtitleKey: 'cpd.subtitle',
  writePermission: 'portfolio.manage',
  createLabelKey: 'cpd.addPortfolio',
  columns: [
    { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
    { key: 'category', label: t('common.category') },
    { key: 'user_name', label: t('common.teacher') },
    { key: 'achieved_on', label: t('cpd.achievedOn'), render: (row) => formatDate(row.achieved_on) },
    { key: 'evidence_url', label: t('cpd.evidence'), render: (row) => row.evidence_url ? <a className="pf-link" href={row.evidence_url} target="_blank" rel="noreferrer">{t('common.view')}</a> : '—' }
  ],
  formFields: [
    { key: 'title', labelKey: 'common.title', required: true, span: 2 },
    { key: 'category', labelKey: 'common.category' },
    { key: 'achieved_on', labelKey: 'cpd.achievedOn', type: 'date' },
    { key: 'evidence_url', labelKey: 'cpd.evidence', span: 2 },
    { key: 'description', labelKey: 'common.description', type: 'textarea', span: 2 }
  ],
  filters: []
});
