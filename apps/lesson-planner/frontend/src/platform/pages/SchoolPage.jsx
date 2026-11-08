import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, RefreshCw, School, Save } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, EmptyState, Field, Input, Modal, PageHeader,
  Select, Tabs, Textarea, formatDate, useApi
} from '../ui';
import './pages.css';

const emptyYear = () => ({ name: '', start_date: '', end_date: '', is_current: false });
const emptyTerm = () => ({ academic_year_id: '', name: '', start_date: '', end_date: '', is_current: false });

const SchoolPage = () => {
  const { t, hasPermission, school, isSuperAdmin } = usePlatform();
  const [tab, setTab] = useState('profile');
  const canManage = hasPermission('school.manage');

  return (
    <>
      <PageHeader
        title={t('school.title')}
        subtitle={t('school.subtitle')}
        actions={<Badge value="active" tone="brand"><School size={13} /> {school?.name || ''}</Badge>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'profile', label: t('school.profile'), icon: School },
          { value: 'years', label: t('school.academicYears'), icon: CalendarDays },
          { value: 'terms', label: t('school.terms'), icon: CalendarDays }
        ]}
      />
      {tab === 'profile' ? <SchoolProfile canManage={canManage} t={t} /> : null}
      {tab === 'years' ? <AcademicYears canManage={canManage} t={t} /> : null}
      {tab === 'terms' ? <Terms canManage={canManage} t={t} /> : null}
    </>
  );
};

/* ------------------------------------------------------------------ */

