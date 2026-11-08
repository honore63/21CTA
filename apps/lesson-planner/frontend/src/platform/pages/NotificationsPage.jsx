import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Megaphone, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import {
  Alert, Badge, Button, Card, DataTable, EmptyState, Field, Input, Modal,
  PageHeader, Pagination, Select, Tabs, Textarea, formatDateTime, useApi
} from '../ui';
import './pages.css';

const emptyAnnouncement = () => ({
  title: '', body: '', audience: 'all', priority: 'normal', expires_at: ''
});

const NotificationsPage = () => {
  const { t, hasPermission, refreshNotifications } = usePlatform();
  const [tab, setTab] = useState('inbox');
  const canSend = hasPermission('notifications.send');

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={<Badge value="info" tone="brand"><Bell size={13} /> {t('notifications.inbox')}</Badge>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'inbox', label: t('notifications.inbox'), icon: Bell },
          { value: 'announcements', label: t('notifications.announcements'), icon: Megaphone }
        ]}
      />
      {tab === 'inbox' ? (
        <Inbox t={t} refreshNotifications={refreshNotifications} />
      ) : (
        <Announcements t={t} canSend={canSend} />
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */

const Inbox = ({ t, refreshNotifications }) => {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(
    () => platform.notifications({ page, limit: 20 }),
    [page]
  );

  const payload = data?.data || { notifications: [], unread: 0, pagination: { page, pages: 1, total: 0 } };
  const notifications = payload.notifications || [];

  const markRead = async (notification) => {
    if (notification.is_read) return;
    try {
      await platform.readNotification(notification.id);
      reload();
      refreshNotifications?.();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const markAll = async () => {
    try {
      await platform.readAllNotifications();
      reload();
      refreshNotifications?.();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div className="pf-stack">
      {error ? <Alert>{error.message}</Alert> : null}
      <Card>
        <div className="pf-filter-bar" style={{ marginBottom: 0 }}>
          <span className="pf-muted">{payload.unread || 0} {t('common.unread')}</span>
          <span className="pf-spacer" />
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          <Button variant="secondary" icon={CheckCheck} onClick={markAll} disabled={!payload.unread}>
            {t('topbar.markAllRead')}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card><p className="pf-muted">{t('common.loading')}</p></Card>
      ) : notifications.length === 0 ? (
        <Card><EmptyState title={t('topbar.noNotifications')} hint={t('notifications.subtitle')} /></Card>
      ) : (
        <>
          <div className="pf-stack">
            {notifications.map((notification) => (
              <Card key={notification.id} padded>
                <div className="pf-notification-row">
                  <span className={`pf-notification-dot ${notification.is_read ? 'is-read' : ''}`} />
                  <div className="pf-notification-main">
                    <div className="pf-inline">
                      <strong className="pf-text-strong">{notification.title}</strong>
                      <Badge value={notification.type} tone="brand">{notification.type || 'info'}</Badge>
                      {!notification.is_read ? <Badge value="pending">{t('common.unread')}</Badge> : null}
                    </div>
                    {notification.message ? <p className="pf-text-small">{notification.message}</p> : null}
                    <span className="pf-text-small">{formatDateTime(notification.created_at)}</span>
                  </div>
                  <div className="pf-inline">
                    {notification.link ? (
                      <Button variant="ghost" size="sm" onClick={() => { window.location.href = notification.link; }}>
                        {t('common.view')}
                      </Button>
                    ) : null}
                    {!notification.is_read ? (
                      <Button variant="secondary" size="sm" onClick={() => markRead(notification)}>
                        {t('notifications.markRead')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={payload.pagination?.page || page} pages={payload.pagination?.pages || 1}
                      total={payload.pagination?.total} onPage={setPage} t={t} />
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Announcements = ({ t, canSend }) => {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyAnnouncement());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data, loading, error, reload } = useApi(
    () => platform.list('announcements', { page, limit: 20 }),
    [page]
  );

  const rows = data?.data || [];
  const pagination = data?.pagination || { page, pages: 1, total: rows.length };

  const openCreate = () => {
    setForm(emptyAnnouncement());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      ...emptyAnnouncement(),
      ...row,
      expires_at: row.expires_at ? String(row.expires_at).slice(0, 10) : ''
    });
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!form.title || !form.body) throw new Error('Title and message are required.');
      const payload = { ...form, expires_at: form.expires_at || null };
      if (modal.mode === 'create') await platform.create('announcements', payload);
      else await platform.update('announcements', modal.row.id, payload);
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
      await platform.remove('announcements', row.id);
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
          <span className="pf-spacer" />
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>{t('common.refresh')}</Button>
          {canSend ? <Button icon={Plus} onClick={openCreate}>{t('notifications.newAnnouncement')}</Button> : null}
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
                    <div className="pf-text-small">{String(row.body || '').slice(0, 90)}{String(row.body || '').length > 90 ? '…' : ''}</div>
                  </div>
                )
              },
              { key: 'audience', label: t('notifications.audience'), render: (row) => <Badge value={row.audience} tone="brand">{row.audience}</Badge> },
              { key: 'priority', label: t('notifications.priority'), render: (row) => <Badge value={row.priority} /> },
              { key: 'created_by_name', label: t('common.teacher'), render: (row) => row.created_by_name || '—' },
              { key: 'published_at', label: t('common.date'), render: (row) => formatDateTime(row.published_at) },
              { key: 'expires_at', label: t('notifications.expires'), render: (row) => row.expires_at ? formatDateTime(row.expires_at) : '—' },
              ...(canSend ? [{
                key: '__actions', label: t('common.actions'), align: 'right',
                render: (row) => (
                  <div className="pf-table__actions">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(row)}>{t('common.delete')}</Button>
                  </div>
                )
              }] : [])
            ]}
          />
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} t={t} />
        </div>
      </Card>

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? `${t('common.edit')} · ${t('notifications.announcements')}` : t('notifications.newAnnouncement')}
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
          <Field label={t('notifications.audience')}>
            <Select value={form.audience} onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}>
              <option value="all">{t('notifications.everyone')}</option>
              <option value="teachers">{t('common.teachers')}</option>
              <option value="students">{t('common.students')}</option>
              <option value="parents">{t('common.parent')}</option>
              <option value="staff">Staff</option>
              <option value="admins">{t('nav.administration')}</option>
            </Select>
          </Field>
          <Field label={t('notifications.priority')}>
            <Select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
              <option value="normal">{t('notifications.normal')}</option>
              <option value="high">{t('notifications.high')}</option>
              <option value="urgent">{t('notifications.urgent')}</option>
            </Select>
          </Field>
          <Field label={t('notifications.body')} required span={2}>
            <Textarea rows={5} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
          </Field>
          <Field label={t('notifications.expires')} span={2}>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm((prev) => ({ ...prev, expires_at: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default NotificationsPage;
