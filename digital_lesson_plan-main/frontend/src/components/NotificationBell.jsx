import { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiInfo, FiAlertTriangle, FiAlertCircle, FiX } from 'react-icons/fi';
import api from '../services/api';
import './NotificationBell.css';

const typeIcon = {
    info: <FiInfo />,
    success: <FiCheckCircle />,
    warning: <FiAlertTriangle />,
    error: <FiAlertCircle />
};

const typeColor = {
    info: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444'
};

const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            setUnreadCount(res.data.count);
        } catch {}
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        setOpen(prev => !prev);
        if (!open) fetchNotifications();
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/mark-read', { ids: 'all' });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {}
    };

    const markOneRead = async (id) => {
        try {
            await api.put('/notifications/mark-read', { ids: [id] });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {}
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className="notif-bell-wrapper" ref={dropdownRef}>
            <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
                <FiBell size={20} />
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="notif-mark-all" onClick={markAllRead}>
                                <FiCheck size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-list">
                        {loading ? (
                            <div className="notif-empty">
                                <div className="notif-spinner" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notif-empty">
                                <FiBell size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                    onClick={() => !n.is_read && markOneRead(n.id)}
                                >
                                    <div className="notif-icon" style={{ background: `${typeColor[n.type]}20`, color: typeColor[n.type] }}>
                                        {typeIcon[n.type]}
                                    </div>
                                    <div className="notif-content">
                                        <p className="notif-title">{n.title}</p>
                                        <p className="notif-message">{n.message}</p>
                                        <span className="notif-time">{formatTime(n.created_at)}</span>
                                    </div>
                                    {!n.is_read && <div className="notif-dot" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
