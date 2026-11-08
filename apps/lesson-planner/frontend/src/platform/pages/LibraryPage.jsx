import { useEffect, useMemo, useState } from 'react';
import {
  BookMarked, BookOpen, CheckCircle2, Library, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, EmptyState, Field, IconButton, Input, Modal,
  PageHeader, Pagination, Select, StatCard, Tabs, Textarea, formatDate, useApi, useDebounced
} from '../ui';
import './pages.css';

const emptyResource = () => ({
  title: '', author: '', category: '', resource_type: 'book', isbn: '',
  total_copies: 1, available_copies: 1, status: 'active', description: '', file_url: '', cover_url: ''
});

const emptyLoan = () => ({
  resource_id: '', borrower: '', due_at: '', notes: ''
});

const LibraryPage = () => {
  const { t, hasPermission } = usePlatform();
  const [tab, setTab] = useState('catalogue');
  const canManage = hasPermission('library.manage');
  const canBorrow = hasPermission('library.borrow') || canManage;

  return (
    <>
      <PageHeader
        title={t('library.title')}
        subtitle={t('library.subtitle')}
        actions={canBorrow ? (
          <Badge value="active" tone="brand"><BookMarked size={13} /> {t('library.issueLoan')}</Badge>
        ) : null}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'catalogue', label: t('library.resources'), icon: Library },
          { value: 'loans', label: t('library.loans'), icon: BookMarked }
        ]}
      />
      {tab === 'catalogue' ? (
        <Catalogue canManage={canManage} canBorrow={canBorrow} t={t} />
      ) : (
        <Loans canManage={canManage} canBorrow={canBorrow} t={t} />
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */

const Catalogue = ({ canManage, canBorrow, t }) => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyResource());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [loanTarget, setLoanTarget] = useState(null);
  const debouncedQuery = useDebounced(query, 350);

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (debouncedQuery.trim()) p.q = debouncedQuery.trim();
    if (category) p.category = category;
    if (type) p.resource_type = type;
    return p;
  }, [page, debouncedQuery, category, type]);

  const { data, loading, error, reload } = useApi(
    () => platform.list('library', params),
    [JSON.stringify(params)]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: rows.length };

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.category).filter(Boolean))],
    [rows]
  );

  const openCreate = () => {
    setForm(emptyResource());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      ...emptyResource(),
      ...row,
      total_copies: row.total_copies ?? 1,
      available_copies: row.available_copies ?? 1
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
        total_copies: Number(form.total_copies) || 1,
        available_copies: Number(form.available_copies) || 0,
        isbn: form.isbn || null,
        description: form.description || null,
        file_url: form.file_url || null,
        cover_url: form.cover_url || null
      };
      if (modal.mode === 'create') await platform.create('library', payload);
      else await platform.update('library', modal.row.id, payload);
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
      await platform.remove('library', row.id);
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
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t('common.search')} />
          </div>
          <Input value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder={t('common.category')} />
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label={t('library.resourceType')}>
            <option value="">{t('common.all')} · {t('library.resourceType')}</option>
            <option value="book">Book</option>
            <option value="ebook">E-book</option>
            <option value="journal">Journal</option>
            <option value="video">Video</option>
            <option value="past-paper">Past paper</option>
            <option value="other">Other</option>
          </Select>
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          {canManage ? <Button icon={Plus} onClick={openCreate}>{t('library.addResource')}</Button> : null}
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
                    <div className="pf-text-small">{row.author || '—'}</div>
                  </div>
                )
              },
              { key: 'category', label: t('common.category'), render: (row) => row.category || '—' },
              { key: 'resource_type', label: t('library.resourceType'), render: (row) => <Badge value={row.resource_type} tone="brand">{row.resource_type || '—'}</Badge> },
              { key: 'total_copies', label: t('library.totalCopies'), align: 'right' },
              { key: 'available_copies', label: t('library.availableCopies'), align: 'right' },
              { key: 'active_loans', label: t('library.activeLoans'), align: 'right' },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    {canBorrow && Number(row.available_copies) > 0 ? (
                      <IconButton label={t('library.issueLoan')} icon={BookMarked} onClick={() => setLoanTarget(row)} />
                    ) : null}
                    {canManage ? <IconButton label={t('common.edit')} icon={Pencil} onClick={() => openEdit(row)} /> : null}
                    {canManage ? <IconButton label={t('common.delete')} icon={Trash2} onClick={() => remove(row)} /> : null}
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
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('library.resources')}` : t('library.addResource')}
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
          <Field label={t('library.author')}>
            <Input value={form.author} onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))} />
          </Field>
          <Field label={t('common.category')}>
            <Input list="library-categories" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
            <datalist id="library-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label={t('library.resourceType')}>
            <Select value={form.resource_type} onChange={(e) => setForm((prev) => ({ ...prev, resource_type: e.target.value }))}>
              <option value="book">Book</option>
              <option value="ebook">E-book</option>
              <option value="journal">Journal</option>
              <option value="video">Video</option>
              <option value="past-paper">Past paper</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label={t('library.isbn')}>
            <Input value={form.isbn} onChange={(e) => setForm((prev) => ({ ...prev, isbn: e.target.value }))} />
          </Field>
          <Field label={t('library.totalCopies')}>
            <Input type="number" min="1" value={form.total_copies} onChange={(e) => setForm((prev) => ({ ...prev, total_copies: e.target.value }))} />
          </Field>
          <Field label={t('library.availableCopies')}>
            <Input type="number" min="0" value={form.available_copies} onChange={(e) => setForm((prev) => ({ ...prev, available_copies: e.target.value }))} />
          </Field>
          <Field label={t('library.fileUrl')} span={2}>
            <Input value={form.file_url} onChange={(e) => setForm((prev) => ({ ...prev, file_url: e.target.value }))} />
          </Field>
          <Field label={t('library.coverUrl')} span={2}>
            <Input value={form.cover_url} onChange={(e) => setForm((prev) => ({ ...prev, cover_url: e.target.value }))} />
          </Field>
          <Field label={t('common.description')} span={2}>
            <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </Field>
        </div>
      </Modal>

      <IssueLoanModal
        resource={loanTarget}
        onClose={() => setLoanTarget(null)}
        onDone={() => { setLoanTarget(null); reload(); }}
        t={t}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */

const IssueLoanModal = ({ resource, onClose, onDone, t }) => {
  const [form, setForm] = useState(emptyLoan());
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resource) return;
    setForm({ ...emptyLoan(), resource_id: resource.id });
    setError(null);
    Promise.all([
      platform.list('students', { limit: 300, status: 'active' }),
      platform.list('teachers', { limit: 300 })
    ]).then(([studentRes, teacherRes]) => {
      setStudents(studentRes.data || []);
      setTeachers(teacherRes.data || []);
    }).catch(() => {});
  }, [resource]);

  const borrowDate = new Date();
  const defaultDue = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!form.borrower) throw new Error('Select a borrower.');
      const student = students.find((s) => String(s.user_id) === String(form.borrower));
      await platform.create('loans', {
        resource_id: Number(form.resource_id),
        borrower_user_id: Number(form.borrower),
        student_id: student ? student.id : null,
        due_at: form.due_at || defaultDue,
        status: 'borrowed',
        notes: form.notes || null
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(resource)}
      title={`${t('library.issueLoan')}${resource ? ` · ${resource.title}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </>
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      <div className="pf-form-grid">
        <Field label={t('library.borrower')} required span={2}>
          <Select value={form.borrower} onChange={(e) => setForm((prev) => ({ ...prev, borrower: e.target.value }))}>
            <option value="">{t('common.select')}</option>
            <optgroup label={t('common.students')}>
              {students.map((student) => (
                <option key={`s-${student.id}`} value={student.user_id}>
                  {student.full_name} · {student.admission_number}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('common.teachers')}>
              {teachers.map((teacher) => (
                <option key={`t-${teacher.id}`} value={teacher.user_id}>{teacher.full_name}</option>
              ))}
            </optgroup>
          </Select>
        </Field>
        <Field label={t('library.dueAt')} required>
          <Input type="date" value={form.due_at} min={borrowDate.toISOString().slice(0, 10)}
                 onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))} />
        </Field>
        <Field label={t('common.notes')}>
          <Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */

const Loans = ({ canManage, canBorrow, t }) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 350);

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (status) p.status = status;
    if (debouncedQuery.trim()) p.q = debouncedQuery.trim();
    return p;
  }, [page, status, debouncedQuery]);

  const { data, loading, error, reload } = useApi(
    () => platform.list('loans', params),
    [JSON.stringify(params)]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };
  const active = rows.filter((r) => r.status === 'borrowed' || r.status === 'overdue').length;
  const overdue = rows.filter((r) => r.status === 'overdue').length;

  const returnLoan = async (row) => {
    if (!window.confirm(`${t('library.returnLoan')} — ${row.resource_title}?`)) return;
    try {
      await platform.returnLoan(row.id);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div className="pf-stack">
      <div className="pf-stats-grid">
        <StatCard label={t('library.activeLoans')} value={active} icon={BookMarked} />
        <StatCard label={t('dash.overdueLoans')} value={overdue} icon={RotateCcw} tone={overdue ? 'danger' : 'success'} />
      </div>

      {error ? <Alert>{error.message}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <div className="pf-search">
            <Search size={15} className="pf-search__icon" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t('common.search')} />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t('common.status')}>
            <option value="">{t('common.all')} · {t('common.status')}</option>
            <option value="borrowed">{t('common.borrowed')}</option>
            <option value="returned">{t('common.returned')}</option>
            <option value="overdue">{t('common.overdue')}</option>
            <option value="lost">Lost</option>
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
              { key: 'resource_title', label: t('common.title'), render: (row) => <span className="pf-cell-strong">{row.resource_title}</span> },
              { key: 'borrower_name', label: t('library.borrower'), render: (row) => row.borrower_name || row.student_name || '—' },
              { key: 'borrowed_at', label: t('library.borrowedAt'), render: (row) => formatDate(row.borrowed_at) },
              { key: 'due_at', label: t('library.dueAt'), render: (row) => formatDate(row.due_at) },
              { key: 'returned_at', label: t('common.returned'), render: (row) => row.returned_at ? formatDate(row.returned_at) : '—' },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    {canBorrow && (row.status === 'borrowed' || row.status === 'overdue') ? (
                      <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => returnLoan(row)}>
                        {t('library.returnLoan')}
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

export default LibraryPage;
