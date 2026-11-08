import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    FiGrid, FiUsers, FiBook, FiBell, FiEye, FiLogOut,
    FiSun, FiMoon, FiMenu, FiX, FiChevronRight, FiShield, FiCreditCard
} from 'react-icons/fi';
import NotificationBell from '../../components/NotificationBell';
import './AdminLayout.css';

const navItems = [
    { path: '/dashboard',          icon: <FiGrid />,    label: 'Overview' },
    { path: '/admin/users',        icon: <FiUsers />,   label: 'Users' },
    { path: '/admin/subjects',     icon: <FiBook />,    label: 'Subjects' },
    { path: '/admin/syllabuses',   icon: <FiBook />,    label: 'Syllabuses' },
    { path: '/admin/subscriptions',icon: <FiCreditCard />, label: 'Subscriptions' },
    { path: '/admin/notifications',icon: <FiBell />,    label: 'Notifications' },
    { path: '/admin/visitors',     icon: <FiEye />,     label: 'Visitors' },
];

const AdminLayout = ({ children, title = 'Admin Panel' }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };

    const Sidebar = ({ mobile = false }) => (
        <aside className={`admin-sidebar ${collapsed && !mobile ? 'collapsed' : ''} ${mobile ? 'mobile' : ''}`}>
            <div className="admin-sidebar-header">
                {(!collapsed || mobile) && (
                    <div className="admin-brand">
                        <div className="admin-brand-icon"><FiShield size={18} /></div>
                        <span className="admin-brand-text">Admin</span>
                    </div>
                )}
                {!mobile && (
                    <button className="sidebar-collapse-btn" onClick={() => setCollapsed(p => !p)}>
                        {collapsed ? <FiChevronRight /> : <FiX />}
                    </button>
                )}
                {mobile && (
                    <button className="sidebar-collapse-btn" onClick={() => setMobileSidebarOpen(false)}>
                        <FiX />
                    </button>
                )}
            </div>

            <nav className="admin-nav">
                {navItems.map(item => {
                    const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`admin-nav-item ${active ? 'active' : ''}`}
                            onClick={() => mobile && setMobileSidebarOpen(false)}
                            title={collapsed && !mobile ? item.label : undefined}
                        >
                            <span className="admin-nav-icon">{item.icon}</span>
                            {(!collapsed || mobile) && <span className="admin-nav-label">{item.label}</span>}
                            {(!collapsed || mobile) && active && <span className="admin-nav-active-dot" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="admin-sidebar-footer">
                {(!collapsed || mobile) && (
                    <div className="admin-user-card">
                        <div className="admin-avatar">{user?.full_name?.charAt(0)}</div>
                        <div className="admin-user-info">
                            <p className="admin-user-name">{user?.full_name}</p>
                            <p className="admin-user-role">Administrator</p>
                        </div>
                    </div>
                )}
                <button className="admin-logout-btn" onClick={handleLogout} title="Logout">
                    <FiLogOut />
                    {(!collapsed || mobile) && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );

    return (
        <div className="admin-layout">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Overlay */}
            {mobileSidebarOpen && (
                <>
                    <div className="admin-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
                    <Sidebar mobile />
                </>
            )}

            {/* Main Area */}
            <div className="admin-main">
                {/* Top Bar */}
                <header className="admin-topbar">
                    <div className="admin-topbar-left">
                        <button className="admin-mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)}>
                            <FiMenu size={20} />
                        </button>
                        <div>
                            <h1 className="admin-page-title">{title}</h1>
                            <p className="admin-page-breadcrumb">
                                Admin · <span>{title}</span>
                            </p>
                        </div>
                    </div>
                    <div className="admin-topbar-right">
                        <NotificationBell />
                        <button className="admin-theme-btn" onClick={toggleTheme}>
                            {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="admin-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
