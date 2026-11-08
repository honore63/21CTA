import { useEffect, useState } from 'react';
import {
  KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserCheck, UserX
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, Field, IconButton, Input, Modal, PageHeader,
  Pagination, Select, formatDateTime, initials, useApi, useDebounced
} from '../ui';
import './pages.css';

const emptyUser = () => ({
  full_name: '', email: '', phone_number: '', password: '', role_code: 'teacher', school_id: ''
});

const UsersPage = () => {
  const { t, role, hasPermission, isSuperAdmin, schools, school } = usePlatform();
  const canManage = hasPermission('users.manage');

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyUser());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null);
  const debouncedQuery = useDebounced(query, 350);

  const params = {
    page,
    limit: 20,
    ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}),
    ...(status ? { status } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(isSuperAdmin && school?.id ? { school_id: school.id } : {})
  };

  const { data, loading, error, reload } = useApi(
    () => platform.users(params),
    [page, debouncedQuery, status, roleFilter, school?.id]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };
  const availableRoles = data?.available_roles || [];

  const openCreate = () => {
    setForm({ ...emptyUser(), school_id: school?.id || '' });
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      full_name: row.full_name || '',
      email: row.email || '',
      phone_number: row.phone_number || '',
      password: '',
      role_code: row.role || '',
      school_id: row.school_id || school?.id || ''
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (modal.mode === 'create') {
        if (!form.full_name || !form.email || !form.role_code) {
          throw new Error('Full name, email and role are required.');
        }
        const response = await platform.createUser({
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number || null,
          password: form.password || undefined,
          role_code: form.role_code,
          school_id: form.school_id || (school?.id || null)
        });
        setModal(null);
        setResult({
          title: 'User account created',
          lines: [
            `${form.full_name} · ${form.email}`,
            response.data?.temporary_password
              ? `${t('users.tempPasswordIssued')}: ${response.data.temporary_password}`
              : 'The password you supplied is active.'
          ]
        });
      } else {
        await platform.updateUser(modal.row.id, {
          full_name: form.full_name,
          phone_number: form.phone_number || null
        });
        setModal(null);
      }
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspended = async (row) => {
    const suspend = !row.is_suspended;
    if (!window.confirm(suspend ? `${t('users.suspend')} ${row.full_name}?` : `${t('users.activate')} ${row.full_name}?`)) return;
    try {
      await platform.updateUser(row.id, { is_suspended: suspend ? 1 : 0 });
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const resetPassword = async (row) => {
    if (!window.confirm(`${t('users.resetPassword')} — ${row.full_name}?`)) return;
    try {
      const response = await platform.resetUserPassword(row.id);
      setResult({
        title: t('users.resetPassword'),
        lines: [`${row.full_name} · ${row.email}`, `${t('users.tempPasswordIssued')}: ${response.data?.temporary_password}`]
      });
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
            {canManage ? <Button icon={Plus} onClick={openCreate}>{t('users.add')}</Button> : null}
          </>
        }
      />

      {error ? <Alert>{error.message}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t('common.search')} />
          </div>
          <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} aria-label={t('common.role')}>
            <option value="">{t('common.all')} · {t('common.role')}</option>
            {availableRoles.map((r) => <option key={r.code} value={r.code}>{role(r.code)}</option>)}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t('common.status')}>
            <option value="">{t('common.all')} · {t('common.status')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="suspended">{t('common.suspended')}</option>
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
                key: 'full_name', label: t('common.name'),
                render: (row) => (
                  <div className="pf-profile-line">
                    <span className="pf-avatar">{initials(row.full_name)}</span>
                    <span className="pf-profile-line__text">
                      <span className="pf-profile-line__name">{row.full_name}</span>
                      <span className="pf-profile-line__meta">{row.email}</span>
                    </span>
                  </div>
                )
              },
              {
                key: 'assignments', label: t('users.assignments'),
                render: (row) => (
                  <div className="pf-inline">
                    {(row.assignments || []).slice(0, 3).map((a, index) => (
                      <Badge key={`${a.role_code}-${index}`} value="info" tone="brand">{role(a.role_code)}</Badge>
                    ))}
                    {row.assignments?.length > 3 ? <span className="pf-text-small">+{row.assignments.length - 3}</span> : null}
                    {!row.assignments?.length ? <Badge value="neutral">{role(row.role)}</Badge> : null}
                  </div>
                )
              },
              { key: 'phone_number', label: t('common.phone'), render: (row) => row.phone_number || '—' },
              {
                key: 'status', label: t('common.status'),
                render: (row) => <Badge value={row.is_suspended ? 'suspended' : 'active'} />
              },
              { key: 'last_login_at', label: t('users.lastLogin'), render: (row) => row.last_login_at ? formatDateTime(row.last_login_at) : t('common.never') },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => canManage && row.id !== undefined ? (
                  <div className="pf-table__actions">
                    <IconButton label={t('common.edit')} icon={Pencil} onClick={() => openEdit(row)} />
                    <IconButton label={t('users.manageRoles')} icon={ShieldCheck}
                                onClick={() => setModal({ mode: 'roles', row })} />
                    <IconButton label={t('users.resetPassword')} icon={KeyRound} onClick={() => resetPassword(row)} />
                    <IconButton label={row.is_suspended ? t('users.activate') : t('users.suspend')}
                                icon={row.is_suspended ? UserCheck : UserX} onClick={() => toggleSuspended(row)} />
                  </div>
                ) : null
              }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={Boolean(modal) && modal.mode !== 'roles'}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('users.title')}` : t('users.add')}
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
          <Field label={t('auth.fullName')} required span={2}>
            <Input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} />
          </Field>
          <Field label={t('common.email')} required={modal?.mode === 'create'}>
            <Input type="email" value={form.email} disabled={modal?.mode === 'edit'}
                   onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone_number} onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))} />
          </Field>
          {modal?.mode === 'create' ? (
            <>
              <Field label={t('common.role')} required>
                <Select value={form.role_code} onChange={(e) => setForm((prev) => ({ ...prev, role_code: e.target.value }))}>
                  {availableRoles.map((r) => <option key={r.code} value={r.code}>{role(r.code)}</option>)}
                </Select>
              </Field>
              <Field label={t('users.password')} hint={t('users.passwordHint')}>
                <Input type="text" value={form.password} autoComplete="new-password"
                       onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
              </Field>
              {isSuperAdmin ? (
                <Field label={t('common.school')} span={2}>
                  <Select value={form.school_id} onChange={(e) => setForm((prev) => ({ ...prev, school_id: e.target.value }))}>
                    <option value="">{t('common.select')}</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              ) : null}
            </>
          ) : null}
        </div>
      </Modal>

      <RolesModal
        open={Boolean(modal) && modal.mode === 'roles'}
        row={modal?.row}
        roles={availableRoles}
        t={t}
        roleLabel={role}
        isSuperAdmin={isSuperAdmin}
        schools={schools}
        currentSchool={school}
        onClose={() => setModal(null)}
        onSaved={() => { setModal(null); reload(); }}
      />

      <Modal
        open={Boolean(result)}
        title={result?.title}
        onClose={() => setResult(null)}
        footer={<Button onClick={() => setResult(null)}>{t('common.close')}</Button>}
      >
        {(result?.lines || []).map((line, index) => (
          <p key={index} className={index === 1 ? 'pf-mono pf-text-strong' : 'pf-text-strong'}>{line}</p>
        ))}
      </Modal>
    </>
  );
};

/* ------------------------------------------------------------------ */

const RolesModal = ({ open, row, roles, t, roleLabel, isSuperAdmin, schools, currentSchool, onClose, onSaved }) => {
  const [selected, setSelected] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && row) {
      setSelected((row.assignments || []).map((a) => a.role_code));
      setSchoolId(row.school_id || currentSchool?.id || '');
      setError(null);
    }
  }, [open, row, currentSchool?.id]);

  const toggle = (code) => {
    setSelected((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (selected.length === 0) throw new Error('Select at least one role.');
      await platform.setUserRoles(row.id, {
        roles: selected,
        school_id: schoolId || undefined
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`${t('users.manageRoles')}${row ? ` · ${row.full_name}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </>
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      <p className="pf-text-small" style={{ marginBottom: 12 }}>{t('users.roleHint')}</p>
      {isSuperAdmin ? (
        <Field label={t('common.school')} style={{ marginBottom: 12 }}>
          <Select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">{t('common.select')}</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      ) : null}
      <div className="pf-check-list">
        {roles.map((r) => (
          <label key={r.code} className="pf-check-item">
            <input type="checkbox" checked={selected.includes(r.code)} onChange={() => toggle(r.code)} />
            <span>{roleLabel(r.code)}</span>
            <small>{r.code}</small>
          </label>
        ))}
      </div>
    </Modal>
  );
};

export default UsersPage;
