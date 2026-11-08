import { useMemo, useState } from 'react';
import {
  Award, BookOpenCheck, CheckCircle2, Plus, RefreshCw, Search, UserPlus
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, EmptyState, Field, Input, Modal,
  PageHeader, Pagination, Select, Tabs, Textarea, formatDate, useApi, useDebounced
} from '../ui';
import './pages.css';

const emptyActivity = () => ({
  title: '', provider: '', hours: '', start_date: '', end_date: '', status: 'published', description: ''
});

const emptyPortfolio = () => ({
  title: '', category: '', achieved_on: '', evidence_url: '', description: ''
});

const CpdPage = () => {
  const { t, hasPermission } = usePlatform();
  const [tab, setTab] = useState('activities');
  const canManage = hasPermission('cpd.manage');
  const canPortfolio = hasPermission('portfolio.manage');

  return (
    <>
      <PageHeader
        title={t('cpd.title')}
        subtitle={t('cpd.subtitle')}
        actions={<Badge value="approved" tone="brand"><Award size={13} /> CPD</Badge>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'activities', label: t('cpd.activities'), icon: BookOpenCheck },
          { value: 'enrollments', label: t('cpd.enrollments'), icon: CheckCircle2 },
          { value: 'portfolio', label: t('cpd.portfolio'), icon: Award }
        ]}
      />
      {tab === 'activities' ? <Activities canManage={canManage} t={t} /> : null}
      {tab === 'enrollments' ? <Enrollments canManage={canManage} t={t} /> : null}
      {tab === 'portfolio' ? <Portfolio canEdit={canPortfolio} t={t} /> : null}
    </>
  );
};

/* ------------------------------------------------------------------ */

