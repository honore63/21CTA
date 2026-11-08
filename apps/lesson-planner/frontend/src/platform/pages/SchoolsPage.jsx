import { useMemo, useState } from 'react';
import {
  Building2, CheckCircle2, Pencil, Plus, RefreshCw, Search, ShieldOff, Users
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, Field, IconButton, Input, Modal, PageHeader,
  Pagination, Select, StatCard, Textarea, formatDateTime, useApi, useDebounced
} from '../ui';
import './pages.css';

const emptySchool = () => ({
  name: '', school_type: 'secondary', ownership: 'public', district: '', province: '',
  sector: '', cell: '', address: '', phone: '', email: '', website: '', logo_url: '',
  motto: '', subscription_plan: 'trial', max_users: 500, status: 'active'
});

const SchoolsPage = () => {
  const { t, isSuperAdmin, reload: reloadPlatform } = usePlatform();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptySchool());
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
    () => platform.schools(params),
    [JSON.stringify(params)]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    schools: acc.schools + 1,
    students: acc.students + Number(row.students || 0),
    teachers: acc.teachers + Number(row.teachers || 0),
    users: acc.users + Number(row.users || 0)
  }), { schools: 0, students: 0, teachers: 0, users: 0 }), [rows]);

  const openCreate = () => {
    setForm(emptySchool());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      ...emptySchool(),
      ...row,
      max_users: row.max_users ?? 500,
      status: row.status || 'active'
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.name.trim()) throw new Error('School name is required.');
      const payload = {
        ...form,
        max_users: Number(form.max_users) || 500
      };
      // Regular school administrators cannot change the status field.
      if (!isSuperAdmin) delete payload.status;
      if (modal.mode === 'create') {
        const response = await platform.createSchool(payload);
        setNotice(`${t('common.created')} · ${form.name} (${response.data?.code || ''})`);
      } else {
        await platform.updateSchool(modal.row.id, payload);
        setNotice(t('common.saved'));
      }
      setModal(null);
      reload();
      reloadPlatform?.();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (row, nextStatus) => {
    const label = nextStatus === 'active' ? t('users.activate') : t('common.suspended');
    if (!window.confirm(`${label} — ${row.name}?`)) return;
    try {
      await platform.updateSchool(row.id, { status: nextStatus });
      setNotice(`${row.name} · ${label}`);
      reload();
      reloadPlatform?.();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title={t('schools.title')}
        subtitle={t('schools.subtitle')}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
            {isSuperAdmin ? <Button icon={Plus} onClick={openCreate}>{t('schools.add')}</Button> : null}
          </>
        }
      />

      <div className="pf-stats-grid">
        <StatCard label={t('dash.schools')} value={totals.schools} icon={Building2} />
        <StatCard label={t('common.students')} value={totals.students} icon={Users} tone="info" />
        <StatCard label={t('common.teachers')} value={totals.teachers} icon={Users} tone="success" />
        <StatCard label={t('common.users')} value={totals.users} icon={Users} tone="brand" />
      </div>

      {error ? <Alert>{error.message}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                   placeholder={t('common.search')} />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  aria-label={t('schools.status')}>
            <option value="">{t('common.all')} · {t('schools.status')}</option>
            <option value="pending">{t('common.pending')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="suspended">{t('common.suspended')}</option>
            <option value="rejected">{t('common.rejected')}</option>
          </Select>
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
                key: 'name', label: t('common.name'),
                render: (row) => (
                  <div>
                    <span className="pf-cell-strong">{row.name}</span>
                    <div className="pf-text-small">{row.code || '—'} · {row.district || row.province || '—'}</div>
                  </div>
                )
              },
              { key: 'school_type', label: t('school.type'), render: (row) => <Badge value={row.school_type} tone="brand">{row.school_type || '—'}</Badge> },
              { key: 'students', label: t('common.students'), align: 'right' },
              { key: 'teachers', label: t('common.teachers'), align: 'right' },
              { key: 'users', label: t('common.users'), align: 'right' },
              { key: 'subscription_plan', label: t('schools.plan'), render: (row) => <Badge value={row.subscription_plan}>{row.subscription_plan || 'trial'}</Badge> },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              { key: 'created_at', label: t('audit.when'), render: (row) => formatDateTime(row.created_at) },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    <IconButton label={t('common.edit')} icon={Pencil} onClick={() => openEdit(row)} />
                    {isSuperAdmin && row.status !== 'active' ? (
                      <IconButton label={t('users.activate')} icon={CheckCircle2}
                                  onClick={() => changeStatus(row, 'active')} />
                    ) : null}
                    {isSuperAdmin && row.status === 'active' ? (
                      <IconButton label={t('common.suspended')} icon={ShieldOff}
                                  onClick={() => changeStatus(row, 'suspended')} />
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
        open={Boolean(modal)}
        wide
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${modal.row?.name || ''}` : t('schools.add')}
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
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </Field>
          <Field label={t('school.type')}>
            <Select value={form.school_type} onChange={(e) => setForm((prev) => ({ ...prev, school_type: e.target.value }))}>
              <option value="nursery">Nursery</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="tvet">TVET</option>
              <option value="combined">Combined</option>
            </Select>
          </Field>
          <Field label={t('school.ownership')}>
            <Select value={form.ownership} onChange={(e) => setForm((prev) => ({ ...prev, ownership: e.target.value }))}>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="government-aided">Government aided</option>
              <option value="faith-based">Faith based</option>
            </Select>
          </Field>
          <Field label={t('school.district')}>
            <Input value={form.district} onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))} />
          </Field>
          <Field label={t('school.province')}>
            <Input value={form.province} onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))} />
          </Field>
          <Field label={t('school.sector')}>
            <Input value={form.sector} onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))} />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </Field>
          <Field label={t('common.email')}>
            <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </Field>
          <Field label={t('school.logo')}>
            <Input value={form.logo_url} onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))} />
          </Field>
          <Field label={t('schools.plan')}>
            <Select value={form.subscription_plan} onChange={(e) => setForm((prev) => ({ ...prev, subscription_plan: e.target.value }))}>
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </Select>
          </Field>
          <Field label={t('schools.users')}>
            <Input type="number" min="1" value={form.max_users}
                   onChange={(e) => setForm((prev) => ({ ...prev, max_users: e.target.value }))} />
          </Field>
          {isSuperAdmin ? (
            <Field label={t('schools.status')}>
              <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="pending">{t('common.pending')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="suspended">{t('common.suspended')}</option>
                <option value="rejected">{t('common.rejected')}</option>
              </Select>
            </Field>
          ) : null}
          <Field label={t('common.notes')} span={2}>
            <Textarea value={form.motto} onChange={(e) => setForm((prev) => ({ ...prev, motto: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </>
  );
};

export default SchoolsPage;
