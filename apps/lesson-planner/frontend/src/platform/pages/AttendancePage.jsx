import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Plus, RefreshCw, Save, Users } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, EmptyState, Field, IconButton, Input, Modal,
  PageHeader, Pagination, Select, Tabs, Textarea, formatDate, formatTime, useApi
} from '../ui';
import './pages.css';

const today = () => new Date().toISOString().slice(0, 10);

const STUDENT_STATUSES = ['present', 'absent', 'late', 'excused'];
const TEACHER_STATUSES = ['present', 'absent', 'late', 'excused', 'on_leave'];

const AttendancePage = () => {
  const { t, hasPermission } = usePlatform();
  const [tab, setTab] = useState('students');
  const canRecord = hasPermission('attendance.record') || hasPermission('attendance.manage');
  const canManageTeachers = hasPermission('attendance.manage') || hasPermission('attendance.record');

  return (
    <>
      <PageHeader
        title={t('attendance.title')}
        subtitle={t('attendance.subtitle')}
        actions={<Badge value="active" tone="brand">{t('attendance.date')}: {formatDate(today())}</Badge>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'students', label: t('attendance.studentsTab'), icon: Users },
          { value: 'teachers', label: t('attendance.teachersTab'), icon: CalendarCheck2 }
        ]}
      />
      {tab === 'students' ? (
        <StudentAttendance canRecord={canRecord} t={t} />
      ) : (
        <TeacherAttendance canManage={canManageTeachers} t={t} />
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */

const StudentAttendance = ({ canRecord, t }) => {
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const { data: classData } = useApi(() => platform.list('classes', { limit: 300 }), []);
  const classes = classData?.data || [];

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(String(classes[0].id));
  }, [classes, classId]);

  const { data: studentData, loading: studentsLoading, reload: reloadStudents } = useApi(
    () => (classId ? platform.list('students', { class_id: classId, status: 'active', limit: 300 }) : Promise.resolve({ data: [] })),
    [classId]
  );
  const students = studentData?.data || [];

  const { data: existingData, reload: reloadExisting } = useApi(
    () => (classId ? platform.list('attendance', { class_id: classId, date_from: date, date_to: date, limit: 300 }) : Promise.resolve({ data: [] })),
    [classId, date]
  );
  const existing = existingData?.data || [];

  useEffect(() => {
    const next = {};
    students.forEach((student) => {
      const found = existing.find((row) => Number(row.student_id) === Number(student.id));
      next[student.id] = {
        status: found?.status || 'present',
        notes: found?.notes || ''
      };
    });
    setRecords(next);
    setMessage(null);
  }, [students, existing]);

  const summary = useMemo(() => {
    const values = Object.values(records);
    return STUDENT_STATUSES.reduce((acc, status) => {
      acc[status] = values.filter((r) => r.status === status).length;
      return acc;
    }, {});
  }, [records]);

  const setStatus = (studentId, status) =>
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));

  const setEvery = (status) => {
    setRecords((prev) => {
      const next = {};
      Object.keys(prev).forEach((id) => { next[id] = { ...prev[id], status }; });
      return next;
    });
  };

  const save = async () => {
    if (!classId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = Object.entries(records).map(([studentId, record]) => ({
        student_id: Number(studentId),
        status: record.status,
        notes: record.notes || null
      }));
      const response = await platform.bulkAttendance({
        class_id: Number(classId),
        attendance_date: date,
        records: payload
      });
      setMessage(response.message || 'Attendance saved.');
      reloadExisting();
      reloadStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-stack">
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Field label={t('common.class')} style={{ minWidth: 190 }}>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}{cls.stream ? ` · ${cls.stream}` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('attendance.date')}>
            <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {canRecord && students.length > 0 ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEvery('present')}>{t('common.present')} · {t('common.all')}</Button>
              <Button variant="secondary" size="sm" onClick={() => setEvery('absent')}>{t('common.absent')} · {t('common.all')}</Button>
            </>
          ) : null}
          {canRecord ? (
            <Button icon={Save} onClick={save} disabled={saving || !students.length}>
              {saving ? t('common.saving') : t('attendance.save')}
            </Button>
          ) : null}
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
      </Card>

      <div className="pf-stats-grid">
        {STUDENT_STATUSES.map((status) => (
          <div key={status} className="pf-stat">
            <div className="pf-stat__body">
              <span className="pf-stat__label">{t(`common.${status}`)}</span>
              <span className="pf-stat__value">{summary[status] || 0}</span>
            </div>
          </div>
        ))}
      </div>

      <Card title={`${t('attendance.record')} · ${students.length} ${t('common.students')}`}
            subtitle={t('attendance.already')}>
        {studentsLoading ? (
          <p className="pf-muted">{t('common.loading')}</p>
        ) : students.length === 0 ? (
          <EmptyState title={t('common.noData')} hint={classId ? t('attendance.hint') : t('common.select')} />
        ) : (
          <div className="pf-table-wrap">
            <table className="pf-table pf-entry-table">
              <thead>
                <tr>
                  <th>{t('common.student')}</th>
                  <th>{t('students.admission')}</th>
                  <th style={{ width: 360 }}>{t('common.status')}</th>
                  <th>{t('common.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const record = records[student.id] || { status: 'present', notes: '' };
                  return (
                    <tr key={student.id}>
                      <td className="pf-cell-strong">{student.full_name}</td>
                      <td className="pf-mono">{student.admission_number}</td>
                      <td>
                        <div className="pf-inline">
                          {STUDENT_STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`pf-pill ${record.status === status ? 'is-selected' : ''}`}
                              disabled={!canRecord}
                              onClick={() => setStatus(student.id, status)}
                            >
                              {t(`common.${status}`)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Input
                          value={record.notes}
                          disabled={!canRecord}
                          placeholder={t('common.optional')}
                          onChange={(e) => setRecords((prev) => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], notes: e.target.value }
                          }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const TeacherAttendance = ({ canManage, t }) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (status) p.status = status;
    if (from) p.date_from = from;
    if (to) p.date_to = to;
    return p;
  }, [page, status, from, to]);

  const { data, loading, error: loadError, reload } = useApi(
    () => platform.list('teacher-attendance', params),
    [JSON.stringify(params)]
  );
  const { data: teacherData } = useApi(() => platform.list('teachers', { limit: 300 }), []);
  const teachers = teacherData?.data || [];

  const rows = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: rows.length };

  const openCreate = () => {
    setForm({ teacher_id: '', attendance_date: today(), status: 'present', check_in: '', check_out: '', notes: '' });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.teacher_id) throw new Error('Select a staff member.');
      await platform.create('teacher-attendance', {
        ...form,
        teacher_id: Number(form.teacher_id),
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        notes: form.notes || null
      });
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-stack">
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t('common.status')}>
            <option value="">{t('common.all')} · {t('common.status')}</option>
            {TEACHER_STATUSES.map((s) => <option key={s} value={s}>{t(`common.${s}`) === `common.${s}` ? s.replace('_', ' ') : t(`common.${s}`)}</option>)}
          </Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label={t('common.from')} />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label={t('common.to')} />
          <span className="pf-spacer" />
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          {canManage ? <Button icon={Plus} onClick={openCreate}>{t('attendance.record')}</Button> : null}
        </div>
        {loadError ? <Alert>{loadError.message}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              { key: 'teacher_name', label: t('attendance.teacher'), render: (row) => <span className="pf-cell-strong">{row.teacher_name}</span> },
              { key: 'attendance_date', label: t('attendance.date'), render: (row) => formatDate(row.attendance_date) },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              { key: 'check_in', label: t('attendance.checkIn'), render: (row) => formatTime(row.check_in) },
              { key: 'check_out', label: t('attendance.checkOut'), render: (row) => formatTime(row.check_out) },
              { key: 'notes', label: t('common.notes'), render: (row) => row.notes || '—' }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={t('attendance.record')}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          </>
        }
      >
        {formError ? <Alert>{formError}</Alert> : null}
        <div className="pf-form-grid">
          <Field label={t('attendance.teacher')} required span={2}>
            <Select value={form.teacher_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, teacher_id: e.target.value }))}>
              <option value="">{t('common.select')}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.user_id}>{teacher.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('attendance.date')} required>
            <Input type="date" value={form.attendance_date || ''} onChange={(e) => setForm((prev) => ({ ...prev, attendance_date: e.target.value }))} />
          </Field>
          <Field label={t('common.status')} required>
            <Select value={form.status || 'present'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              {TEACHER_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label={t('attendance.checkIn')}>
            <Input type="time" value={form.check_in || ''} onChange={(e) => setForm((prev) => ({ ...prev, check_in: e.target.value }))} />
          </Field>
          <Field label={t('attendance.checkOut')}>
            <Input type="time" value={form.check_out || ''} onChange={(e) => setForm((prev) => ({ ...prev, check_out: e.target.value }))} />
          </Field>
          <Field label={t('common.notes')} span={2}>
            <Textarea value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
