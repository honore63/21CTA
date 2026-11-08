import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import {
  LayoutGrid, Users, Book, Bell, Eye, LogOut,
  Sun, Moon, Menu, X, ChevronRight, User,
  BookOpen, FileText, Layers, Settings, CreditCard,
  Volume2, VolumeX
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Screen Reader Synchronization State
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(() => {
    return localStorage.getItem('screenReaderActive') === 'true';
  });

  useEffect(() => {
    const syncState = () => {
      setIsScreenReaderActive(localStorage.getItem('screenReaderActive') === 'true');
    };
    window.addEventListener('screenReaderToggle', syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('screenReaderToggle', syncState);
      window.removeEventListener('storage', syncState);
    };
  }, []);

  const toggleScreenReader = () => {
    const nextState = !isScreenReaderActive;
    setIsScreenReaderActive(nextState);
    localStorage.setItem('screenReaderActive', String(nextState));
    window.dispatchEvent(new Event('screenReaderToggle'));
    if (!nextState) {
      window.speechSynthesis.cancel();
      document.querySelectorAll('.screen-reader-highlight').forEach(el => {
        el.classList.remove('screen-reader-highlight');
      });
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminNavItems = [
    { path: '/dashboard',           icon: <LayoutGrid size={20} />,     label: 'Workspace',       section: 'main' },
    { path: '/admin/users',         icon: <Users size={20} />,    label: 'User Management', section: 'admin' },
    { path: '/admin/subjects',      icon: <Layers size={20} />,   label: 'Subject Library', section: 'admin' },
    { path: '/admin/syllabuses',    icon: <Book size={20} />,     label: 'REB Syllabuses',  section: 'admin' },
    { path: '/admin/subscriptions', icon: <CreditCard size={20} />, label: 'Subscriptions',   section: 'admin' },
    { path: '/materials',           icon: <FileText size={20} />, label: 'Materials',       section: 'content' },
    { path: '/admin/notifications', icon: <Bell size={20} />,     label: 'System Alerts',   section: 'admin' },
    { path: '/admin/visitors',      icon: <Eye size={20} />,      label: 'Traffic Logs',    section: 'admin' },
    { path: '/profile',             icon: <User size={20} />,     label: 'My Account',      section: 'user' },
  ];

  const teacherNavItems = [
    { path: '/dashboard',            icon: <LayoutGrid size={20} />,     label: 'Workspace',          section: 'main' },
    { path: '/classes',              icon: <Layers size={20} />,   label: 'Academic Classes',   section: 'teaching' },
    { path: '/lesson-plans',         icon: <FileText size={20} />, label: 'Lesson Plans',       section: 'teaching' },
    { path: '/reference-materials',  icon: <BookOpen size={20} />, label: 'Teaching Resources', section: 'teaching' },
    { path: '/profile',              icon: <User size={20} />,     label: 'My Profile',         section: 'user' },
  ];

  const navItems = isAdmin ? adminNavItems : teacherNavItems;



  const Sidebar = ({ mobile = false }) => (
    <aside className={`dashboard-sidebar${collapsed && !mobile ? ' collapsed' : ''}${mobile ? ' mobile' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        {(!collapsed || mobile) && (
          <Link to="/" className="brand-area">
            <img src="/images/reallogo.png" alt="Logo" className="brand-logo" style={{ borderRadius: 0, objectFit: 'contain' }} />
            <div className="brand-info">
              <span className="brand-name">21st Century</span>
              <span className="brand-tagline">Lesson Plan Generator</span>
            </div>
          </Link>
        )}
        {!mobile ? (
          <button className="sidebar-toggle" onClick={() => setCollapsed(p => !p)} title={collapsed ? 'Expand' : 'Collapse'}>
            <ChevronRight size={20} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform var(--t-slow)' }} />
          </button>
        ) : (
          <button className="sidebar-toggle" onClick={() => setMobileSidebarOpen(false)}>
            <X size={20} />
          </button>
        )}
      </div>



      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const active = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item-link${active ? ' active' : ''}`}
              onClick={() => mobile && setMobileSidebarOpen(false)}
              title={collapsed && !mobile ? item.label : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {(!collapsed || mobile) && <span className="nav-item-label">{item.label}</span>}
              {active && <span className="nav-active-indicator" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {(!collapsed || mobile) && (
          <div className="user-profile-card">
            <div className="user-avatar">{user?.full_name?.charAt(0)}</div>
            <div className="user-text-info">
              <p className="user-display-name">{user?.full_name}</p>
              <p className="user-display-role">{isAdmin ? 'Administrator' : 'Teacher'}</p>
            </div>
          </div>
        )}
        <button className="sidebar-logout-btn" onClick={handleLogout} title={collapsed && !mobile ? 'Logout' : undefined}>
          <LogOut size={20} style={{ flexShrink: 0 }} />
          {(!collapsed || mobile) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-layout-root">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile overlay + Sidebar */}
      {mobileSidebarOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />
          <Sidebar mobile />
        </>
      )}

      {/* Main content area — pushes right of sidebar */}
      <div className="dashboard-main-area">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="mobile-toggle-btn" onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="topbar-header-info">
              <h2 className="topbar-title">{isAdmin ? 'Admin Console' : 'Teacher Workspace'}</h2>
            </div>
          </div>
          <div className="topbar-right">
            <NotificationBell />
            <button 
              onClick={toggleScreenReader} 
              className={`theme-toggle-btn ${isScreenReaderActive ? 'active' : ''}`}
              aria-label="Toggle Screen Reader"
              title="Toggle Screen Reader (Hover text to read)"
              style={{ 
                color: isScreenReaderActive ? 'var(--c-brand)' : 'var(--c-text-secondary)',
                backgroundColor: isScreenReaderActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                marginRight: '4px'
              }}
            >
              {isScreenReaderActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="topbar-user-pill" onClick={() => navigate('/profile')}>
              <div className="user-pill-avatar">{user?.full_name?.charAt(0)}</div>
              <span className="user-pill-name">{user?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="dashboard-content-scroll">
          <div className="content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
