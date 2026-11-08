import { useMemo, useState } from 'react';
import { Eye, RefreshCw, ScrollText } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, IconButton, Input, Modal, PageHeader,
  Pagination, Select, formatDateTime, useApi
} from '../ui';
import './pages.css';

const pretty = (value) => {
  if (!value) return '—';
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return JSON.stringify(parsed, null, 2);
  } catch (_) {
    return String(value);
  }
};

const AuditPage = () => {
  const { t } = usePlatform();
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detail, setDetail] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: 25 };
    if (module) p.module = module;
    if (action.trim()) p.action = action.trim();
    if (from) p.date_from = from;
    if (to) p.date_to = to;
    return p;
  }, [page, module, action, from, to]);

  const { data, loading, error, reload } = useApi(
    () => platform.audit(params),
    [JSON.stringify(params)]
  );

  const { data: moduleData } = useApi(() => platform.modules(), []);
  const modules = moduleData?.data || [];

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };

  return (
    <>
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        actions={<Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>}
      />

      {error ? <Alert>{error.message}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }}
                  aria-label={t('audit.module')}>
            <option value="">{t('common.all')} · {t('audit.module')}</option>
            {modules.map((item) => (
              <option key={item.code} value={item.code}>{item.name || item.code}</option>
            ))}
          </Select>
          <Input value={action} placeholder={t('audit.action')}
                 onChange={(e) => { setAction(e.target.value); setPage(1); }} />
          <Input type="date" value={from} aria-label={t('common.from')}
                 onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input type="date" value={to} aria-label={t('common.to')}
                 onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          <DataTable
            rows={rows}
            loading={loading}
            emptyTitle={t('common.noData')}
            columns={[
              { key: 'created_at', label: t('audit.when'), render: (row) => formatDateTime(row.created_at) },
              {
                key: 'user_name', label: t('audit.user'),
                render: (row) => (
                  <div>
                    <span className="pf-cell-strong">{row.user_name || 'System'}</span>
                    <div className="pf-text-small">{row.user_email || (row.school_name || '')}</div>
                  </div>
                )
              },
              { key: 'action', label: t('audit.action'), render: (row) => <span className="pf-mono">{row.action}</span> },
              { key: 'module', label: t('audit.module'), render: (row) => <Badge value={row.module} tone="brand">{row.module || '—'}</Badge> },
              {
                key: 'entity', label: t('audit.entity'),
                render: (row) => row.entity ? `${row.entity}${row.entity_id ? ` #${row.entity_id}` : ''}` : '—'
              },
              { key: 'ip_address', label: t('audit.ip'), render: (row) => <span className="pf-mono">{row.ip_address || '—'}</span> },
              {
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    <IconButton label={t('audit.details')} icon={Eye} onClick={() => setDetail(row)} />
                  </div>
                )
              }
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={Boolean(detail)}
        wide
        title={`${t('audit.details')}${detail?.action ? ` · ${detail.action}` : ''}`}
        onClose={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>{t('common.close')}</Button>}
      >
        {detail ? (
          <>
            <div className="pf-detail-grid" style={{ marginBottom: 16 }}>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('audit.user')}</span>
                <span className="pf-detail__value">{detail.user_name || 'System'}{detail.user_email ? ` · ${detail.user_email}` : ''}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('audit.module')}</span>
                <span className="pf-detail__value">{detail.module || '—'}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('audit.entity')}</span>
                <span className="pf-detail__value">{detail.entity || '—'}{detail.entity_id ? ` #${detail.entity_id}` : ''}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('audit.ip')}</span>
                <span className="pf-detail__value">{detail.ip_address || '—'}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('common.school')}</span>
                <span className="pf-detail__value">{detail.school_name || '—'}</span>
              </div>
              <div className="pf-detail">
                <span className="pf-detail__label">{t('audit.when')}</span>
                <span className="pf-detail__value">{formatDateTime(detail.created_at)}</span>
              </div>
            </div>
            <pre className="pf-audit-json">{pretty(detail.details)}</pre>
          </>
        ) : null}
      </Modal>
    </>
  );
};

export default AuditPage;
