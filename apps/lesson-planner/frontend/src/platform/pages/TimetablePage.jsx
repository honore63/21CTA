import { useMemo, useState } from 'react';
import { CalendarClock, LayoutGrid, List, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, EmptyState, Field, IconButton, Input, Modal,
  PageHeader, Pagination, Select, Tabs, formatTime, useApi
} from '../ui';
import './pages.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = () => ({
  class_id: '', subject_id: '', teacher_id: '', day_of_week: 'Monday',
  start_time: '08:00', end_time: '09:00', room: '', academic_year: ''
});

const TimetablePage = () => {
  const { t, hasPermission } = usePlatform();
  const [view, setView] = useState('grid');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const canManage = hasPermission('timetable.manage');

  const listParams = useMemo(() => {
    const p = { limit: 400 };
    if (classId) p.class_id = classId;
    if (teacherId) p.teacher_id = teacherId;
    return p;
  }, [classId, teacherId]);

  const { data, loading, error, reload } = useApi(
    () => platform.list('timetable', listParams),
    [JSON.stringify(listParams)]
  );

  const { data: classData } = useApi(() => platform.list('classes', { limit: 300 }), []);
  const { data: subjectData } = useApi(() => platform.list('subjects', { limit: 300 }), []);
  const { data: teacherData } = useApi(() => platform.list('teachers', { limit: 300 }), []);
  const classes = classData?.data || [];
  const subjects = subjectData?.data || [];
  const teachers = teacherData?.data || [];

  const slots = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: slots.length };

  const byDay = useMemo(() => {
    const map = {};
    DAYS.forEach((day) => { map[day] = []; });
    slots.forEach((slot) => {
      if (!map[slot.day_of_week]) map[slot.day_of_week] = [];
      map[slot.day_of_week].push(slot);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    return map;
  }, [slots]);

  const openCreate = () => {
    setForm({ ...emptyForm(), class_id: classId || '', teacher_id: teacherId || '' });
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (slot) => {
    setForm({
      class_id: slot.class_id ?? '',
      subject_id: slot.subject_id ?? '',
      teacher_id: slot.teacher_id ?? '',
      day_of_week: slot.day_of_week || 'Monday',
      start_time: String(slot.start_time || '').slice(0, 5),
      end_time: String(slot.end_time || '').slice(0, 5),
      room: slot.room || '',
      academic_year: slot.academic_year || ''
    });
    setFormError(null);
    setModal({ mode: 'edit', row: slot });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.class_id || !form.subject_id) throw new Error('Class and subject are required.');
      if (!form.start_time || !form.end_time) throw new Error('Start and end times are required.');
      if (form.end_time <= form.start_time) throw new Error('End time must be after start time.');
      const payload = {
        ...form,
        class_id: Number(form.class_id),
        subject_id: Number(form.subject_id),
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null
      };
      if (modal.mode === 'create') await platform.create('timetable', payload);
      else await platform.update('timetable', modal.row.id, payload);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slot) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await platform.remove('timetable', slot.id);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title={t('timetable.title')}
        subtitle={t('timetable.subtitle')}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
            {canManage ? <Button icon={Plus} onClick={openCreate}>{t('timetable.add')}</Button> : null}
          </>
        }
      />

      {error ? <Alert>{error.message}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('common.class')}>
            <option value="">{t('common.all')} · {t('common.class')}</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}{cls.stream ? ` · ${cls.stream}` : ''}</option>)}
          </Select>
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} aria-label={t('common.teacher')}>
            <option value="">{t('common.all')} · {t('common.teacher')}</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.user_id}>{teacher.full_name}</option>)}
          </Select>
        </div>
      </Card>

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { value: 'grid', label: t('timetable.grid'), icon: LayoutGrid },
          { value: 'list', label: t('timetable.list'), icon: List, count: slots.length }
        ]}
      />

      {view === 'grid' ? (
        <Card
          title={t('timetable.grid')}
          subtitle={`${slots.length} ${t('common.rows')}`}
          action={<CalendarClock size={17} className="pf-muted" />}
        >
          {loading ? (
            <p className="pf-muted">{t('common.loading')}</p>
          ) : slots.length === 0 ? (
            <EmptyState title={t('common.noData')} hint={t('timetable.subtitle')} />
          ) : (
            <div className="pf-week-grid">
              <div className="pf-week-grid__head" />
              {DAYS.map((day) => (
                <div key={day} className="pf-week-grid__head">
                  {t(`timetable.${day.toLowerCase()}`) === `timetable.${day.toLowerCase()}` ? day : t(`timetable.${day.toLowerCase()}`)}
                </div>
              ))}
              {DAYS.map((day) => (
                <div key={`col-${day}`} style={{ display: 'contents' }}>
                  <div className="pf-week-grid__time">
                    {byDay[day]?.length ? `${byDay[day].length} ${t('common.count').toLowerCase()}` : '—'}
                  </div>
                  {(byDay[day]?.length ? byDay[day] : [null]).map((slot, index) => (
                    <div key={slot ? slot.id : `${day}-empty`} className={`pf-week-cell ${slot ? 'pf-week-cell--filled' : ''}`}>
                      {slot ? (
                        <>
                          <strong>{slot.subject_name}</strong>
                          <small>{slot.class_name}</small>
                          <small>{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</small>
                          {slot.room ? <small>{slot.room}</small> : null}
                          {canManage ? (
                            <div className="pf-week-cell__actions">
                              <button type="button" className="pf-mini-link" onClick={() => openEdit(slot)}>{t('common.edit')}</button>
                              <button type="button" className="pf-mini-link pf-mini-link--danger" onClick={() => remove(slot)}>{t('common.delete')}</button>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="pf-muted">{t('timetable.empty')}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card padded={false}>
          <div style={{ padding: '14px 16px 16px' }}>
            <DataTable
              rows={slots}
              loading={loading}
              emptyTitle={t('common.noData')}
              columns={[
                { key: 'day_of_week', label: t('timetable.day') },
                { key: 'start_time', label: t('timetable.start'), render: (row) => formatTime(row.start_time) },
                { key: 'end_time', label: t('timetable.end'), render: (row) => formatTime(row.end_time) },
                { key: 'class_name', label: t('common.class'), render: (row) => <span className="pf-cell-strong">{row.class_name}</span> },
                { key: 'subject_name', label: t('common.subject') },
                { key: 'teacher_name', label: t('common.teacher'), render: (row) => row.teacher_name || '—' },
                { key: 'room', label: t('timetable.room'), render: (row) => row.room || '—' },
                ...(canManage ? [{
                  key: '__actions', label: t('common.actions'), align: 'right',
                  render: (row) => (
                    <div className="pf-table__actions">
                      <IconButton label={t('common.edit')} icon={Pencil} onClick={() => openEdit(row)} />
                      <IconButton label={t('common.delete')} icon={Trash2} onClick={() => remove(row)} />
                    </div>
                  )
                }] : [])
              ]}
            />
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('timetable.title')}` : t('timetable.add')}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          </>
        }
      >
        {formError ? <Alert>{formError}</Alert> : null}
        <div className="pf-form-grid">
          <Field label={t('common.class')} required>
            <Select value={form.class_id} onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}>
              <option value="">{t('common.select')}</option>
              {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}{cls.stream ? ` · ${cls.stream}` : ''}</option>)}
            </Select>
          </Field>
          <Field label={t('common.subject')} required>
            <Select value={form.subject_id} onChange={(e) => setForm((prev) => ({ ...prev, subject_id: e.target.value }))}>
              <option value="">{t('common.select')}</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.teacher')}>
            <Select value={form.teacher_id} onChange={(e) => setForm((prev) => ({ ...prev, teacher_id: e.target.value }))}>
              <option value="">{t('common.none')}</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.user_id}>{teacher.full_name}</option>)}
            </Select>
          </Field>
          <Field label={t('timetable.day')} required>
            <Select value={form.day_of_week} onChange={(e) => setForm((prev) => ({ ...prev, day_of_week: e.target.value }))}>
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {t(`timetable.${day.toLowerCase()}`) === `timetable.${day.toLowerCase()}` ? day : t(`timetable.${day.toLowerCase()}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('timetable.start')} required>
            <Input type="time" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} />
          </Field>
          <Field label={t('timetable.end')} required>
            <Input type="time" value={form.end_time} onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))} />
          </Field>
          <Field label={t('timetable.room')}>
            <Input value={form.room} onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))} />
          </Field>
          <Field label={t('common.year')}>
            <Input value={form.academic_year} onChange={(e) => setForm((prev) => ({ ...prev, academic_year: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </>
  );
};

export default TimetablePage;
