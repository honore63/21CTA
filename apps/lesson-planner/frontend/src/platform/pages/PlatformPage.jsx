import { useMemo, useState } from 'react';
import {
  Boxes, CheckCircle2, Database, RefreshCw, School, ShieldCheck, Users
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, EmptyState, PageHeader, StatCard, formatDateTime, useApi
} from '../ui';
import './pages.css';

const ModuleRow = ({ module, canToggle, canPlatformToggle, onToggle, t, busy }) => {
  const [scope, setScope] = useState(canPlatformToggle ? 'platform' : 'school');
  const enabled = canPlatformToggle && scope === 'platform'
    ? Boolean(module.is_enabled)
    : Boolean(module.school_enabled);

  return (
    <div className="pf-module-row">
      <div className="pf-module-row__main">
        <span className="pf-module-row__icon"><Boxes size={16} /></span>
        <div>
          <strong>{module.name}</strong>
          <small>{module.code}{module.route ? ` · ${module.route}` : ''}</small>
        </div>
      </div>
      <div className="pf-module-row__meta">
        {module.audience ? <Badge value="info" tone="brand">{module.audience}</Badge> : null}
        <Badge value={enabled ? 'active' : 'inactive'}>{enabled ? t('common.enabled') : t('common.disabled')}</Badge>
        {canToggle ? (
          <div className="pf-inline">
            {canPlatformToggle ? (
              <select className="pf-input pf-input--mini" value={scope}
                      onChange={(e) => setScope(e.target.value)} aria-label="Scope">
                <option value="platform">Platform</option>
                <option value="school">School</option>
              </select>
            ) : null}
            <Button
              variant={enabled ? 'secondary' : 'primary'}
              size="sm"
              disabled={busy === module.code}
              onClick={() => onToggle(module, { scope, enabled: !enabled })}
            >
              {enabled ? t('common.disabled') : t('common.enabled')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const PlatformPage = () => {
  const { t, isSuperAdmin, hasPermission, school } = usePlatform();
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const canSchoolToggle = hasPermission('settings.manage') || hasPermission('modules.manage');
  const canToggle = isSuperAdmin || canSchoolToggle;

  const { data, loading, error: loadError, reload } = useApi(() => platform.modules(), []);
  const { data: overviewData, loading: overviewLoading } = useApi(() => platform.overview(), []);
  const { data: userData } = useApi(() => platform.users({ limit: 1 }), []);

  const modules = data?.data || [];
  const overview = overviewData?.data || {};

  const counts = useMemo(() => ({
    enabled: modules.filter((m) => m.school_enabled).length,
    disabled: modules.filter((m) => !m.school_enabled).length
  }), [modules]);

  const toggle = async (module, { scope, enabled }) => {
    if (scope === 'platform' && !window.confirm(
      `${enabled ? t('common.enabled') : t('common.disabled')} ${module.name} ${t('topbar.allSchools')}?`
    )) return;
    setBusy(module.code);
    setError(null);
    setNotice(null);
    try {
      await platform.toggleModule(module.code, { scope, enabled });
      setNotice(`${module.name} · ${enabled ? t('common.enabled') : t('common.disabled')}`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title={t('platform.title')}
        subtitle={t('platform.subtitle')}
        actions={<Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>}
      />

      <div className="pf-stats-grid">
        <StatCard label={t('common.modules')} value={modules.length} icon={Boxes} />
        <StatCard label={t('common.enabled')} value={counts.enabled} icon={CheckCircle2} tone="success" />
        <StatCard label={t('common.disabled')} value={counts.disabled} icon={ShieldCheck}
                  tone={counts.disabled > 0 ? 'warning' : 'brand'} />
        {isSuperAdmin ? (
          <StatCard label={t('dash.schools')} value={overview.schools ?? '—'} icon={School} tone="info" />
        ) : (
          <StatCard label={t('common.users')} value={userData?.pagination?.total ?? '—'} icon={Users} tone="info" />
        )}
      </div>

      {loadError ? <Alert>{loadError.message}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="pf-dash-grid">
        <div className="pf-dash-main">
          <Card title={t('platform.modulesTab')} subtitle={isSuperAdmin ? t('platform.toggleHint') : (school?.name || '')}>
            {loading ? (
              <p className="pf-muted">{t('common.loading')}</p>
            ) : modules.length === 0 ? (
              <EmptyState title={t('common.noData')} />
            ) : (
              <div className="pf-module-list">
                {modules.map((module) => (
                  <ModuleRow
                    key={module.code}
                    module={module}
                    t={t}
                    busy={busy}
                    canToggle={canToggle}
                    canPlatformToggle={isSuperAdmin}
                    onToggle={toggle}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="pf-dash-side">
          <Card title={t('platform.health')}>
            {overviewLoading ? (
              <p className="pf-muted">{t('common.loading')}</p>
            ) : (
              <div className="pf-health">
                <div className="pf-health__item">
                  <span className="pf-health__icon is-ok"><Database size={17} /></span>
                  <div>
                    <strong>{t('dash.database')}</strong>
                    <small>{t('dash.connected')} · {Number(overview.system_health?.tables || 0)} {t('dash.tables')}</small>
                  </div>
                </div>
                <div className="pf-health__item">
                  <span className="pf-health__icon is-ok"><CheckCircle2 size={17} /></span>
                  <div>
                    <strong>{t('dash.api')}</strong>
                    <small>{t('platform.apiStatus')}: {t('dash.operational')}</small>
                  </div>
                </div>
                <div className="pf-health__item">
                  <span className="pf-health__icon"><RefreshCw size={17} /></span>
                  <div>
                    <strong>{t('platform.lastChecked')}</strong>
                    <small>{formatDateTime(overview.system_health?.checked_at)}</small>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {isSuperAdmin ? (
            <Card title={t('platform.system')}>
              <div className="pf-stack">
                <div className="pf-summary-row">
                  <span>{t('platform.totalSchools')}</span>
                  <strong>{Number(overview.schools || 0)}</strong>
                </div>
                <div className="pf-summary-row">
                  <span>{t('dash.schoolsActive')}</span>
                  <strong>{Number(overview.schools_active || 0)}</strong>
                </div>
                <div className="pf-summary-row">
                  <span>{t('dash.pendingRegistrations')}</span>
                  <strong>{Number(overview.pending_registrations || 0)}</strong>
                </div>
                <div className="pf-summary-row">
                  <span>{t('platform.totalUsers')}</span>
                  <strong>{(overview.users_by_role || []).reduce((acc, row) => acc + Number(row.value || 0), 0)}</strong>
                </div>
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
};

export default PlatformPage;
