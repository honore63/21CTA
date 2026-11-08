import { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, BarList, Button, Card, DataTable, Donut, EmptyState, PageHeader, Select,
  Tabs, useApi
} from '../ui';
import './pages.css';

const REPORTS = [
  { value: 'enrollment', labelKey: 'reports.enrollment' },
  { value: 'attendance', labelKey: 'reports.attendance' },
  { value: 'marks', labelKey: 'reports.marks' },
  { value: 'library', labelKey: 'reports.library' },
  { value: 'cpd', labelKey: 'reports.cpd' },
  { value: 'school-summary', labelKey: 'reports.schoolSummary' }
];

const ANALYTICS = [
  { value: 'attendance', labelKey: 'reports.attendance' },
  { value: 'performance', labelKey: 'reports.marks' },
  { value: 'enrollment', labelKey: 'reports.enrollment' },
  { value: 'library', labelKey: 'reports.library' }
];

const ReportsPage = () => {
  const { t, hasPermission } = usePlatform();
  const [tab, setTab] = useState('reports');
  const canExport = hasPermission('reports.export');

  return (
    <>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'reports', label: t('reports.choose'), icon: FileSpreadsheet },
          { value: 'analytics', label: t('reports.analytics'), icon: BarChart3 }
        ]}
      />
      {tab === 'reports' ? <ReportTables canExport={canExport} t={t} /> : <Analytics t={t} />}
    </>
  );
};

/* ------------------------------------------------------------------ */

const ReportTables = ({ canExport, t }) => {
  const [type, setType] = useState('enrollment');
  const [downloading, setDownloading] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => platform.report(type),
    [type]
  );

  const report = data?.data;
  const columns = useMemo(
    () => (report?.headers || []).map((header) => ({
      key: header.key,
      label: header.label,
      render: (row) => {
        const value = row[header.key];
        if (value === null || value === undefined || value === '') return '—';
        if (header.key.endsWith('_date') || header.key.endsWith('_at')) {
          return String(value).slice(0, 10);
        }
        return String(value);
      }
    })),
    [report]
  );

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await platform.exportReport(type);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pf-stack">
      {error ? <Alert>{error.message}</Alert> : null}

      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label={t('reports.choose')}>
            {REPORTS.map((report) => (
              <option key={report.value} value={report.value}>{t(report.labelKey)}</option>
            ))}
          </Select>
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          {canExport ? (
            <Button icon={Download} onClick={download} disabled={downloading || !report}>
              {downloading ? t('common.loading') : t('reports.download')}
            </Button>
          ) : null}
          <span className="pf-spacer" />
          {report ? (
            <span className="pf-text-small">{report.rows?.length || 0} {t('reports.rows')}</span>
          ) : null}
        </div>
      </Card>

      <Card title={report?.title || t('reports.choose')} padded={false}>
        <div style={{ padding: '14px 16px 16px' }}>
          {report && report.rows.length === 0 ? (
            <EmptyState title={t('common.noData')} hint={t('common.noDataHint')} />
          ) : (
            <DataTable
              rows={report?.rows || []}
              loading={loading}
              emptyTitle={t('common.noData')}
              columns={columns.length ? columns : [{ key: 'empty', label: '' }]}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Analytics = ({ t }) => {
  const [type, setType] = useState('attendance');
  const { data, loading, error, reload } = useApi(() => platform.analytics(type), [type]);
  const payload = data?.data || {};

  return (
    <div className="pf-stack">
      {error ? <Alert>{error.message}</Alert> : null}
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label={t('reports.analytics')}>
            {ANALYTICS.map((item) => <option key={item.value} value={item.value}>{t(item.labelKey)}</option>)}
          </Select>
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
        </div>
      </Card>

      {loading ? (
        <Card><p className="pf-muted">{t('common.loading')}</p></Card>
      ) : type === 'attendance' ? (
        <div className="pf-grid" style={{ '--pf-cols': 2 }}>
          <Card title={t('reports.byClass')}>
            <BarList items={(payload.by_class || []).map((r) => ({ label: r.label, value: r.rate }))}
                     valueFormatter={(v) => `${v}%`} emptyLabel={t('common.noData')} />
          </Card>
          <Card title={t('reports.byStatus')}>
            <Donut items={payload.by_status || []} />
          </Card>
          <Card title={t('reports.byDay')}>
            <BarList items={(payload.by_day || []).map((r) => ({ label: r.label, value: r.present }))}
                     emptyLabel={t('common.noData')} tone="success" />
          </Card>
        </div>
      ) : type === 'performance' ? (
        <div className="pf-grid" style={{ '--pf-cols': 2 }}>
          <Card title={t('reports.bySubject')}>
            <BarList items={payload.by_subject || []} valueFormatter={(v) => `${v}%`} emptyLabel={t('common.noData')} />
          </Card>
          <Card title={t('reports.byClass')}>
            <BarList items={payload.by_class || []} valueFormatter={(v) => `${v}%`} emptyLabel={t('common.noData')} tone="info" />
          </Card>
          <Card title={t('reports.gradeDistribution')}>
            <Donut items={payload.grade_distribution || []} />
          </Card>
          <Card title={t('reports.topStudents')}>
            <BarList items={payload.top_students || []} valueFormatter={(v) => `${v}%`} emptyLabel={t('common.noData')} tone="success" />
          </Card>
        </div>
      ) : type === 'enrollment' ? (
        <div className="pf-grid" style={{ '--pf-cols': 2 }}>
          <Card title={t('reports.byClass')}>
            <BarList items={payload.by_class || []} emptyLabel={t('common.noData')} />
          </Card>
          <Card title={t('reports.byGender')}>
            <Donut items={payload.by_gender || []} />
          </Card>
          <Card title={t('reports.byStatus')}>
            <Donut items={payload.by_status || []} />
          </Card>
        </div>
      ) : (
        <div className="pf-grid" style={{ '--pf-cols': 2 }}>
          <Card title={t('reports.byCategory')}>
            <BarList items={payload.by_category || []} emptyLabel={t('common.noData')} />
          </Card>
          <Card title={t('library.resourceType')}>
            <Donut items={payload.by_type || []} />
          </Card>
          <Card title={t('reports.monthlyLoans')}>
            <BarList items={payload.monthly_loans || []} emptyLabel={t('common.noData')} tone="info" />
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
