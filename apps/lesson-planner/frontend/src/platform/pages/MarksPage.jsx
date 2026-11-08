import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, ClipboardList, Lock, Plus, RefreshCw, RotateCcw, Search, Unlock
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, Field, IconButton, Input, Modal, PageHeader,
  Pagination, Select, Textarea, formatDate, useApi, useDebounced
} from '../ui';
import './pages.css';

const MarksPage = () => {
  const { t, hasPermission } = usePlatform();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [lookups, setLookups] = useState({ classes: [], subjects: [], students: [], terms: [], assessments: [] });
  const debouncedQuery = useDebounced(query, 350);
  const canEnter = hasPermission('marks.enter');
  const canApprove = hasPermission('marks.approve');
  const canLock = hasPermission('marks.lock');

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (debouncedQuery.trim()) p.q = debouncedQuery.trim();
    if (classId) p.class_id = classId;
    if (subjectId) p.subject_id = subjectId;
    if (status) p.status = status;
    return p;
  }, [page, debouncedQuery, classId, subjectId, status]);

  const { data, loading, error, reload } = useApi(
    () => platform.list('marks', params),
    [JSON.stringify(params)]
  );

  useEffect(() => {
    Promise.all([
      platform.list('classes', { limit: 300 }),
      platform.list('subjects', { limit: 300 }),
      platform.list('students', { limit: 300, status: 'active' }),
      platform.list('terms', { limit: 50 }),
      platform.list('assessments', { limit: 300 })
    ]).then(([classes, subjects, students, terms, assessments]) => {
      setLookups({
        classes: classes.data || [],
        subjects: subjects.data || [],
        students: students.data || [],
        terms: terms.data || [],
        assessments: assessments.data || []
      });
    }).catch(() => {});
  }, []);

  const rows = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: rows.length };

  const openCreate = () => {
    setForm({
      class_id: '', subject_id: '', student_id: '', assessment_id: '',
      term_id: lookups.terms.find((term) => term.is_current)?.id || '',
      score: '', max_score: 100, remarks: '', status: 'submitted'
    });
    setFormError(null);
    setModalOpen(true);
  };

  const filteredStudents = lookups.students.filter(
    (student) => !form.class_id || String(student.class_id) === String(form.class_id)
  );
  const filteredAssessments = lookups.assessments.filter(
    (assessment) => (!form.class_id || String(assessment.class_id) === String(form.class_id)) &&
      (!form.subject_id || String(assessment.subject_id) === String(form.subject_id))
  );

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.student_id || !form.class_id || !form.subject_id || form.score === '') {
        throw new Error('Student, class, subject and score are required.');
      }
      await platform.create('marks', {
        ...form,
        score: Number(form.score),
        max_score: Number(form.max_score) || 100,
        assessment_id: form.assessment_id || null,
        term_id: form.term_id || null
      });
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = async (action, id) => {
    try {
      if (action === 'approve') await platform.approveMark(id);
      if (action === 'lock') await platform.lockMark(id);
      if (action === 'reopen') await platform.reopenMark(id);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title={t('marks.title')}
        subtitle={t('marks.subtitle')}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
            {canEnter ? <Button icon={Plus} onClick={openCreate}>{t('marks.add')}</Button> : null}
          </>
        }
      />

      {!canApprove && canEnter ? <Alert tone="info">{t('marks.entryHint')}</Alert> : null}
      {error ? <Alert>{error.message}</Alert> : null}

      <Card padded={false}>
        <div className="pf-filter-bar" style={{ padding: '14px 16px 0' }}>
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                   placeholder={t('common.search')} aria-label={t('common.search')} />
          </div>
          <Select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} aria-label={t('common.class')}>
            <option value="">{t('common.all')} · {t('common.class')}</option>
            {lookups.classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </Select>
          <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }} aria-label={t('common.subject')}>
            <option value="">{t('common.all')} · {t('common.subject')}</option>
            {lookups.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t('common.status')}>
            <option value="">{t('common.all')} · {t('common.status')}</option>
            <option value="draft">{t('common.draft')}</option>
            <option value="submitted">{t('common.submitted')}</option>
            <option value="approved">{t('common.approved')}</option>
            <option value="locked">{t('common.locked')}</option>
          </Select>
        </div>

        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              {
                key: 'student_name', label: t('common.student'),
                render: (row) => (
                  <div>
                    <span className="pf-cell-strong">{row.student_name}</span>
                    <div className="pf-text-small pf-mono">{row.admission_number}</div>
                  </div>
                )
              },
              { key: 'class_name', label: t('common.class') },
              { key: 'subject_name', label: t('common.subject') },
              {
                key: 'score', label: t('common.score'), align: 'right',
                render: (row) => <span className="pf-cell-strong">{row.score} / {row.max_score}</span>
              },
              { key: 'grade', label: t('common.grade'), align: 'center', render: (row) => <Badge value={row.grade} tone="brand">{row.grade}</Badge> },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              { key: 'approved_by_name', label: t('marks.approvedBy'), render: (row) => row.approved_by_name || '—' },
              { key: 'created_at', label: t('common.date'), render: (row) => formatDate(row.created_at) },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    {canApprove && row.status !== 'approved' && row.status !== 'locked' ? (
                      <IconButton label={t('marks.approve')} icon={CheckCircle2} onClick={() => lifecycle('approve', row.id)} />
                    ) : null}
                    {canLock && row.status === 'approved' ? (
                      <IconButton label={t('marks.lock')} icon={Lock} onClick={() => lifecycle('lock', row.id)} />
                    ) : null}
                    {canLock && row.status === 'locked' ? (
                      <IconButton label={t('marks.reopen')} icon={RotateCcw} onClick={() => lifecycle('reopen', row.id)} />
                    ) : null}
                  </div>
                )
              }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={t('marks.add')}
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
          <Field label={t('common.class')} required>
            <Select value={form.class_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value, student_id: '', assessment_id: '' }))}>
              <option value="">{t('common.select')}</option>
              {lookups.classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.subject')} required>
            <Select value={form.subject_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, subject_id: e.target.value, assessment_id: '' }))}>
              <option value="">{t('common.select')}</option>
              {lookups.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.student')} required span={2}>
            <Select value={form.student_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, student_id: e.target.value }))}>
              <option value="">{form.class_id ? t('marks.selectStudent') : t('common.class') + ' …'}</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>{student.full_name} · {student.admission_number}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('marks.assessment')}>
            <Select value={form.assessment_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, assessment_id: e.target.value }))}>
              <option value="">{t('common.none')}</option>
              {filteredAssessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
            </Select>
          </Field>
          <Field label={t('common.term')}>
            <Select value={form.term_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, term_id: e.target.value }))}>
              <option value="">{t('common.none')}</option>
              {lookups.terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.score')} required>
            <Input type="number" min="0" step="0.01" value={form.score ?? ''}
                   onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))} />
          </Field>
          <Field label={t('marks.maxScore')}>
            <Input type="number" min="1" value={form.max_score ?? 100}
                   onChange={(e) => setForm((prev) => ({ ...prev, max_score: e.target.value }))} />
          </Field>
          <Field label={t('marks.remarks')} span={2}>
            <Textarea value={form.remarks || ''} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </>
  );
};

export default MarksPage;
