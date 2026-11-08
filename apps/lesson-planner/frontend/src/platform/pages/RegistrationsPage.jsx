import { useMemo, useState } from 'react';
import {
  Check, RefreshCw, School, UserPlus, X
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, Field, Modal, PageHeader, Pagination,
  Select, StatCard, Textarea, formatDateTime, useApi
} from '../ui';
import './pages.css';

const RegistrationsPage = () => {
  const { t, role, isSuperAdmin } = usePlatform();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [review, setReview] = useState({ decision: 'approved', review_notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const params = useMemo(() => ({ page, limit: 20, status }), [page, status]);

  const { data, loading, error: loadError, reload } = useApi(
    () => platform.registrations(params),
    [JSON.stringify(params)]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };

  const counts = useMemo(() => ({
    school: rows.filter((row) => row.request_type === 'school').length,
    user: rows.filter((row) => row.request_type === 'user').length
  }), [rows]);

  const openReview = (row, decision) => {
    setSelected(row);
    setReview({ decision, review_notes: '' });
    setError(null);
    setResult(null);
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await platform.reviewRegistration(selected.id, review);
      setResult({
        title: response.message,
        lines: [
          `${selected.contact_name} · ${selected.email}`,
          response.data?.temporary_password
            ? `${t('users.tempPasswordIssued')}: ${response.data.temporary_password}`
            : null,
          response.data?.role_code ? `${t('registrations.requestedRole')}: ${role(response.data.role_code)}` : null
        ].filter(Boolean)
      });
      setSelected(null);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('registrations.title')}
        subtitle={t('registrations.subtitle')}
        actions={<Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>}
      />

      <div className="pf-stats-grid">
        <StatCard label={t('registrations.schoolRequest')} value={counts.school} icon={School} />
        <StatCard label={t('registrations.userRequest')} value={counts.user} icon={UserPlus} tone="info" />
        <StatCard label={t('common.total')} value={pagination.total ?? rows.length} icon={UserPlus} tone="brand" />
      </div>

      {loadError ? <Alert>{loadError.message}</Alert> : null}
      {result ? (
        <Alert tone="success">
          <strong>{result.title}</strong>
          {result.lines.map((line, index) => <span key={index} style={{ display: 'block' }}>{line}</span>)}
        </Alert>
      ) : null}
      {isSuperAdmin ? null : (
        <Alert tone="info">{t('registrations.subtitle')}</Alert>
      )}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  aria-label={t('common.status')}>
            <option value="pending">{t('common.pending')}</option>
            <option value="approved">{t('common.approved')}</option>
            <option value="rejected">{t('common.rejected')}</option>
            <option value="all">{t('common.all')}</option>
          </Select>
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('registrations.noRequests')}
            columns={[
              {
                key: 'request_type', label: t('common.type'),
                render: (row) => (
                  <Badge value={row.request_type} tone="brand">
                    {row.request_type === 'school' ? t('registrations.schoolRequest') : t('registrations.userRequest')}
                  </Badge>
                )
              },
              {
                key: 'contact_name', label: t('registrations.contact'),
                render: (row) => (
                  <div>
                    <span className="pf-cell-strong">{row.contact_name}</span>
                    <div className="pf-text-small">{row.email}{row.phone ? ` · ${row.phone}` : ''}</div>
                  </div>
                )
              },
              {
                key: 'school_name', label: t('registrations.school'),
                render: (row) => row.linked_school_name || row.school_name || '—'
              },
              {
                key: 'role_code', label: t('registrations.requestedRole'),
                render: (row) => row.role_code ? role(row.role_code) : '—'
              },
              { key: 'message', label: t('common.notes'), render: (row) => row.message ? String(row.message).slice(0, 70) : '—' },
              { key: 'created_at', label: t('audit.when'), render: (row) => formatDateTime(row.created_at) },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => row.status === 'pending' ? (
                  <div className="pf-table__actions">
                    <Button variant="success" size="sm" icon={Check} onClick={() => openReview(row, 'approved')}>
                      {t('registrations.approve')}
                    </Button>
                    <Button variant="danger" size="sm" icon={X} onClick={() => openReview(row, 'rejected')}>
                      {t('registrations.reject')}
                    </Button>
                  </div>
                ) : (
                  <span className="pf-text-small">
                    {row.reviewed_by_name ? `${t('registrations.reviewedBy')}: ${row.reviewed_by_name}` : '—'}
                  </span>
                )
              }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={Boolean(selected)}
        title={review.decision === 'approved' ? t('registrations.approve') : t('registrations.reject')}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>{t('common.cancel')}</Button>
            <Button variant={review.decision === 'approved' ? 'primary' : 'danger'}
                    onClick={submit} disabled={saving}>
              {saving ? t('common.saving') : t('common.confirm')}
            </Button>
          </>
        }
      >
        {error ? <Alert>{error}</Alert> : null}
        {selected ? (
          <>
            <div className="pf-detail-grid" style={{ marginBottom: 16 }}>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('common.type')}</span>
                <span className="pf-detail__value">
                  {selected.request_type === 'school' ? t('registrations.schoolRequest') : t('registrations.userRequest')}
                </span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('registrations.contact')}</span>
                <span className="pf-detail__value">{selected.contact_name}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('common.email')}</span>
                <span className="pf-detail__value">{selected.email}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('registrations.school')}</span>
                <span className="pf-detail__value">{selected.linked_school_name || selected.school_name || '—'}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('registrations.requestedRole')}</span>
                <span className="pf-detail__value">{selected.role_code ? role(selected.role_code) : '—'}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('common.date')}</span>
                <span className="pf-detail__value">{formatDateTime(selected.created_at)}</span>
              </div>
            </div>
            {selected.message ? <Alert tone="info">{selected.message}</Alert> : null}
          </>
        ) : null}
        <Field label={t('registrations.reviewNote')}>
          <Textarea value={review.review_notes}
                    onChange={(e) => setReview((prev) => ({ ...prev, review_notes: e.target.value }))} />
        </Field>
      </Modal>
    </>
  );
};

export default RegistrationsPage;