const SchoolProfile = ({ canManage, t }) => {
  const { school, isSuperAdmin, reload: reloadPlatform } = usePlatform();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const { data, loading, error: loadError, reload } = useApi(
    () => platform.schools({ limit: 100 }),
    []
  );

  const rows = data?.data || [];
  const record = useMemo(() => {
    if (!rows.length) return null;
    if (school?.id) return rows.find((r) => r.id === school.id) || rows[0];
    return rows[0];
  }, [rows, school?.id]);

  useEffect(() => {
    if (record) {
      setForm({
        name: record.name || '',
        school_type: record.school_type || 'secondary',
        ownership: record.ownership || 'public',
        district: record.district || '',
        province: record.province || '',
        sector: record.sector || '',
        cell: record.cell || '',
        address: record.address || '',
        phone: record.phone || '',
        email: record.email || '',
        website: record.website || '',
        logo_url: record.logo_url || '',
        motto: record.motto || '',
        subscription_plan: record.subscription_plan || 'trial',
        max_users: record.max_users ?? 500
      });
    }
  }, [record]);

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (!record) throw new Error('No school selected.');
      const payload = { ...form, max_users: Number(form.max_users) || 500 };
      await platform.updateSchool(record.id, payload);
      setMessage(t('common.saved'));
      reload();
      reloadPlatform?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card><p className="pf-muted">{t('common.loading')}</p></Card>;
  if (loadError) return <Alert>{loadError.message}</Alert>;
  if (!record || !form) return <Card><EmptyState title={t('common.noData')} hint={t('common.select')} /></Card>;

  return (
    <div className="pf-stack">
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Card title={t('school.profile')} subtitle={`${record.code || ''} · ${record.status || ''}`}
            action={
              <div className="pf-inline">
                <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
                {canManage ? (
                  <Button icon={Save} onClick={submit} disabled={saving}>
                    {saving ? t('common.saving') : t('common.save')}
                  </Button>
                ) : null}
              </div>
            }>
        <div className="pf-form-grid">
          <Field label={t('common.name')} required span={2}>
            <Input value={form.name} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </Field>
          <Field label={t('school.type')}>
            <Select value={form.school_type} disabled={!canManage}
                    onChange={(e) => setForm((prev) => ({ ...prev, school_type: e.target.value }))}>
              <option value="nursery">Nursery</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="tvet">TVET</option>
              <option value="combined">Combined</option>
            </Select>
          </Field>
          <Field label={t('school.ownership')}>
            <Select value={form.ownership} disabled={!canManage}
                    onChange={(e) => setForm((prev) => ({ ...prev, ownership: e.target.value }))}>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="government-aided">Government aided</option>
              <option value="faith-based">Faith based</option>
            </Select>
          </Field>
          <Field label={t('school.district')}>
            <Input value={form.district} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))} />
          </Field>
          <Field label={t('school.province')}>
            <Input value={form.province} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))} />
          </Field>
          <Field label={t('school.sector')}>
            <Input value={form.sector} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))} />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </Field>
          <Field label={t('common.email')}>
            <Input type="email" value={form.email} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </Field>
          <Field label={t('school.logo')}>
            <Input value={form.logo_url} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))} />
          </Field>
          <Field label={t('schools.plan')}>
            <Select value={form.subscription_plan} disabled={!canManage}
                    onChange={(e) => setForm((prev) => ({ ...prev, subscription_plan: e.target.value }))}>
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </Select>
          </Field>
          <Field label={t('schools.users')}>
            <Input type="number" min="1" value={form.max_users} disabled={!canManage}
                   onChange={(e) => setForm((prev) => ({ ...prev, max_users: e.target.value }))} />
          </Field>
          <Field label={t('common.notes')} span={2}>
            <Textarea value={form.motto} disabled={!canManage}
                      onChange={(e) => setForm((prev) => ({ ...prev, motto: e.target.value }))} />
          </Field>
        </div>
      </Card>

      <div className="pf-stats-grid">
        <div className="pf-stat"><div className="pf-stat__body">
          <span className="pf-stat__label">{t('common.students')}</span>
          <span className="pf-stat__value">{record.students ?? 0}</span>
        </div></div>
        <div className="pf-stat"><div className="pf-stat__body">
          <span className="pf-stat__label">{t('common.teachers')}</span>
          <span className="pf-stat__value">{record.teachers ?? 0}</span>
        </div></div>
        <div className="pf-stat"><div className="pf-stat__body">
          <span className="pf-stat__label">{t('common.classes')}</span>
          <span className="pf-stat__value">{record.classes ?? 0}</span>
        </div></div>
        <div className="pf-stat"><div className="pf-stat__body">
          <span className="pf-stat__label">{t('common.users')}</span>
          <span className="pf-stat__value">{record.users ?? 0}</span>
        </div></div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const AcademicYears = ({ canManage, t }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyYear());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data, loading, error, reload } = useApi(() => platform.list('academic-years', { limit: 100 }), []);
  const rows = data?.data || [];

  const openCreate = () => { setForm(emptyYear()); setFormError(null); setModal({ mode: 'create' }); };
  const openEdit = (row) => {
    setForm({
      name: row.name || '',
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : '',
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : '',
      is_current: Boolean(row.is_current)
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.name) throw new Error('Name is required.');
      const payload = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_current: form.is_current ? 1 : 0
      };
      if (modal.mode === 'create') await platform.create('academic-years', payload);
      else await platform.update('academic-years', modal.row.id, payload);
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
          {canManage ? <Button icon={Plus} onClick={openCreate}>{t('school.addYear')}</Button> : null}
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              { key: 'name', label: t('common.name'), render: (row) => <span className="pf-cell-strong">{row.name}</span> },
              { key: 'start_date', label: t('school.start'), render: (row) => formatDate(row.start_date) },
              { key: 'end_date', label: t('school.end'), render: (row) => formatDate(row.end_date) },
              { key: 'term_count', label: t('school.terms'), align: 'right' },
              { key: 'is_current', label: t('common.status'), render: (row) => <Badge value={row.is_current ? 'active' : 'inactive'}>{row.is_current ? t('school.current') : t('common.inactive')}</Badge> },
              ...(canManage ? [{
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
              }] : [])
            ]}
          />
        </div>
      </Card>

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('school.academicYears')}` : t('school.addYear')}
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
          <Field label={t('common.name')} required span={2}>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="2026-2027" />
          </Field>
          <Field label={t('school.start')}>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          </Field>
          <Field label={t('school.end')}>
            <Input type="date" value={form.end_date} onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))} />
          </Field>
          <Field label={t('school.current')}>
            <Select value={form.is_current ? '1' : '0'} onChange={(e) => setForm((prev) => ({ ...prev, is_current: e.target.value === '1' }))}>
              <option value="0">{t('common.no')}</option>
              <option value="1">{t('common.yes')}</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Terms = ({ canManage, t }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyTerm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data, loading, error, reload } = useApi(() => platform.list('terms', { limit: 200 }), []);
  const { data: yearData } = useApi(() => platform.list('academic-years', { limit: 100 }), []);
  const rows = data?.data || [];
  const years = yearData?.data || [];

  const openCreate = () => {
    const current = years.find((y) => y.is_current) || years[0];
    setForm({ ...emptyTerm(), academic_year_id: current ? String(current.id) : '' });
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      academic_year_id: row.academic_year_id ?? '',
      name: row.name || '',
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : '',
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : '',
      is_current: Boolean(row.is_current)
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.academic_year_id || !form.name) throw new Error('Academic year and term name are required.');
      const payload = {
        ...form,
        academic_year_id: Number(form.academic_year_id),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_current: form.is_current ? 1 : 0
      };
      if (modal.mode === 'create') await platform.create('terms', payload);
      else await platform.update('terms', modal.row.id, payload);
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
          {canManage ? <Button icon={Plus} onClick={openCreate}>{t('school.addTerm')}</Button> : null}
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              { key: 'name', label: t('common.name'), render: (row) => <span className="pf-cell-strong">{row.name}</span> },
              { key: 'academic_year_name', label: t('common.year') },
              { key: 'start_date', label: t('school.start'), render: (row) => formatDate(row.start_date) },
              { key: 'end_date', label: t('school.end'), render: (row) => formatDate(row.end_date) },
              { key: 'is_current', label: t('common.status'), render: (row) => <Badge value={row.is_current ? 'active' : 'inactive'}>{row.is_current ? t('school.current') : t('common.inactive')}</Badge> },
              ...(canManage ? [{
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
              }] : [])
            ]}
          />
        </div>
      </Card>

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('school.terms')}` : t('school.addTerm')}
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
          <Field label={t('common.year')} required span={2}>
            <Select value={form.academic_year_id} onChange={(e) => setForm((prev) => ({ ...prev, academic_year_id: e.target.value }))}>
              <option value="">{t('common.select')}</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.name')} required span={2}>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Term 1" />
          </Field>
          <Field label={t('school.start')}>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          </Field>
          <Field label={t('school.end')}>
            <Input type="date" value={form.end_date} onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))} />
          </Field>
          <Field label={t('school.current')}>
            <Select value={form.is_current ? '1' : '0'} onChange={(e) => setForm((prev) => ({ ...prev, is_current: e.target.value === '1' }))}>
              <option value="0">{t('common.no')}</option>
              <option value="1">{t('common.yes')}</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default SchoolPage;
