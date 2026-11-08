import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import platform, { SCHOOL_STORAGE_KEY } from '../services/platformApi';
import { translate, roleLabel } from './i18n';

const PlatformContext = createContext(null);

export const PlatformProvider = ({ children }) => {
  const [state, setState] = useState({
    ready: false,
    loading: true,
    error: null,
    user: null,
    isSuperAdmin: false,
    roles: [],
    permissions: [],
    school: null,
    schools: [],
    modules: [],
    unread: 0,
    language: 'en',
    theme: 'light'
  });

  const applyRemote = useCallback((payload) => {
    const language = payload.language || payload.user?.language || 'en';
    const theme = payload.theme || payload.user?.theme || 'light';
    document.body.setAttribute('data-theme', theme);
    document.documentElement.lang = language;
    localStorage.setItem('theme', theme);
    setState((prev) => ({
      ...prev,
      ready: true,
      loading: false,
      error: null,
      user: payload.user || null,
      isSuperAdmin: Boolean(payload.is_super_admin || payload.primary_role === 'super_admin'),
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      school: payload.school || null,
      schools: payload.schools || [],
      modules: payload.modules || [],
      unread: Number(payload.unread_notifications || 0),
      language,
      theme
    }));
  }, []);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState((prev) => ({ ...prev, ready: true, loading: false, user: null }));
      return;
    }
    try {
      const response = await platform.me();
      applyRemote(response.data);
    } catch (error) {
      setState((prev) => ({ ...prev, ready: true, loading: false, error: error.message }));
    }
  }, [applyRemote]);

  useEffect(() => {
    load();
  }, [load]);

  const setSchool = useCallback(async (schoolId) => {
    if (schoolId) localStorage.setItem(SCHOOL_STORAGE_KEY, String(schoolId));
    else localStorage.removeItem(SCHOOL_STORAGE_KEY);
    await load();
  }, [load]);

  const setLanguage = useCallback(async (language) => {
    setState((prev) => ({ ...prev, language }));
    document.documentElement.lang = language;
    try {
      await platform.updatePreferences({ language });
    } catch (_) {
      /* Preference sync is best-effort; the local choice still applies. */
    }
  }, []);

  const setTheme = useCallback(async (theme) => {
    setState((prev) => ({ ...prev, theme }));
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    try {
      await platform.updatePreferences({ theme });
    } catch (_) {
      /* Preference sync is best-effort; the local choice still applies. */
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await platform.notifications({ limit: 1 });
      setState((prev) => ({ ...prev, unread: Number(response.data?.unread || 0) }));
    } catch (_) {
      /* The badge is not critical. */
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(SCHOOL_STORAGE_KEY);
    setState((prev) => ({ ...prev, user: null, ready: true }));
  }, []);

  const hasPermission = useCallback(
    (...codes) => state.isSuperAdmin || codes.some((code) => state.permissions.includes(code)),
    [state.isSuperAdmin, state.permissions]
  );

  const hasModule = useCallback(
    (code) => {
      if (state.modules.length === 0) return true;
      return state.modules.some(
        (m) => m.code === code && m.is_enabled !== 0 && m.is_enabled !== false && m.enabled !== false
      );
    },
    [state.modules]
  );

  const t = useCallback((key, vars) => translate(state.language, key, vars), [state.language]);
  const role = useCallback((code) => roleLabel(state.language, code), [state.language]);

  const value = useMemo(
    () => ({
      ...state,
      reload: load,
      setSchool,
      setLanguage,
      setTheme,
      refreshNotifications,
      logout,
      hasPermission,
      hasModule,
      t,
      role
    }),
    [state, load, setSchool, setLanguage, setTheme, refreshNotifications, logout, hasPermission, hasModule, t, role]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within PlatformProvider');
  return context;
};
