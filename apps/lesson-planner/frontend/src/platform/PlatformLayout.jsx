import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, X,
  Languages, Building2, UserCircle2, ChevronRight
} from 'lucide-react';
import { usePlatform } from './PlatformContext';
import { visibleNav } from './navConfig';
import { LANGUAGES } from './i18n';
import platform from '../services/platformApi';
import { formatDateTime, initials, titleCase, useDebounced } from './ui';
import './PlatformLayout.css';

const PlatformLayout = () => {
  const {
    user, school, schools, language, theme, unread, isSuperAdmin,
    setSchool, setLanguage, setTheme, logout, hasPermission, hasModule, t, role
  } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('platform_sidebar_collapsed') === 'true');
  const [menu, setMenu] = useState(null); // 'notifications' | 'profile' | 'language' | 'schools' | null
  const [notifications, setNotifications] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const debouncedSearch = useDebounced(search, 350);
  const navRef = useRef(null);
  const searchRef = useRef(null);

  const sections = useMemo(() => visibleNav(hasPermission, hasModule), [hasPermission, hasModule]);

  useEffect(() => {
    setSidebarOpen(false);
    setMenu(null);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('platform_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handler = (event) => {
      if (navRef.current && !navRef.current.contains(event.target) && !event.target.closest('.pf-topbar__menu')) {
        setMenu(null);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let active = true;
    if (debouncedSearch.trim().length < 2) {
      setSearchResults(null);
      setSearchError(null);
      return () => { active = false; };
    }
    platform.search(debouncedSearch.trim())
      .then((response) => {
        if (active) {
          setSearchResults(response.data?.groups || []);
          setSearchError(null);
          setSearchOpen(true);
        }
      })
      .catch((error) => {
        if (active) {
          setSearchResults([]);
          setSearchError(error.message);
          setSearchOpen(true);
        }
      });
    return () => { active = false; };
  }, [debouncedSearch]);

  const openNotifications = async () => {
    setMenu(menu === 'notifications' ? null : 'notifications');
    if (menu === 'notifications') return;
    setNotifLoading(true);
    try {
      const response = await platform.notifications({ limit: 8 });
      setNotifications(response.data);
    } catch (_) {
      setNotifications({ notifications: [], announcements: [], unread: unread });
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await platform.readAllNotifications();
      setNotifications((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, is_read: 1 })),
        unread: 0
      } : prev);
    } catch (_) { /* ignore */ }
  };

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      try { await platform.readNotification(notification.id); } catch (_) { /* ignore */ }
      setNotifications((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.map((n) => n.id === notification.id ? { ...n, is_read: 1 } : n),
        unread: Math.max(0, (prev.unread || 0) - 1)
      } : prev);
    }
    setMenu(null);
    if (notification.link) navigate(notification.link);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('platform_sidebar_collapsed');
    window.location.href = '/login';
  };

  const schoolValue = school?.id ? String(school.id) : '';

  return (
    <div className={`pf-shell ${collapsed ? 'is-collapsed' : ''}`}>
      {sidebarOpen ? <div className="pf-sidebar-backdrop" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`pf-sidebar ${sidebarOpen ? 'is-open' : ''}`} ref={navRef}>
        <div className="pf-sidebar__brand">
          <NavLink to="/app/dashboard" className="pf-brand">
            <img src="/images/reallogo.png" alt="" className="pf-brand__logo"
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="pf-brand__text">
              <strong>{t('app.name')}</strong>
              <small>{t('app.tagline')}</small>
            </span>
          </NavLink>
          <button className="pf-sidebar__close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="pf-sidebar__nav">
          {sections.map((section) => (
            <div key={section.id} className="pf-nav-section">
              <p className="pf-nav-section__label">{t(section.labelKey)}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `pf-nav-link ${isActive ? 'is-active' : ''}`}
                  title={t(item.labelKey)}
                >
                  <item.icon size={17} />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="pf-sidebar__foot">
          <button className="pf-collapse-btn" onClick={() => setCollapsed((v) => !v)}>
            <ChevronRight size={16} className={collapsed ? '' : 'is-flipped'} />
            <span>{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </aside>

      <div className="pf-main">
        <header className="pf-topbar">
          <div className="pf-topbar__left">
            <button className="pf-topbar__icon pf-mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={19} />
            </button>

            <div className="pf-topbar__search" ref={searchRef}>
              <Search size={16} className="pf-topbar__search-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (searchResults) setSearchOpen(true); }}
                placeholder={t('common.searchPlaceholder')}
                aria-label={t('common.search')}
              />
              {search ? (
                <button className="pf-topbar__clear" onClick={() => { setSearch(''); setSearchResults(null); }} aria-label="Clear search">
                  <X size={14} />
                </button>
              ) : null}
              {searchOpen ? (
                <div className="pf-search-panel">
                  {search.trim().length < 2 ? (
                    <p className="pf-search-hint">{t('topbar.searchEmpty')}</p>
                  ) : searchError ? (
                    <p className="pf-search-hint">{searchError}</p>
                  ) : !searchResults || searchResults.length === 0 ? (
                    <p className="pf-search-hint">{t('topbar.searchNoResults')}</p>
                  ) : (
                    searchResults.map((group) => (
                      <div key={group.group} className="pf-search-group">
                        <p className="pf-search-group__label">{titleCase(group.group)}</p>
                        {group.items.map((item) => (
                          <button
                            key={`${group.group}-${item.id}`}
                            className="pf-search-result"
                            onClick={() => {
                              setSearchOpen(false);
                              setSearch('');
                              navigate(group.link);
                            }}
                          >
                            <span className="pf-search-result__label">{item.label}</span>
                            {item.subtitle ? <span className="pf-search-result__meta">{item.subtitle}</span> : null}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="pf-topbar__right">
            {schools.length > 1 || isSuperAdmin ? (
              <div className="pf-topbar__menu">
                <button className="pf-school-switch" onClick={() => setMenu(menu === 'schools' ? null : 'schools')}>
                  <Building2 size={15} />
                  <span className="pf-school-switch__name">
                    {school?.name || t('topbar.allSchools')}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {menu === 'schools' ? (
                  <div className="pf-dropdown pf-dropdown--schools">
                    <p className="pf-dropdown__title">{t('topbar.schoolScope')}</p>
                    {isSuperAdmin ? (
                      <button
                        className={`pf-dropdown__item ${!school ? 'is-active' : ''}`}
                        onClick={() => { setSchool(null); setMenu(null); }}
                      >
                        {t('topbar.allSchools')}
                      </button>
                    ) : null}
                    {schools.map((s) => (
                      <button
                        key={s.id}
                        className={`pf-dropdown__item ${school?.id === s.id ? 'is-active' : ''}`}
                        onClick={() => { setSchool(s.id); setMenu(null); }}
                      >
                        <span>{s.name}</span>
                        {s.code ? <small>{s.code}</small> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : school ? (
              <span className="pf-school-chip"><Building2 size={14} /> {school.name}</span>
            ) : null}

            <div className="pf-topbar__menu">
              <button className="pf-topbar__icon" onClick={() => setMenu(menu === 'language' ? null : 'language')}
                      aria-label={t('common.language')} title={t('common.language')}>
                <Languages size={18} />
                <span className="pf-topbar__mini">{language.toUpperCase()}</span>
              </button>
              {menu === 'language' ? (
                <div className="pf-dropdown pf-dropdown--compact">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`pf-dropdown__item ${language === lang.code ? 'is-active' : ''}`}
                      onClick={() => { setLanguage(lang.code); setMenu(null); }}
                    >
                      <span>{lang.label}</span>
                      <small>{lang.short}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button className="pf-topbar__icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label={t('common.theme')} title={t('common.theme')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="pf-topbar__menu">
              <button className="pf-topbar__icon pf-topbar__bell" onClick={openNotifications}
                      aria-label={t('common.notifications')}>
                <Bell size={18} />
                {unread > 0 ? <span className="pf-bell-badge">{unread > 99 ? '99+' : unread}</span> : null}
              </button>
              {menu === 'notifications' ? (
                <div className="pf-dropdown pf-dropdown--notifications">
                  <header className="pf-dropdown__head">
                    <strong>{t('common.notifications')}</strong>
                    <button className="pf-link-btn" onClick={markAllRead}>
                      <CheckCheck size={14} /> {t('topbar.markAllRead')}
                    </button>
                  </header>
                  {notifLoading ? (
                    <p className="pf-search-hint">{t('common.loading')}</p>
                  ) : (notifications?.notifications || []).length === 0 ? (
                    <p className="pf-search-hint">{t('topbar.noNotifications')}</p>
                  ) : (
                    notifications.notifications.map((notification) => (
                      <button key={notification.id}
                              className={`pf-notification ${notification.is_read ? '' : 'is-unread'}`}
                              onClick={() => openNotification(notification)}>
                        <span className="pf-notification__title">{notification.title}</span>
                        {notification.message ? <span className="pf-notification__body">{notification.message}</span> : null}
                        <span className="pf-notification__time">{formatDateTime(notification.created_at)}</span>
                      </button>
                    ))
                  )}
                  <button className="pf-dropdown__footer" onClick={() => { setMenu(null); navigate('/app/notifications'); }}>
                    {t('topbar.viewAll')} <ChevronRight size={14} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="pf-topbar__menu">
              <button className="pf-user-btn" onClick={() => setMenu(menu === 'profile' ? null : 'profile')}>
                <span className="pf-avatar">
                  {user?.profile_photo ? <img src={user.profile_photo} alt="" /> : initials(user?.full_name)}
                </span>
                <span className="pf-user-btn__text">
                  <strong>{user?.full_name}</strong>
                  <small>{role(user?.role)}</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {menu === 'profile' ? (
                <div className="pf-dropdown pf-dropdown--profile">
                  <div className="pf-dropdown__profile">
                    <span className="pf-avatar pf-avatar--lg">
                      {user?.profile_photo ? <img src={user.profile_photo} alt="" /> : initials(user?.full_name)}
                    </span>
                    <div>
                      <strong>{user?.full_name}</strong>
                      <small>{user?.email}</small>
                    </div>
                  </div>
                  <button className="pf-dropdown__item" onClick={() => { setMenu(null); navigate('/app/settings'); }}>
                    <UserCircle2 size={16} /> {t('topbar.profile')}
                  </button>
                  <button className="pf-dropdown__item" onClick={() => { setMenu(null); navigate('/app/settings?tab=preferences'); }}>
                    <Settings size={16} /> {t('topbar.preferences')}
                  </button>
                  <button className="pf-dropdown__item pf-dropdown__item--danger" onClick={handleLogout}>
                    <LogOut size={16} /> {t('topbar.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="pf-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