const Activities = ({ canManage, t }) => {
  const { user } = usePlatform();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyActivity());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const debouncedQuery = useDebounced(query, 350);

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (debouncedQuery.trim()) p.q = debouncedQuery.trim();
    if (status) p.status = status;
    return p;
  }, [page, debouncedQuery, status]);

  const { data, loading, error, reload } = useApi(
    () => platform.list('cpd', params),
    [JSON.stringify(params)]
  );
  const { data: enrollmentData, reload: reloadEnrollments } = useApi(
    () => platform.list('cpd-enrollments', { limit: 300, user_id: user?.id }),
    [user?.id]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };
  const myEnrollments = enrollmentData?.data || [];

  const enroll = async (activity) => {
    setNotice(null);
    try {
      await platform.create('cpd-enrollments', {
        cpd_activity_id: activity.id,
        user_id: user.id,
        status: 'enrolled'
      });
      setNotice(t('common.saved'));
      reloadEnrollments();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const openCreate = () => {
    setForm(emptyActivity());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      ...emptyActivity(),
      ...row,
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : '',
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : ''
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.title) throw new Error('Title is required.');
      const payload = {
        ...form,
        hours: form.hours === '' ? null : Number(form.hours),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        description: form.description || null
      };
      if (modal.mode === 'create') await platform.create('cpd', payload);
      else await platform.update('cpd', modal.row.id, payload);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-stack">
      {error ? <Alert>{error.message}</Alert> : null}
      {notice ? <Alert tone={notice === t('common.saved') ? 'success' : 'error'}>{notice}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t('common.search')} />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t('common.status')}>
            <option value="">{t('common.all')} · {t('common.status')}</option>
            <option value="draft">{t('common.draft')}</option>
            <option value="published">{t('common.published')}</option>
            <option value="closed">Closed</option>
          </Select>
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          {canManage ? <Button icon={Plus} onClick={openCreate}>{t('cpd.addActivity')}</Button> : null}
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              {
                key: 'title', label: t('common.title'),
                render: (row) => (
                  <div>
                    <span className="pf-cell-strong">{row.title}</span>
                    <div className="pf-text-small">{row.provider || '—'}</div>
                  </div>
                )
              },
              { key: 'start_date', label: t('cpd.start'), render: (row) => formatDate(row.start_date) },
              { key: 'end_date', label: t('cpd.end'), render: (row) => formatDate(row.end_date) },
              { key: 'hours', label: t('cpd.hours'), align: 'right', render: (row) => row.hours ?? '—' },
              { key: 'enrollment_count', label: t('cpd.enrolled'), align: 'right' },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => {
                  const enrolled = myEnrollments.some((e) => Number(e.cpd_activity_id) === Number(row.id));
                  return (
                    <div className="pf-table__actions">
                      {enrolled ? (
                        <Badge value="approved">{t('common.enrolled')}</Badge>
                      ) : row.status === 'published' ? (
                        <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => enroll(row)}>
                          {t('cpd.enrolled')}
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
                      ) : null}
                    </div>
                  );
                }
              }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('cpd.activities')}` : t('cpd.addActivity')}
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
          <Field label={t('common.title')} required span={2}>
            <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </Field>
          <Field label={t('cpd.provider')}>
            <Input value={form.provider} onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))} />
          </Field>
          <Field label={t('cpd.hours')}>
            <Input type="number" min="0" step="0.5" value={form.hours}
                   onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))} />
          </Field>
          <Field label={t('cpd.start')}>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          </Field>
          <Field label={t('cpd.end')}>
            <Input type="date" value={form.end_date} onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))} />
          </Field>
          <Field label={t('common.status')}>
            <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="draft">{t('common.draft')}</option>
              <option value="published">{t('common.published')}</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <Field label={t('common.description')} span={2}>
            <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Enrollments = ({ canManage, t }) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (status) p.status = status;
    return p;
  }, [page, status]);

  const { data, loading, error, reload } = useApi(
    () => platform.list('cpd-enrollments', params),
    [JSON.stringify(params)]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };

  const complete = async (row) => {
    try {
      await platform.update('cpd-enrollments', row.id, {
        status: 'completed',
        completed_at: new Date().toISOString().slice(0, 10)
      });
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div className="pf-stack">
      {error ? <Alert>{error.message}</Alert> : null}
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t('common.status')}>
            <option value="">{t('common.all')} · {t('common.status')}</option>
            <option value="enrolled">{t('cpd.enrolled')}</option>
            <option value="completed">{t('cpd.completed')}</option>
          </Select>
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              { key: 'activity_title', label: t('cpd.activities'), render: (row) => <span className="pf-cell-strong">{row.activity_title}</span> },
              ...(canManage ? [{ key: 'user_name', label: t('common.teacher'), render: (row) => row.user_name || '—' }] : []),
              { key: 'start_date', label: t('cpd.start'), render: (row) => formatDate(row.start_date) },
              { key: 'hours', label: t('cpd.hours'), align: 'right', render: (row) => row.hours ?? '—' },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              { key: 'completed_at', label: t('cpd.completed'), render: (row) => row.completed_at ? formatDate(row.completed_at) : '—' },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    {row.status !== 'completed' ? (
                      <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => complete(row)}>
                        {t('cpd.complete')}
                      </Button>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Portfolio = ({ canEdit, t }) => {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyPortfolio());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data, loading, error, reload } = useApi(
    () => platform.list('portfolio', { page, limit: 20 }),
    [page]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };

  const openCreate = () => {
    setForm(emptyPortfolio());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      ...emptyPortfolio(),
      ...row,
      achieved_on: row.achieved_on ? String(row.achieved_on).slice(0, 10) : ''
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.title) throw new Error('Title is required.');
      const payload = {
        ...form,
        achieved_on: form.achieved_on || null,
        evidence_url: form.evidence_url || null,
        description: form.description || null
      };
      if (modal.mode === 'create') await platform.create('portfolio', payload);
      else await platform.update('portfolio', modal.row.id, payload);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-stack">
      {error ? <Alert>{error.message}</Alert> : null}
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <span className="pf-spacer" />
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          {canEdit ? <Button icon={Plus} onClick={openCreate}>{t('cpd.addPortfolio')}</Button> : null}
        </div>
      </Card>

      {rows.length === 0 && !loading ? (
        <Card><EmptyState title={t('common.noData')} hint={t('cpd.subtitle')} /></Card>
      ) : (
        <Card padded={false}>
          <div style={{ padding: '14px 16px 16px' }}>
            <DataTable
              rows={rows}
              loading={loading}
              emptyTitle={t('common.noData')}
              columns={[
                { key: 'title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.title}</span> },
                { key: 'category', label: t('common.category'), render: (row) => row.category || '—' },
                { key: 'user_name', label: t('common.teacher'), render: (row) => row.user_name || '—' },
                { key: 'achieved_on', label: t('cpd.achievedOn'), render: (row) => formatDate(row.achieved_on) },
                {
                  key: 'evidence_url', label: t('cpd.evidence'),
                  render: (row) => row.evidence_url
                    ? <a className="pf-link" href={row.evidence_url} target="_blank" rel="noreferrer">{t('common.view')}</a>
                    : '—'
                },
                ...(canEdit ? [{
                  key: '__actions', label: t('common.actions'), align: 'right',
                  render: (row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
                }] : [])
              ]}
            />
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('cpd.portfolio')}` : t('cpd.addPortfolio')}
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
          <Field label={t('common.title')} required span={2}>
            <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </Field>
          <Field label={t('common.category')}>
            <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
          </Field>
          <Field label={t('cpd.achievedOn')}>
            <Input type="date" value={form.achieved_on} onChange={(e) => setForm((prev) => ({ ...prev, achieved_on: e.target.value }))} />
          </Field>
          <Field label={t('cpd.evidence')} span={2}>
            <Input value={form.evidence_url} onChange={(e) => setForm((prev) => ({ ...prev, evidence_url: e.target.value }))} />
          </Field>
          <Field label={t('common.description')} span={2}>
            <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default CpdPage;
