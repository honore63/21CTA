import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, Field, IconButton, Input, Modal, PageHeader,
  Pagination, Select, Textarea, useApi, useDebounced
} from '../ui';
import { usePlatform } from '../PlatformContext';
import './pages.css';

/* Select whose options come from another platform resource. */
const LookupSelect = ({ field, value, onChange, disabled }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (field.options) {
      setOptions(field.options);
      setLoading(false);
      return () => { active = false; };
    }
    const lookup = field.lookup;
    if (!lookup) { setLoading(false); return () => { active = false; }; }
    platform.list(lookup.resource, { limit: 300, ...(lookup.params || {}) })
      .then((response) => {
        if (!active) return;
        const rows = response.data || [];
        setOptions(rows.map((row) => ({
          value: row[lookup.valueKey || 'id'],
          label: lookup.label ? lookup.label(row) : (row.name || row.full_name || row.title || row.id)
        })));
      })
      .catch(() => { if (active) setOptions([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [field.lookup?.resource, JSON.stringify(field.lookup?.params || {})]);

  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled || loading}>
      <option value="">{loading ? 'Loading…' : 'Select…'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </Select>
  );
};

const defaultFor = (field) => {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === 'date') return new Date().toISOString().slice(0, 10);
  return '';
};

const ResourcePage = ({
  resource,
  titleKey,
  subtitleKey,
  columns,
  formFields = [],
  filters = [],
  canCreate,
  canEdit,
  canDelete,
  writePermission,
  createLabelKey = 'common.create',
  rowActions,
  queryParams = {},
  pageSize = 20,
  headerActions,
  onLoaded
}) => {
  const { t, hasPermission } = usePlatform();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState(() =>
    Object.fromEntries(filters.map((filter) => [filter.key, filter.defaultValue || '']))
  );
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const debouncedQuery = useDebounced(query, 350);

  const params = useMemo(() => {
    const result = { page, limit: pageSize, ...queryParams };
    if (debouncedQuery.trim()) result.q = debouncedQuery.trim();
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        if (key.includes('__')) {
          result[key.split('__')[1]] = value;
        } else {
          result[key] = value;
        }
      }
    });
    return result;
  }, [page, pageSize, debouncedQuery, filterValues, JSON.stringify(queryParams)]);

  const { data, loading, error, reload } = useApi(
    () => platform.list(resource, params),
    [resource, JSON.stringify(params)]
  );

  useEffect(() => { if (data) onLoaded?.(data); }, [data]);

  const rows = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: rows.length };
  const writable = data?.resource ? !data.resource.read_only : true;

  const openCreate = () => {
    const initial = {};
    formFields.forEach((field) => { initial[field.key] = defaultFor(field); });
    setForm(initial);
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    const initial = {};
    formFields.forEach((field) => {
      const raw = row[field.key];
      if (field.type === 'date' && raw) initial[field.key] = String(raw).slice(0, 10);
      else if (field.type === 'time' && raw) initial[field.key] = String(raw).slice(0, 5);
      else if (field.type === 'checkbox') initial[field.key] = Boolean(raw);
      else initial[field.key] = raw ?? '';
    });
    setForm(initial);
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form };
      formFields.forEach((field) => {
        if (field.type === 'number') {
          payload[field.key] = payload[field.key] === '' ? null : Number(payload[field.key]);
        }
        if (field.type === 'checkbox') payload[field.key] = payload[field.key] ? 1 : 0;
      });
      if (modal.mode === 'create') await platform.create(resource, payload);
      else await platform.update(resource, modal.row.id, payload);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await platform.remove(resource, row.id);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const tableColumns = [
    ...columns,
    {
      key: '__actions',
      label: t('common.actions'),
      align: 'right',
      render: (row) => (
        <div className="pf-table__actions">
          {rowActions ? rowActions(row, reload) : null}
          {canEdit !== false && writable && (!writePermission || hasPermission(writePermission)) && formFields.length > 0 ? (
            <IconButton label={t('common.edit')} icon={Pencil} onClick={() => openEdit(row)} />
          ) : null}
          {canDelete !== false && writable && (!writePermission || hasPermission(writePermission)) ? (
            <IconButton label={t('common.delete')} icon={Trash2} onClick={() => remove(row)} />
          ) : null}
        </div>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title={t(titleKey)}
        subtitle={subtitleKey ? t(subtitleKey) : undefined}
        actions={
          <>
            {headerActions}
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
            {canCreate !== false && writable && formFields.length > 0 && (!writePermission || hasPermission(writePermission)) ? (
              <Button icon={Plus} onClick={openCreate}>{t(createLabelKey)}</Button>
            ) : null}
          </>
        }
      />

      {error ? <Alert>{error.message}</Alert> : null}

      <Card padded={false}>
        <div className="pf-filter-bar" style={{ padding: '14px 16px 0' }}>
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                   placeholder={t('common.search')} aria-label={t('common.search')} />
          </div>
          {filters.map((filter) => (
            filter.lookup ? (
              <div key={filter.key} style={{ minWidth: 160 }}>
                <LookupSelect
                  field={{ lookup: filter.lookup }}
                  value={filterValues[filter.key]}
                  onChange={(value) => { setFilterValues((prev) => ({ ...prev, [filter.key]: value })); setPage(1); }}
                />
              </div>
            ) : filter.options ? (
              <Select key={filter.key} value={filterValues[filter.key]}
                      onChange={(e) => { setFilterValues((prev) => ({ ...prev, [filter.key]: e.target.value })); setPage(1); }}
                      aria-label={filter.labelKey ? t(filter.labelKey) : filter.key}>
                <option value="">{filter.allLabel || t('common.all')}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.labelKey ? t(option.labelKey) : option.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input key={filter.key} type={filter.type || 'text'}
                     value={filterValues[filter.key]}
                     placeholder={filter.labelKey ? t(filter.labelKey) : filter.key}
                     onChange={(e) => { setFilterValues((prev) => ({ ...prev, [filter.key]: e.target.value })); setPage(1); }} />
            )
          ))}
        </div>

        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable columns={tableColumns} rows={rows} loading={loading}
                     emptyTitle={t('common.noData')} emptyHint={t('common.noDataHint')} />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total}
                      onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={Boolean(modal)}
        wide={formFields.length > 6}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t(titleKey)}` : t(createLabelKey)}
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
          {formFields.map((field) => (
            <Field key={field.key} label={t(field.labelKey || field.key)} required={field.required}
                   hint={field.hintKey ? t(field.hintKey) : field.hint}
                   span={field.span || 1}>
              {field.type === 'select' || field.lookup ? (
                <LookupSelect field={field} value={form[field.key]}
                              onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))} />
              ) : field.type === 'textarea' ? (
                <Textarea value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />
              ) : field.type === 'checkbox' ? (
                <Select value={form[field.key] ? '1' : '0'}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value === '1' }))}>
                  <option value="1">{t('common.yes')}</option>
                  <option value="0">{t('common.no')}</option>
                </Select>
              ) : (
                <Input type={field.type || 'text'} value={form[field.key] ?? ''}
                       step={field.step}
                       onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default ResourcePage;
export { LookupSelect };
