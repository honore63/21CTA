import { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Users, User, Info, CheckCircle, AlertTriangle, AlertCircle, Search, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import './AdminNotifications.css';

const typeOptions = [
    { value: 'info',    icon: <Info size={16} />,         label: 'Info',    color: '#3b82f6' },
    { value: 'success', icon: <CheckCircle size={16} />,  label: 'Success', color: '#22c55e' },
    { value: 'warning', icon: <AlertTriangle size={16} />,label: 'Warning', color: '#f59e0b' },
    { value: 'error',   icon: <AlertCircle size={16} />,  label: 'Urgent',  color: '#ef4444' },
];

const CustomUserSelect = ({ value, onChange, users }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handleClick = (e) => {
            if (!e.target.closest('.custom-user-select')) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = users.filter(u => 
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const selectedUser = users.find(u => u.id === value);

    return (
        <div className="custom-user-select">
            <div 
                className="custom-user-trigger" 
                onClick={() => setOpen(!open)}
            >
                <div className="selected-val">
                    {value === '' ? (
                        <><Users size={16} /> <span>All Users (Global)</span></>
                    ) : (
                        <><User size={16} /> <span>{selectedUser?.full_name}</span></>
                    )}
                </div>
                <ChevronDown size={14} className={`caret ${open ? 'open' : ''}`} />
            </div>
            
            {open && (
                <div className="custom-user-dropdown animate-scale-up">
                    <div className="search-box">
                        <Search size={14} />
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="custom-user-options">
                        <div 
                            className={`custom-user-option ${value === '' ? 'active' : ''}`}
                            onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                        >
                            <Users size={14} /> All Users (Broadcast)
                        </div>
                        {filtered.length === 0 ? (
                            <div className="no-results">No users found.</div>
                        ) : (
                            filtered.map(u => (
                                <div 
                                    key={u.id} 
                                    className={`custom-user-option ${value === u.id ? 'active' : ''}`}
                                    onClick={() => { onChange(u.id); setOpen(false); setSearch(''); }}
                                >
                                    <User size={14} />
                                    <div className="opt-info">
                                        <span className="opt-name">{u.full_name}</span>
                                        <span className="opt-email">{u.email}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({ user_id: '', title: '', message: '', type: 'info' });

    useEffect(() => {
        Promise.all([fetchNotifications(), fetchUsers()]);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications/all');
            setNotifications(res.data.data);
        } finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data.data);
        } catch {}
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!form.title || !form.message) return;
        setSending(true);
        try {
            await api.post('/notifications/send', {
                user_id: form.user_id || null,
                title: form.title,
                message: form.message,
                type: form.type
            });
            setForm({ user_id: '', title: '', message: '', type: 'info' });
            await fetchNotifications();
        } catch {
            alert('Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this notification?')) return;
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch {}
    };

    const formatTime = (ts) => new Date(ts).toLocaleString('en-GB', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="admin-notif-container animate-fade">
            <div className="admin-header-section">
                <h1 className="admin-page-title">Notifications Control</h1>
                <p className="admin-page-subtitle">Send system alerts and individual messages to platform users.</p>
            </div>

            <div className="admin-notif-main-grid">
                {/* ── Compose Panel ── */}
                <div className="card compose-card">
                    <div className="card-header-flex">
                        <h3><Bell size={18} /> New Broadcast</h3>
                    </div>
                    <form className="notif-form-premium" onSubmit={handleSend}>
                        <div className="form-group">
                            <label>Target Audience</label>
                            <CustomUserSelect 
                                value={form.user_id} 
                                onChange={val => setForm(p => ({ ...p, user_id: val }))} 
                                users={users} 
                            />
                        </div>

                        <div className="form-group">
                            <label>Alert Level</label>
                            <div className="notif-type-pill-group">
                                {typeOptions.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        className={`type-pill ${form.type === t.value ? 'active' : ''}`}
                                        style={form.type === t.value ? { background: `${t.color}20`, color: t.color, borderColor: t.color } : {}}
                                        onClick={() => setForm(p => ({ ...p, type: t.value }))}
                                    >
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Notification Title</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Weekly Maintenance"
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Detailed Message</label>
                            <textarea
                                rows={4}
                                className="form-input"
                                placeholder="What would you like to say?"
                                value={form.message}
                                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
                            {sending ? 'Processing...' : <><Send size={16} /> Send {form.user_id ? 'Individual' : 'Global'}</>}
                        </button>
                    </form>
                </div>

                {/* ── History Panel ── */}
                <div className="card history-card">
                    <div className="card-header-flex">
                        <h3><Bell size={18} /> Sent History</h3>
                        <span className="badge badge-surface">{notifications.length} Logs</span>
                    </div>
                    <div className="notif-history-list">
                        {loading ? (
                            <div className="spinner-center"><div className="spinner" /></div>
                        ) : notifications.length === 0 ? (
                            <div className="empty-notif-state">
                                <Bell size={48} className="muted-icon" />
                                <p>No notifications found in history.</p>
                            </div>
                        ) : (
                            notifications.map(n => {
                                const t = typeOptions.find(o => o.value === n.type) || typeOptions[0];
                                return (
                                    <div key={n.id} className="notif-history-item">
                                        <div className="notif-item-icon" style={{ color: t.color, background: `${t.color}15` }}>
                                            {t.icon}
                                        </div>
                                        <div className="notif-item-content">
                                            <div className="notif-item-header">
                                                <h4 className="notif-item-title">{n.title}</h4>
                                                <span className="notif-recipient-tag">
                                                    {n.user_id
                                                        ? <><User size={10} /> {n.full_name || 'Individual'}</>
                                                        : <><Users size={10} /> Global</>
                                                    }
                                                </span>
                                            </div>
                                            <p className="notif-item-msg">{n.message}</p>
                                            <div className="notif-item-footer">
                                                <span className="notif-item-time">{formatTime(n.created_at)}</span>
                                                <button className="notif-delete-btn" onClick={() => handleDelete(n.id)} title="Delete record">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
