import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, Award, BarChart3, BookOpen, Building2, CalendarClock,
  CheckCircle2, ClipboardList, GraduationCap, Library, RefreshCw, School, Sparkles,
  UserCheck, Users, Clock3, BookMarked
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, BarList, Badge, Button, Card, DataTable, Donut, EmptyState, PageHeader,
  Progress, Spinner, StatCard, formatDate, formatDateTime, formatTime, useApi
} from '../ui';

const num = (value) => Number(value || 0);

const DashboardPage = () => {
  const { t, role, user, school, isSuperAdmin, hasPermission } = usePlatform();
  const { data, loading, error, reload } = useApi(() => platform.overview(), []);
  const overview = data?.data;

  const greetingName = String(user?.full_name || '').split(' ')[0] || '';
  const attendance = overview?.stats?.attendance_today;
  const attendanceRate = num(attendance?.rate);

  if (loading) return <Spinner label={t('common.loading')} />;
  if (error) {
    return (
      <>
        <PageHeader title={t('common.dashboard')} subtitle={t('dash.overview')} />
        <Alert>{error.message}</Alert>
        <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
      </>
    );
  }

  const quickActions = [
    hasPermission('marks.enter') && { to: '/app/marks', label: t('marks.enter'), icon: ClipboardList },
    hasPermission('attendance.record') && { to: '/app/attendance', label: t('attendance.record'), icon: UserCheck },
    hasPermission('diary.manage') && { to: '/app/diary', label: t('diary.add'), icon: CalendarClock },
    hasPermission('library.manage') && { to: '/app/library', label: t('library.addResource'), icon: Library },
    hasPermission('students.manage') && { to: '/app/students', label: t('students.add'), icon: GraduationCap },
    hasPermission('reports.view') && { to: '/app/reports', label: t('reports.title'), icon: BarChart3 },
    hasPermission('ai_assistant.use') && { to: '/app/ai-assistant', label: t('ai.title'), icon: Sparkles },
    hasPermission('users.manage') && { to: '/app/users', label: t('users.add'), icon: Users }
  ].filter(Boolean).slice(0, 6);

  const tasks = overview?.tasks || [];
  const upcoming = overview?.upcoming || [];
  const recent = overview?.recent_activity || [];

  return (
    <>
      <PageHeader
        title={`${t('dash.welcome')}${greetingName ? `, ${greetingName}` : ''}`}
        subtitle={overview?.school?.school_name || school?.name
          ? `${role(overview?.role || user?.role)} · ${overview?.school?.school_name || school?.name}`
          : t('dash.overview')}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
        }
      />

      {isSuperAdmin && !overview?.school ? (
        <SuperAdminStats overview={overview} t={t} />
      ) : overview?.role === 'teacher' || overview?.role === 'hod' ? (
        <TeacherStats overview={overview} t={t} attendance={attendance} attendanceRate={attendanceRate} />
      ) : overview?.role === 'student' ? (
        <StudentStats overview={overview} t={t} />
      ) : overview?.role === 'parent' ? (
        <ParentStats overview={overview} t={t} />
      ) : overview?.role === 'librarian' ? (
        <LibrarianStats overview={overview} t={t} />
      ) : (
        <ManagerStats overview={overview} t={t} attendance={attendance} attendanceRate={attendanceRate} />
      )}

      <div className="pf-dash-grid">
        <div className="pf-dash-main">
          {(overview?.charts?.enrollment?.length > 0 || overview?.performance_by_class?.length > 0) ? (
            <div className="pf-grid" style={{ '--pf-cols': 2 }}>
              {overview?.charts?.enrollment?.length > 0 ? (
                <Card title={t('dash.enrollment')}>
                  <BarList items={overview.charts.enrollment} emptyLabel={t('common.noData')} />
                </Card>
              ) : null}
              {(overview?.performance_by_class?.length > 0 || overview?.charts?.performance?.length > 0) ? (
                <Card title={t('dash.performance')}>
                  <BarList
                    items={overview.performance_by_class || overview.charts.performance}
                    valueFormatter={(v) => `${v}%`}
                    emptyLabel={t('common.noData')}
                    tone="info"
                  />
                </Card>
              ) : null}
            </div>
          ) : null}

          {overview?.role === 'teacher' || overview?.role === 'hod' ? (
            <TeacherPanels overview={overview} t={t} />
          ) : null}
          {overview?.role === 'student' ? <StudentPanels overview={overview} t={t} /> : null}
          {overview?.role === 'parent' ? <ParentPanels overview={overview} t={t} /> : null}
          {overview?.role === 'librarian' ? <LibrarianPanels overview={overview} t={t} /> : null}
          {isSuperAdmin && !overview?.school ? <SuperAdminPanels overview={overview} t={t} /> : null}
          {!['teacher', 'hod', 'student', 'parent', 'librarian'].includes(overview?.role) && !(isSuperAdmin && !overview?.school) ? (
            <ManagerPanels overview={overview} t={t} />
          ) : null}

          {quickActions.length > 0 ? (
            <Card title={t('dash.quickActions')}>
              <div className="pf-quick-actions">
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="pf-quick-action">
                    <span className="pf-quick-action__icon"><action.icon size={18} /></span>
                    <span>{action.label}</span>
                    <ArrowRight size={14} className="pf-quick-action__arrow" />
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="pf-dash-side">
          <Card title={t('dash.tasks')}>
            {tasks.length === 0 ? (
              <EmptyState title={t('dash.noTasks')} />
            ) : (
              <ul className="pf-task-list">
                {tasks.map((task, index) => (
                  <li key={`${task.title}-${index}`}>
                    <Link to={task.link || '/app/dashboard'} className="pf-task">
                      <span className="pf-task__icon"><AlertCircle size={15} /></span>
                      <span className="pf-task__text">{task.title}</span>
                      <strong>{task.count}{task.unit || ''}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('dash.upcoming')}>
            {upcoming.length === 0 ? (
              <EmptyState title={t('dash.noEvents')} />
            ) : (
              <ul className="pf-event-list">
                {upcoming.map((event) => (
                  <li key={`${event.kind}-${event.id}`} className="pf-event">
                    <span className={`pf-event__kind pf-event__kind--${event.kind}`}>
                      {event.kind === 'cpd' ? <Award size={14} /> : <ClipboardList size={14} />}
                    </span>
                    <div className="pf-event__body">
                      <span className="pf-event__title">{event.title}</span>
                      <span className="pf-event__meta">{event.context || ''} · {formatDate(event.event_date)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('dash.recentActivity')}>
            {recent.length === 0 ? (
              <EmptyState title={t('dash.noActivity')} />
            ) : (
              <ul className="pf-activity-list">
                {recent.slice(0, 8).map((item) => (
                  <li key={item.id} className="pf-activity">
                    <span className="pf-activity__dot" />
                    <div>
                      <p className="pf-activity__title">
                        {String(item.action || '').replace(/\./g, ' · ')}
                      </p>
                      <p className="pf-activity__meta">
                        {item.user_name || 'System'} · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */

const AttendanceCard = ({ attendance, rate, t }) => {
  if (!attendance) return null;
  return (
    <Card title={t('dash.attendanceToday')}>
      <div className="pf-attendance">
        <div className="pf-attendance__ring">
          <Donut items={[
            { label: t('common.present'), value: num(attendance.present) },
            { label: t('common.late'), value: num(attendance.late) },
            { label: t('common.absent'), value: num(attendance.absent) },
            { label: t('common.excused'), value: num(attendance.excused) }
          ]} />
        </div>
        <div className="pf-attendance__summary">
          <span className="pf-attendance__rate">{rate}%</span>
          <span className="pf-muted">{t('common.rate')} · {num(attendance.total)} {t('common.rows')}</span>
          <div className="pf-attendance__pills">
            <span className="pf-pill pf-pill--success">{t('common.present')} {num(attendance.present)}</span>
            <span className="pf-pill pf-pill--warning">{t('common.late')} {num(attendance.late)}</span>
            <span className="pf-pill pf-pill--danger">{t('common.absent')} {num(attendance.absent)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const ManagerStats = ({ overview, t, attendance, attendanceRate }) => {
  const stats = overview?.stats || {};
  return (
    <div className="pf-stats-grid">
      <StatCard label={t('common.students')} value={num(stats.students)} icon={GraduationCap} />
      <StatCard label={t('common.teachers')} value={num(stats.teachers)} icon={UserCheck} tone="info" />
      <StatCard label={t('common.classes')} value={num(stats.classes)} icon={School} tone="success" />
      <StatCard label={t('dash.attendanceToday')} value={`${attendanceRate}%`} hint={`${num(attendance?.total)} ${t('common.rows')}`}
                icon={CheckCircle2} tone={attendanceRate >= 85 ? 'success' : 'warning'} />
      <StatCard label={t('marks.awaiting')} value={num(stats.pending_marks)} icon={ClipboardList}
                tone={num(stats.pending_marks) > 0 ? 'warning' : 'brand'} />
      <StatCard label={t('common.library')} value={num(stats.library_resources)} icon={Library} tone="info" />
    </div>
  );
};

const TeacherStats = ({ overview, t, attendance, attendanceRate }) => (
  <>
    <div className="pf-stats-grid">
      <StatCard label={t('dash.myClasses')} value={num(overview.my_class_count)} icon={School} />
      <StatCard label={t('dash.myStudents')} value={num(overview.my_student_count)} icon={GraduationCap} tone="info" />
      <StatCard label={t('planner.title')} value={num(overview.counts?.lesson_plans)} icon={BookOpen} tone="success" />
      <StatCard label={t('diary.title')} value={num(overview.counts?.diary_entries)} icon={CalendarClock} />
      <StatCard label={t('marks.awaiting')} value={num(overview.counts?.draft_marks)} icon={ClipboardList}
                tone={num(overview.counts?.draft_marks) > 0 ? 'warning' : 'brand'} />
      <StatCard label={t('dash.attendanceToday')} value={`${attendanceRate}%`} icon={CheckCircle2}
                tone={attendanceRate >= 85 ? 'success' : 'warning'} />
    </div>
    <div className="pf-grid" style={{ '--pf-cols': 2 }}>
      {attendance ? <AttendanceCard attendance={attendance} rate={attendanceRate} t={t} /> : null}
      <Card title={t('dash.todayTimetable')}>
        {(overview.today_timetable || []).length === 0 ? (
          <EmptyState title={t('dash.noTimetable')} />
        ) : (
          <ul className="pf-timetable-list">
            {overview.today_timetable.map((slot) => (
              <li key={slot.id} className="pf-timetable-item">
                <span className="pf-timetable-item__time">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                <div>
                  <strong>{slot.subject_name}</strong>
                  <small>{slot.class_name}{slot.room ? ` · ${slot.room}` : ''}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  </>
);

const StudentStats = ({ overview, t }) => (
  <div className="pf-stats-grid">
    <StatCard label={t('common.attendance')} value={overview.attendance ? `${num(overview.attendance.rate)}%` : '—'}
              icon={UserCheck} tone={num(overview.attendance?.rate) >= 85 ? 'success' : 'warning'} />
    <StatCard label={t('common.average')} value={overview.performance?.average != null ? `${overview.performance.average}%` : '—'}
              icon={BarChart3} tone="info" />
    <StatCard label={t('assessment.title')} value={(overview.assessments || []).length} icon={ClipboardList} />
    <StatCard label={t('dash.activeLoans')} value={(overview.loans || []).length} icon={BookMarked} tone="warning" />
  </div>
);

const ParentStats = ({ overview, t }) => (
  <div className="pf-stats-grid">
    <StatCard label={t('dash.children')} value={num(overview.child_count)} icon={GraduationCap} />
    {(overview.children || []).slice(0, 3).map((child) => (
      <StatCard key={child.id} label={child.full_name}
                value={child.average != null ? `${child.average}%` : '—'}
                hint={`${child.class_name || ''} · ${t('common.attendance')} ${num(child.attendance_rate)}%`}
                icon={BarChart3} tone={num(child.attendance_rate) >= 85 ? 'success' : 'warning'} />
    ))}
  </div>
);

const LibrarianStats = ({ overview, t }) => (
  <div className="pf-stats-grid">
    <StatCard label={t('dash.resources')} value={num(overview.resources)} icon={Library} />
    <StatCard label={t('dash.copies')} value={num(overview.copies)} icon={BookOpen} tone="info" />
    <StatCard label={t('dash.available')} value={num(overview.available)} icon={CheckCircle2} tone="success" />
    <StatCard label={t('dash.activeLoans')} value={num(overview.borrowed)} icon={BookMarked} tone="warning" />
    <StatCard label={t('dash.overdueLoans')} value={num(overview.overdue)} icon={AlertCircle}
              tone={num(overview.overdue) > 0 ? 'danger' : 'success'} />
    <StatCard label={t('common.returned')} value={num(overview.returned)} icon={CheckCircle2} tone="info" />
  </div>
);

const SuperAdminStats = ({ overview, t }) => (
  <div className="pf-stats-grid">
    <StatCard label={t('dash.schools')} value={num(overview.schools)} icon={Building2} />
    <StatCard label={t('dash.schoolsActive')} value={num(overview.schools_active)} icon={CheckCircle2} tone="success" />
    <StatCard label={t('common.pending')} value={num(overview.schools_pending)} icon={ClockIcon}
              tone={num(overview.schools_pending) > 0 ? 'warning' : 'info'} />
    <StatCard label={t('dash.pendingRegistrations')} value={num(overview.pending_registrations)} icon={Users}
              tone={num(overview.pending_registrations) > 0 ? 'warning' : 'brand'} />
    <StatCard label={t('common.users')} value={(overview.users_by_role || []).reduce((a, r) => a + num(r.value), 0)}
              icon={Users} tone="info" />
    <StatCard label={t('dash.database')} value={`${num(overview.system_health?.tables)}`}
              hint={t('dash.tables')} icon={CheckCircle2} tone="success" />
  </div>
);

const ClockIcon = Clock3;

/* ------------------------------------------------------------------ */

const TeacherPanels = ({ overview, t }) => (
  <div className="pf-grid" style={{ '--pf-cols': 2 }}>
    <Card title={t('dash.myClasses')} action={<Link className="pf-link" to="/app/classes">{t('common.view')}</Link>}>
      {(overview.my_classes || []).length === 0 ? (
        <EmptyState title={t('dash.noClasses')} />
      ) : (
        <ul className="pf-class-list">
          {overview.my_classes.map((cls) => (
            <li key={cls.id} className="pf-class-item">
              <span className="pf-class-item__badge">{cls.name}</span>
              <div>
                <strong>{cls.name} {cls.stream ? `· ${cls.stream}` : ''}</strong>
                <small>{num(cls.student_count)} {t('common.students')} · {cls.level || ''}</small>
              </div>
              <Link to="/app/students" className="pf-mini-link">{t('common.view')}</Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
    <Card title={t('dash.recentMarks')}>
      <DataTable
        rows={overview.recent_marks || []}
        emptyTitle={t('common.noData')}
        columns={[
          { key: 'student_name', label: t('common.student'), render: (row) => <span className="pf-cell-strong">{row.student_name}</span> },
          { key: 'subject_name', label: t('common.subject') },
          { key: 'score', label: t('common.score'), align: 'right', render: (row) => `${row.score}/${row.max_score}` },
          { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
        ]}
      />
    </Card>
  </div>
);

const StudentPanels = ({ overview, t }) => (
  <div className="pf-grid" style={{ '--pf-cols': 2 }}>
    <Card title={t('dash.todayTimetable')}>
      {(overview.timetable || []).length === 0 ? (
        <EmptyState title={t('dash.noTimetable')} />
      ) : (
        <ul className="pf-timetable-list">
          {overview.timetable.map((slot) => (
            <li key={slot.id} className="pf-timetable-item">
              <span className="pf-timetable-item__time">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
              <div>
                <strong>{slot.subject_name}</strong>
                <small>{slot.teacher_name || ''}{slot.room ? ` · ${slot.room}` : ''}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
    <Card title={t('dash.recentMarks')}>
      <DataTable
        rows={overview.recent_marks || []}
        emptyTitle={t('common.noData')}
        columns={[
          { key: 'subject_name', label: t('common.subject'), render: (row) => <span className="pf-cell-strong">{row.subject_name}</span> },
          { key: 'score', label: t('common.score'), align: 'right', render: (row) => `${row.score}/${row.max_score}` },
          { key: 'grade', label: t('common.grade'), align: 'center', render: (row) => <Badge value={row.grade} tone="brand">{row.grade}</Badge> },
          { key: 'approved_at', label: t('common.date'), render: (row) => formatDate(row.approved_at) }
        ]}
      />
    </Card>
    <Card title={t('assessment.title')}>
      <DataTable
        rows={overview.assessments || []}
        emptyTitle={t('common.noData')}
        columns={[
          { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
          { key: 'subject_name', label: t('common.subject') },
          { key: 'assessment_date', label: t('common.date'), render: (row) => formatDate(row.assessment_date) }
        ]}
      />
    </Card>
    <Card title={t('dash.activeLoans')}>
      <DataTable
        rows={overview.loans || []}
        emptyTitle={t('common.noData')}
        columns={[
          { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
          { key: 'due_at', label: t('library.dueAt'), render: (row) => formatDate(row.due_at) },
          { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
        ]}
      />
    </Card>
  </div>
);

const ParentPanels = ({ overview, t }) => (
  <div className="pf-grid" style={{ '--pf-cols': 2 }}>
    <Card title={t('dash.children')}>
      <DataTable
        rows={overview.children || []}
        emptyTitle={t('dash.noChildren')}
        columns={[
          { key: 'full_name', label: t('common.student'), render: (row) => <span className="pf-cell-strong">{row.full_name}</span> },
          { key: 'class_name', label: t('common.class') },
          {
            key: 'attendance_rate', label: t('common.attendance'),
            render: (row) => `${num(row.attendance_rate)}%`
          },
          {
            key: 'average', label: t('common.average'),
            render: (row) => row.average != null ? `${row.average}%` : '—'
          }
        ]}
      />
    </Card>
    <Card title={t('notifications.announcements')}>
      {(overview.announcements || []).length === 0 ? (
        <EmptyState title={t('common.noData')} />
      ) : (
        <ul className="pf-announcement-list">
          {overview.announcements.map((item) => (
            <li key={item.id} className="pf-announcement">
              <div className="pf-announcement__head">
                <strong>{item.title}</strong>
                <Badge value={item.priority} />
              </div>
              <p>{item.body}</p>
              <small>{formatDateTime(item.published_at)}</small>
            </li>
          ))}
        </ul>
      )}
    </Card>
  </div>
);

const LibrarianPanels = ({ overview, t }) => (
  <div className="pf-grid" style={{ '--pf-cols': 2 }}>
    <Card title={t('dash.categories')}>
      <BarList items={(overview.categories || []).map((c) => ({ label: c.category || 'Uncategorised', value: Number(c.count) }))}
               emptyLabel={t('common.noData')} />
    </Card>
    <Card title={t('dash.activeLoans')}>
      <DataTable
        rows={overview.recent_loans || []}
        emptyTitle={t('common.noData')}
        columns={[
          { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
          { key: 'borrower_name', label: t('library.borrower') },
          { key: 'due_at', label: t('library.dueAt'), render: (row) => formatDate(row.due_at) },
          { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
        ]}
      />
    </Card>
  </div>
);

const SuperAdminPanels = ({ overview, t }) => (
  <div className="pf-grid" style={{ '--pf-cols': 2 }}>
    <Card title={t('dash.usersByRole')}>
      <BarList items={overview.users_by_role || []} emptyLabel={t('common.noData')} />
    </Card>
    <Card title={t('dash.moduleUsage')}>
      <BarList items={overview.module_usage || []} emptyLabel={t('common.noData')} tone="info" />
    </Card>
    <Card title={t('dash.systemHealth')}>
      <div className="pf-health">
        <div className="pf-health__item">
          <span className="pf-health__icon is-ok"><CheckCircle2 size={17} /></span>
          <div><strong>{t('dash.database')}</strong><small>{t('dash.connected')} · {num(overview.system_health?.tables)} {t('dash.tables')}</small></div>
        </div>
        <div className="pf-health__item">
          <span className="pf-health__icon is-ok"><CheckCircle2 size={17} /></span>
          <div><strong>{t('dash.api')}</strong><small>{t('dash.operational')}</small></div>
        </div>
        <div className="pf-health__item">
          <span className="pf-health__icon"><Clock3 size={17} /></span>
          <div><strong>{t('platform.lastChecked')}</strong><small>{formatDateTime(overview.system_health?.checked_at)}</small></div>
        </div>
      </div>
    </Card>
    <Card title={t('dash.schools')}>
      <BarList items={overview.schools_by_province || []} emptyLabel={t('common.noData')} tone="success" />
    </Card>
    <Card title={t('dash.recentActivity')}>
      <ul className="pf-activity-list">
        {(overview.recent_activity || []).map((item) => (
          <li key={item.id} className="pf-activity">
            <span className="pf-activity__dot" />
            <div>
              <p className="pf-activity__title">{String(item.action || '').replace(/\./g, ' · ')}</p>
              <p className="pf-activity__meta">{item.user_name || 'System'} · {item.school_name || ''} · {formatDateTime(item.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  </div>
);

const ManagerPanels = ({ overview, t }) => (
  <div className="pf-grid" style={{ '--pf-cols': 2 }}>
    <Card title={t('dash.performance')}>
      <BarList items={overview.performance_by_class || []} valueFormatter={(v) => `${v}%`}
               emptyLabel={t('common.noData')} tone="info" />
    </Card>
    <Card title={t('dash.recentActivity')} action={<Link className="pf-link" to="/app/audit">{t('common.view')}</Link>}>
      {(overview.recent_activity || []).length === 0 ? (
        <EmptyState title={t('dash.noActivity')} />
      ) : (
        <ul className="pf-activity-list">
          {overview.recent_activity.slice(0, 8).map((item) => (
            <li key={item.id} className="pf-activity">
              <span className="pf-activity__dot" />
              <div>
                <p className="pf-activity__title">{String(item.action || '').replace(/\./g, ' · ')}</p>
                <p className="pf-activity__meta">{item.user_name || 'System'} · {formatDateTime(item.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
    {(overview.staff_activity || []).length > 0 ? (
      <Card title={t('teachers.title')}>
        <DataTable
          rows={overview.staff_activity}
          rowKey="label"
          columns={[
            { key: 'label', label: t('common.teacher'), render: (row) => <span className="pf-cell-strong">{row.label}</span> },
            { key: 'plans', label: t('planner.title'), align: 'right' },
            { key: 'diary', label: t('diary.title'), align: 'right' }
          ]}
        />
      </Card>
    ) : null}
  </div>
);

export default DashboardPage;
