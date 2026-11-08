import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { 
    User, Users, Book, List, Clock, MapPin, 
    Calendar, ArrowLeft, Home, Shield, CreditCard, 
    CheckCircle, AlertCircle, Eye, Trash2, Mail,
    ChevronRight, ExternalLink
} from 'lucide-react';
import './AuthPages.css';
import './LessonPlan.css';

const UserDetails = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState('free');
    const [updatingPlan, setUpdatingPlan] = useState(false);

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            const response = await api.get(`/admin/users/${userId}`);
            const userData = response.data.data;
            setUser(userData);
            // If there's a requested plan, default to that for approval
            setSelectedPlan(userData.requested_plan || userData.subscription_plan || 'free');
        } catch (error) {
            toast.error('Failed to load user details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = async () => {
        setUpdatingPlan(true);
        try {
            await api.patch(`/subscription/admin/users/${userId}/plan`, { plan: selectedPlan, months: 1 });
            toast.success(`Subscription updated to ${selectedPlan.toUpperCase()}`);
            fetchUserDetails();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update subscription');
        } finally {
            setUpdatingPlan(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
                <div className="vibrant-spinner" style={{ width: 48, height: 48 }}></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
                <div className="auth-centered-card" style={{ textAlign: 'center', padding: 'var(--sp-12)' }}>
                    <h3 style={{ color: 'var(--c-text-primary)', marginBottom: 16 }}>Educator not found</h3>
                    <button className="vibrant-submit-btn" onClick={() => navigate('/admin/users')}>Back to Directory</button>
                </div>
            </div>
        );
    }

    const isPending = user.subscription_status === 'pending';

    return (
        <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', paddingBottom: 'var(--sp-12)' }}>
            <div className="dashboard-container" style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--sp-8)' }}>
                
                <button onClick={() => navigate('/admin/users')} className="vibrant-back-link" style={{ marginBottom: 'var(--sp-8)' }}>
                    <ArrowLeft size={18} /> Back to Directory
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--sp-8)', alignItems: 'start' }}>
                    
                    {/* Left Column */}
                    <div style={{ display: 'grid', gap: 'var(--sp-8)' }}>
                        
                        {/* Profile Overview Card */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)', textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto var(--sp-6)' }}>
                                <div style={{ width: '100%', height: '100%', background: 'var(--c-brand)', color: '#fff', borderRadius: 'var(--r-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800 }}>
                                    {user.full_name?.charAt(0) || 'U'}
                                </div>
                                <div style={{ position: 'absolute', bottom: -4, right: -4 }}>
                                    <span style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: 'var(--r-full)', 
                                        fontSize: '0.625rem', 
                                        fontWeight: 800, 
                                        textTransform: 'uppercase',
                                        background: user.is_suspended ? '#fee2e2' : '#ecfdf5',
                                        color: user.is_suspended ? '#dc2626' : '#10b981',
                                        border: '2px solid var(--c-bg)'
                                    }}>
                                        {user.is_suspended ? 'Suspended' : 'Active'}
                                    </span>
                                </div>
                            </div>

                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: 4 }}>{user.full_name}</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', marginBottom: 'var(--sp-6)' }}>{user.email}</p>

                            <div style={{ display: 'grid', gap: 'var(--sp-4)', textAlign: 'left', borderTop: '1px solid var(--c-border-soft)', paddingTop: 'var(--sp-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ padding: 8, background: 'var(--c-surface-2)', borderRadius: 10, color: 'var(--c-text-secondary)' }}><Home size={16} /></div>
                                    <div>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', margin: 0 }}>Institution</p>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{user.school_name || 'Not Specified'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ padding: 8, background: 'var(--c-surface-2)', borderRadius: 10, color: 'var(--c-text-secondary)' }}><Calendar size={16} /></div>
                                    <div>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', margin: 0 }}>Member Since</p>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Management */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-6)' }}>
                                <CreditCard size={20} style={{ color: 'var(--c-brand)' }} />
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Subscription Management</h3>
                            </div>

                            <div style={{ background: 'var(--c-bg)', borderRadius: 16, padding: '16px', marginBottom: 'var(--sp-6)', border: '1px solid var(--c-border-soft)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>Active Plan</span>
                                    <span style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--c-brand-light)', color: 'var(--c-brand)', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                        {user.subscription_plan || 'FREE'}
                                    </span>
                                </div>
                                
                                {isPending && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 0', borderTop: '1px dashed var(--c-border-soft)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 800 }}>REQUESTED UPGRADE</span>
                                        <span style={{ padding: '4px 10px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                            {user.requested_plan || 'PENDING'}
                                        </span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>Status</span>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: user.subscription_status === 'active' ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {user.subscription_status === 'active' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                        {user.subscription_status?.toUpperCase() || 'ACTIVE'}
                                    </span>
                                </div>
                            </div>

                            {user.transaction_id && (
                                <div style={{ marginBottom: 'var(--sp-6)' }}>
                                    <p style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Last Transaction ID</p>
                                    <code style={{ background: 'var(--c-surface-2)', padding: '6px 12px', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--c-brand)', display: 'block', border: '1px solid var(--c-border-soft)' }}>
                                        {user.transaction_id}
                                    </code>
                                </div>
                            )}

                            <div className="vibrant-field">
                                <label>Action: Set New Status</label>
                                <select 
                                    className="vibrant-input" 
                                    style={{ width: '100%', marginBottom: 'var(--sp-4)' }}
                                    value={selectedPlan}
                                    onChange={(e) => setSelectedPlan(e.target.value)}
                                >
                                    <option value="free">Downgrade to Free</option>
                                    <option value="basic">Approve Basic Top-up</option>
                                    <option value="standard">Approve Standard (Monthly)</option>
                                    <option value="vip">Approve VIP Pro (Monthly)</option>
                                </select>
                                <button 
                                    className="vibrant-submit-btn" 
                                    style={{ width: '100%', gap: 8 }}
                                    onClick={handleUpdatePlan}
                                    disabled={updatingPlan || (selectedPlan === user.subscription_plan && !isPending)}
                                >
                                    {updatingPlan ? <RefreshCw size={18} className="spinner" /> : <Shield size={18} />}
                                    {updatingPlan ? 'Updating...' : isPending ? 'Approve & Activate' : 'Update Subscription'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'grid', gap: 'var(--sp-8)' }}>
                        
                        {/* Classes Grid */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: '0' }}>
                            <div style={{ padding: '24px 32px', background: 'var(--c-bg)', borderBottom: '1.5px solid var(--c-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Users size={20} style={{ color: 'var(--c-brand)' }} />
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Academic Classes</h3>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-muted)' }}>{user.classes.length} Classes</span>
                            </div>
                            <div style={{ padding: '24px 32px' }}>
                                {user.classes.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--sp-4)' }}>
                                        {user.classes.map(cls => (
                                            <div key={cls.id} style={{ padding: '16px', borderRadius: 16, background: 'var(--c-surface-2)', border: '1px solid var(--c-border-soft)' }}>
                                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: 8 }}>{cls.name}</h4>
                                                <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {cls.class_size}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {cls.academic_year}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: 'var(--c-text-muted)', fontStyle: 'italic', padding: '24px 0' }}>No classes assigned to this teacher.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Generations List */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: '0' }}>
                            <div style={{ padding: '24px 32px', background: 'var(--c-bg)', borderBottom: '1.5px solid var(--c-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Book size={20} style={{ color: 'var(--c-brand)' }} />
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Platform Content</h3>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-muted)' }}>Latest {user.lesson_plans.length}</span>
                            </div>
                            <div>
                                {user.lesson_plans.length > 0 ? (
                                    user.lesson_plans.map((lp, i) => (
                                        <div 
                                            key={lp.id} 
                                            onClick={() => navigate(`/lessons/${lp.id}/plan`)}
                                            style={{ 
                                                padding: '20px 32px', 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                borderBottom: i === user.lesson_plans.length - 1 ? 'none' : '1px solid var(--c-border-soft)',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            className="user-activity-item"
                                        >
                                            <div>
                                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 4 }}>{lp.lesson_title}</h4>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--c-brand)', textTransform: 'uppercase' }}>{lp.subject_name}</span>
                                                    <span style={{ fontSize: '0.6875rem', color: 'var(--c-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(lp.teaching_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} style={{ color: 'var(--c-text-muted)' }} />
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '48px', textAlign: 'center' }}>
                                        <Book size={32} style={{ color: 'var(--c-border-soft)', marginBottom: 12 }} />
                                        <p style={{ color: 'var(--c-text-muted)', fontStyle: 'italic' }}>No content generated yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                .user-activity-item:hover {
                    background: var(--c-surface-2);
                }
            `}</style>
        </div>
    );
};

export default UserDetails;
