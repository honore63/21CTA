import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Globe2, Plus, RefreshCw, Save, Settings as SettingsIcon, Sliders, UserCircle2
} from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import { LANGUAGES } from '../i18n';
import {
  Alert, Button, Card, Field, Input, PageHeader, Select, Tabs, Textarea, useApi
} from '../ui';
import './pages.css';

const toRows = (object) => Object.entries(object || {}).map(([key, value]) => ({ key, value: value ?? '' }));
const fromRows = (rows) => Object.fromEntries(
  rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])
);

const SettingsPage = () => {
  const { t } = usePlatform();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'profile');

  useEffect(() => {
    const requested = params.get('tab');
    if (requested) setTab(requested);
  }, [params]);

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'profile', label: t('settings.profileTab'), icon: UserCircle2 },
          { value: 'preferences', label: t('settings.preferencesTab'), icon: Sliders },
          { value: 'school', label: t('settings.schoolTab'), icon: Building2 },
          { value: 'platform', label: t('settings.platformTab'), icon: SettingsIcon }
        ]}
      />
      {tab === 'profile' ? <ProfileSection t={t} /> : null}
      {tab === 'preferences' ? <PreferencesSection t={t} /> : null}
      {tab === 'school' ? <SchoolSettingsSection t={t} /> : null}
      {tab === 'platform' ? <PlatformSettingsSection t={t} /> : null}
    </>
  );
};

/* ------------------------------------------------------------------ */

const ProfileSection = ({ t }) => {
  const { user, reload } = usePlatform();
  const [form, setForm] = useState({ full_name: '', phone_number: '', profile_photo: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm({
      full_name: user?.full_name || '',
      phone_number: user?.phone_number || '',
      profile_photo: user?.profile_photo || ''
    });
  }, [user?.id]);

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await platform.updateProfile(form);
      setMessage(t('settings.profileSaved'));
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-stack">
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Card title={t('settings.profileTab')} subtitle={user?.email}
            action={<Button icon={Save} onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>}>
        <div className="pf-form-grid">
          <Field label={t('auth.fullName')} required span={2}>
            <Input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} />
          </Field>
          <Field label={t('common.email')}>
            <Input value={user?.email || ''} disabled />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone_number} onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))} />
          </Field>
          <Field label={t('school.logo')} span={2}>
            <Input value={form.profile_photo} placeholder="https://…"
                   onChange={(e) => setForm((prev) => ({ ...prev, profile_photo: e.target.value }))} />
          </Field>
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const PreferencesSection = ({ t }) => {
  const { language, theme, setLanguage, setTheme } = usePlatform();
  return (
    <div className="pf-stack">
      <Card title={t('settings.preferencesTab')}>
        <div className="pf-form-grid">
          <Field label={t('common.language')} hint={t('settings.languageHint')}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>{item.label} ({item.short})</option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.theme')} hint={t('settings.themeHint')}>
            <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="light">{t('common.light')}</option>
              <option value="dark">{t('common.dark')}</option>
            </Select>
          </Field>
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const KeyValueEditor = ({ rows, onChange, t, disabled }) => (
  <div>
    {rows.map((row, index) => (
      <div key={index} className="pf-kv-row">
        <Field label={t('settings.settingKey')}>
          <Input value={row.key} disabled={disabled}
                 onChange={(e) => onChange(rows.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} />
        </Field>
        <Field label={t('settings.settingValue')}>
          <Input value={row.value} disabled={disabled}
                 onChange={(e) => onChange(rows.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} />
        </Field>
        <Button variant="ghost" size="sm" disabled={disabled}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}>
          {t('common.remove')}
        </Button>
      </div>
    ))}
    <Button variant="secondary" size="sm" icon={Plus} disabled={disabled}
            onClick={() => onChange([...rows, { key: '', value: '' }])}>
      {t('settings.addSetting')}
    </Button>
  </div>
);

const SettingsEditor = ({ title, subtitle, groups, canManage, onSave, t }) => {
  const [sections, setSections] = useState(groups);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { setSections(groups); }, [groups]);

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await onSave(sections);
      setMessage(t('common.saved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const names = useMemo(() => Object.keys(sections), [sections]);

  return (
    <div className="pf-stack">
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {!canManage ? <Alert tone="info">{t('common.noData')}</Alert> : null}
      {names.map((name) => (
        <Card key={name} title={`${title} · ${name}`} subtitle={subtitle}
              action={canManage ? (
                <Button icon={Save} size="sm" onClick={submit} disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
              ) : null}>
          <KeyValueEditor
            rows={toRows(sections[name])}
            disabled={!canManage}
            t={t}
            onChange={(rows) => setSections((prev) => ({ ...prev, [name]: fromRows(rows) }))}
          />
        </Card>
      ))}
      {names.length === 0 ? <Card><p className="pf-muted">{t('common.noData')}</p></Card> : null}
    </div>
  );
};

const SchoolSettingsSection = ({ t }) => {
  const { data, loading, error, reload } = useApi(() => platform.settings(), []);
  const payload = data?.data;
  const groups = useMemo(() => ({ general: payload?.school || {} }), [payload]);

  if (loading) return <Card><p className="pf-muted">{t('common.loading')}</p></Card>;
  if (error) return <Alert>{error.message}</Alert>;

  return (
    <div className="pf-stack">
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <span className="pf-muted">{t('settings.schoolTab')}</span>
          <span className="pf-spacer" />
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
        </div>
      </Card>
      <SettingsEditor
        title={t('settings.schoolTab')}
        subtitle={t('settings.subtitle')}
        groups={groups}
        canManage={Boolean(payload?.can_manage_school)}
        onSave={async (sections) => {
          await platform.updateSettings({ school: sections.general || {} });
          reload();
        }}
        t={t}
      />
    </div>
  );
};

const PlatformSettingsSection = ({ t }) => {
  const { data, loading, error, reload } = useApi(() => platform.settings(), []);
  const payload = data?.data;

  if (loading) return <Card><p className="pf-muted">{t('common.loading')}</p></Card>;
  if (error) return <Alert>{error.message}</Alert>;

  return (
    <div className="pf-stack">
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <span className="pf-muted">{t('settings.platformTab')}</span>
          <span className="pf-spacer" />
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
        </div>
      </Card>
      {!payload?.can_manage_platform ? <Alert tone="info">{t('common.noData')}</Alert> : null}
      <SettingsEditor
        title={t('settings.platformTab')}
        subtitle={t('settings.subtitle')}
        groups={payload?.platform || {}}
        canManage={Boolean(payload?.can_manage_platform)}
        onSave={async (sections) => {
          await platform.updateSettings({ platform: sections });
          reload();
        }}
        t={t}
      />
    </div>
  );
};

export default SettingsPage;
