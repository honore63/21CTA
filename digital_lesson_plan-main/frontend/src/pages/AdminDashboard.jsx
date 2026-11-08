import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Cpu, Layers, Shield, Activity, 
    MessageSquare, Trash2, Bell, Eye, User, 
    CheckCircle, RefreshCw, ChevronRight, Search,
    Plus, AlertCircle, FileText, Database, DownloadCloud
} from 'lucide-react';
import api from '../services/api';
import { useApiCache } from '../hooks/useApiCache';
import { SkeletonAdminStat, SkeletonActivityRow } from '../components/Skeleton';
import { toast } from 'react-toastify';
import './AuthPages.css';
import './LessonPlan.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { data: statsData, loading: statsLoading, refetch: refetchStats } = useApiCache('/admin/stats');
    const { data: msgsData, loading: msgsLoading, refetch: refetchMsgs } = useApiCache('/contact');

    const stats = statsData;
    const [messages, setMessages] = useState([]);
    const loading = statsLoading;
    const [cleaning, setCleaning] = useState(false);
    const [backupping, setBackupping] = useState(false);

    useEffect(() => {
        if (msgsData) setMessages(Array.isArray(msgsData) ? msgsData : []);
    }, [msgsData]);


    const handleBackup = async () => {
        setBackupping(true);
        const toastId = toast.loading('Generating full database backup...');
        try {
            const response = await api.get('/admin/system/backup', {
                responseType: 'blob'
            });
            
            // Create a download link for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `lessonplan_backup_${new Date().toISOString().slice(0,10)}.sql`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.update(toastId, { render: 'Database backup downloaded successfully!', type: 'success', isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error('Backup failed:', error);
            toast.update(toastId, { render: 'Failed to generate backup', type: 'error', isLoading: false, autoClose: 3000 });
        } finally {
            setBackupping(false);
        }
    };

    const markMessageRead = async (id) => {
        try {
            await api.put(`/contact/${id}/read`);
            setMessages(messages.map(m => m.id === id ? { ...m, status: 'read' } : m));
            toast.success('Message marked as read');
        } catch (error) {
            toast.error('Failed to update message status');
        }
    };

    const deleteMessage = async (id) => {
        if (!window.confirm('Delete this message?')) return;
        try {
            await api.delete(`/contact/${id}`);
            setMessages(messages.filter(m => m.id !== id));
            toast.success('Message deleted');
        } catch (error) {
            toast.error('Failed to delete message');
        }
    };

    const handleCleanup = async () => {
        if (!window.confirm('Are you sure you want to cleanup OLD versions of lesson plans? This will keep only the LATEST version for each lesson.')) {
            return;
        }

        setCleaning(true);
        try {
            const response = await api.post('/admin/system/cleanup-lesson-plans');
            if (response.data.success) {
                toast.success(response.data.message);
                const statsRes = await api.get('/admin/stats');
                setStats(statsRes.data.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Database cleanup failed');
        } finally {
            setCleaning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', paddingBottom: 'var(--sp-12)' }}>
                <div className="dashboard-container" style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--sp-8)' }}>
                    {/* Header skeleton */}
                    <div style={{ marginBottom: 'var(--sp-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div className="skeleton-shimmer" style={{ height: 36, width: 220, borderRadius: 10, marginBottom: 8 }} />
                            <div className="skeleton-shimmer" style={{ height: 14, width: 340, borderRadius: 8 }} />
                        </div>
                        <div className="skeleton-shimmer" style={{ height: 40, width: 140, borderRadius: 10 }} />
                    </div>
                    {/* Stat cards skeleton */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-6)', marginBottom: 'var(--sp-10)' }}>
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonAdminStat key={i} />)}
                    </div>
                    {/* Content skeleton */}
                    <div style={{ display: 'grid', gap: 'var(--sp-6)' }}>
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)' }}>
                            <div className="skeleton-shimmer" style={{ height: 200, borderRadius: 12 }} />
                        </div>
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)', display: 'grid', gap: 'var(--sp-4)' }}>
                            {Array.from({ length: 4 }).map((_, i) => <SkeletonActivityRow key={i} />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
                <div className="auth-centered-card" style={{ textAlign: 'center', padding: 'var(--sp-12)' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-6)' }}>
                        <AlertCircle size={40} />
                    </div>
                    <h2 style={{ color: 'var(--c-text-primary)', marginBottom: 12 }}>Console Offline</h2>
                    <p style={{ color: 'var(--c-text-muted)', marginBottom: 24 }}>Couldn't retrieve system analytics. Please check your connection.</p>
                    <button className="vibrant-submit-btn" onClick={() => window.location.reload()}>Retry Connection</button>
                </div>
            </div>
        );
    }

    const { counts, dailyStats, recentUsers, recentPlans } = stats;

    const managementTools = [
        { label: 'Resource Library', desc: 'Manage official REB teacher guides.', icon: <FileText size={20} />, color: '#10b981', path: '/materials', btn: 'Manage' },
        { label: 'User Directory', desc: 'Control accounts and security.', icon: <Users size={20} />, color: '#1a6b5a', path: '/admin/users', btn: 'Users' },
        { label: 'Subject Library', desc: 'Core curriculum definitions.', icon: <Layers size={20} />, color: '#1a6b5a', path: '/admin/subjects', btn: 'Setup' },
        { label: 'REB Syllabuses', desc: 'Manage official syllabus data.', icon: <Cpu size={20} />, color: '#10b981', path: '/admin/syllabuses', btn: 'Manage' },
        { label: 'Traffic Logs', desc: 'Monitor visitor activity.', icon: <Eye size={20} />, color: '#1a6b5a', path: '/admin/visitors', btn: 'View' },
        { label: 'System Alerts', desc: 'Send global notifications.', icon: <Bell size={20} />, color: '#1a6b5a', path: '/admin/notifications', btn: 'Alert' },
    ];

    return (
        <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', paddingBottom: 'var(--sp-12)' }}>
            <div className="dashboard-container" style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--sp-8)' }}>
                
                {/* Header Section */}
                <div className="admin-console-header" style={{ marginBottom: 'var(--sp-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
                    <div>
                        <h1 className="auth-title-large" style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-2)' }}>Admin Console</h1>
                        <p className="auth-subtitle-soft">Real-time system oversight and platform management.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button 
                            className="vibrant-secondary-btn" 
                            style={{ width: 'auto', background: 'var(--c-brand-light)', color: 'var(--c-brand)', borderColor: 'var(--c-brand-soft)' }}
                            onClick={handleBackup}
                            disabled={backupping}
                        >
                            {backupping ? <RefreshCw size={18} className="spinner" /> : <Database size={18} />}
                            {backupping ? 'Exporting...' : 'Export Backup'}
                        </button>
                        <button 
                            className="vibrant-secondary-btn" 
                            style={{ width: 'auto', background: '#fef2f2', color: '#dc2626', borderColor: '#fee2e2' }}
                            onClick={handleCleanup}
                            disabled={cleaning}
                        >
                            {cleaning ? <RefreshCw size={18} className="spinner" /> : <Trash2 size={18} />}
                            {cleaning ? 'Cleaning...' : 'System Purge'}
                        </button>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-6)', marginBottom: 'var(--sp-10)' }}>
                    {[
                        { label: 'Active Educators', value: counts.users, icon: <Users />, color: 'var(--c-brand)', bg: 'var(--c-brand-light)' },
                        { label: 'System Generations', value: counts.lessonPlans, icon: <Cpu />, color: '#10b981', bg: '#ecfdf5' },
                        { label: 'Core Subjects', value: counts.subjects, icon: <Layers />, color: '#1a6b5a', bg: 'rgba(26, 107, 90, 0.1)' },
                        { label: 'Security Alerts', value: counts.suspended, icon: <Shield />, color: '#dc2626', bg: '#fef2f2' },
                    ].map((s, i) => (
                        <div key={i} className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {s.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4 }}>{s.label}</p>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-text-primary)' }}>{s.value}</h2>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="admin-two-col" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--sp-8)' }}>
                    
                    {/* Left Column */}
                    <div style={{ display: 'grid', gap: 'var(--sp-8)' }}>
                        
                        {/* Platform Activity Chart */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-8)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Activity size={20} style={{ color: 'var(--c-brand)' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Platform Activity</h3>
                                </div>
                                <span style={{ padding: '6px 12px', borderRadius: 20, background: 'var(--c-brand-light)', color: 'var(--c-brand)', fontSize: '0.75rem', fontWeight: 700 }}>LAST 7 DAYS</span>
                            </div>
                            
                            <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', paddingBottom: '20px', borderBottom: '1.5px solid var(--c-border-soft)' }}>
                                {dailyStats && dailyStats.length > 0 ? (
                                    dailyStats.map((day, idx) => {
                                        const maxCount = Math.max(...dailyStats.map(d => d.count), 1);
                                        const height = (day.count / maxCount) * 100;
                                        return (
                                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                <div 
                                                    style={{ 
                                                        width: '100%', 
                                                        height: `${Math.max(10, height)}%`, 
                                                        background: 'var(--c-brand)', 
                                                        borderRadius: '6px 6px 0 0',
                                                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        opacity: 0.8 + (height/500)
                                                    }} 
                                                    title={`${day.count} plans`}
                                                />
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ width: '100%', textAlign: 'center', color: 'var(--c-text-muted)' }}>No recent activity data available.</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                                {dailyStats && dailyStats.map((day, idx) => (
                                    <span key={idx} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase' }}>
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Recent Generations */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-6)' }}>
                                <CheckCircle size={20} style={{ color: '#10b981' }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Recent Generations</h3>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
                                {recentPlans.map(plan => (
                                    <div key={plan.id} style={{ padding: '14px 20px', background: 'var(--c-bg)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--c-border-soft)' }}>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 2 }}>{plan.lesson_title}</h4>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>{plan.teacher_name} • {plan.subject_name}</p>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-muted)', background: 'var(--c-surface-2)', padding: '4px 10px', borderRadius: 8 }}>
                                            {new Date(plan.teaching_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Management Tools Grid */}
                        <div className="admin-tools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-4)' }}>
                            {managementTools.map((tool, i) => (
                                <div key={i} className="auth-centered-card tool-card" onClick={() => navigate(tool.path)} style={{ maxWidth: 'none', padding: 'var(--sp-6)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--c-bg)', color: tool.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--c-border-soft)' }}>
                                            {tool.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 4 }}>{tool.label}</h4>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', lineHeight: 1.4 }}>{tool.desc}</p>
                                        </div>
                                    </div>
                                    <button className="vibrant-secondary-btn" style={{ height: 36, fontSize: '0.75rem', fontWeight: 700 }}>
                                        {tool.btn} <ChevronRight size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'grid', gap: 'var(--sp-8)', alignContent: 'start' }}>
                        
                        {/* Latest Registrations */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-6)' }}>
                                <Users size={20} style={{ color: 'var(--c-brand)' }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Latest Educators</h3>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                                {recentUsers.map(user => (
                                    <div 
                                        key={user.id} 
                                        onClick={() => navigate(`/admin/users/${user.id}`)}
                                        style={{ display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer', padding: '8px', borderRadius: 12, transition: 'background 0.2s' }}
                                        className="user-list-item"
                                    >
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--c-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem' }}>
                                            {user.full_name?.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{user.full_name}</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>{user.school_name || 'No school assigned'}</p>
                                        </div>
                                        <ChevronRight size={16} style={{ color: 'var(--c-text-muted)' }} />
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/admin/users')} className="vibrant-secondary-btn" style={{ marginTop: 'var(--sp-6)', width: '100%', borderStyle: 'dashed' }}>
                                View All Directory
                            </button>
                        </div>

                        {/* Support Inbox */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MessageSquare size={20} style={{ color: '#1a6b5a' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Support Inbox</h3>
                                </div>
                                <span style={{ padding: '4px 10px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', fontSize: '0.6875rem', fontWeight: 800 }}>
                                    {messages.filter(m => m.status === 'unread').length} NEW
                                </span>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                                {messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 'var(--sp-8)', border: '1.5px dashed var(--c-border-soft)', borderRadius: 20 }}>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>Inbox is clear.</p>
                                    </div>
                                ) : messages.slice(0, 3).map(msg => (
                                    <div key={msg.id} style={{ padding: '16px', background: 'var(--c-bg)', borderRadius: 16, borderLeft: msg.status === 'unread' ? '4px solid var(--c-brand)' : '1px solid var(--c-border-soft)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 800 }}>{msg.subject}</h4>
                                            <small style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)' }}>{new Date(msg.created_at).toLocaleDateString()}</small>
                                        </div>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginBottom: 12, lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{msg.message}</p>
                                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                            {msg.status === 'unread' && (
                                                <button onClick={() => markMessageRead(msg.id)} style={{ border: 'none', background: 'none', color: 'var(--c-brand)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Mark Read</button>
                                            )}
                                            <button onClick={() => deleteMessage(msg.id)} style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                .tool-card:hover {
                    border-color: var(--c-brand) !important;
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }
                .user-list-item:hover {
                    background: var(--c-surface-2) !important;
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
