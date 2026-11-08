import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
    User, Mail, Briefcase, Calendar, Lock, Edit3, 
    X, Check, Shield, Award 
} from 'lucide-react';
import './AuthPages.css';
import './Dashboard.css';

const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const location = useLocation();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        school_name: ''
    });
    const [pwdData, setPwdData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalLessons: 0,
        totalPlans: 0
    });

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                school_name: user.school_name || ''
            });
            fetchUserStats();

            // Auto-enable editing if the user just logged in via Google and needs setup
            if (!user.school_name) {
                setEditing(true);
            }
        }
    }, [user]);

    const fetchUserStats = async () => {
        try {
            const response = await api.get('/classes/stats');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put('/auth/profile', formData);
            if (response.data.success) {
                updateProfile(response.data.data);
                toast.success('Profile updated successfully');
                setEditing(false);
            }
        } catch (error) {
            console.error('Update failed:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (pwdData.newPassword.length < 6) {
            return toast.error('New password must be at least 6 characters');
        }

        setPwdLoading(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: pwdData.currentPassword,
                newPassword: pwdData.newPassword
            });
            toast.success('Password changed successfully');
            setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setPwdLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', padding: 'var(--sp-8)' }}>
            <div className="dashboard-container" style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--sp-8)', alignItems: 'start' }}>

                    {/* Left Column: Profile Card */}
                    <div style={{ display: 'grid', gap: 'var(--sp-6)' }}>
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-8)', textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto var(--sp-6)' }}>
                                <div style={{ width: '100%', height: '100%', background: 'var(--c-brand)', color: '#fff', borderRadius: 'var(--r-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800 }}>
                                    {user.full_name?.charAt(0) || 'U'}
                                </div>
                                <div style={{ position: 'absolute', inset: -4, border: '2px solid var(--c-brand-light)', borderRadius: 'var(--r-2xl)', opacity: 0.5 }}></div>
                            </div>

                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: 4 }}>{user.full_name}</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--c-text-secondary)', marginBottom: 'var(--sp-6)' }}>{user.email}</p>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--c-brand-light)', color: 'var(--c-brand)', padding: '6px 14px', borderRadius: 'var(--r-full)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <Award size={14} /> {user.role} Educator
                            </div>

                            <div style={{ marginTop: 'var(--sp-8)', borderTop: '1px solid var(--c-border-soft)', paddingTop: 'var(--sp-6)', textAlign: 'left', display: 'grid', gap: 'var(--sp-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                                    <div style={{ width: 36, height: 36, background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-secondary)' }}>
                                        <Briefcase size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Institution</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--c-text-primary)', fontWeight: 600, margin: 0 }}>{user.school_name || 'Not specified'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                                    <div style={{ width: 36, height: 36, background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-secondary)' }}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Member Since</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--c-text-primary)', fontWeight: 600, margin: 0 }}>
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-3)' }}>
                            {[
                                { label: 'Classes', val: stats.totalClasses },
                                { label: 'Lessons', val: stats.totalLessons },
                                { label: 'AI Plans', val: stats.totalPlans }
                            ].map(s => (
                                <div key={s.label} className="auth-centered-card" style={{ padding: 'var(--sp-4)', textAlign: 'center', maxWidth: 'none' }}>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-brand)', margin: 0 }}>{s.val}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--c-text-muted)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Details & Edit */}
                    <div style={{ display: 'grid', gap: 'var(--sp-8)' }}>

                        {/* Personal Information */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-10)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-10)' }}>
                                <div>
                                    <h2 className="auth-title-large" style={{ margin: 0 }}>Personal Details</h2>
                                    <p className="auth-subtitle-soft" style={{ margin: 0 }}>Manage your public information and identity.</p>
                                </div>
                                {!editing ? (
                                    <button onClick={() => setEditing(true)} className="vibrant-secondary-btn" style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Edit3 size={18} /> Edit Profile
                                    </button>
                                ) : (
                                    <button onClick={() => { setEditing(false); setFormData({ full_name: user.full_name, school_name: user.school_name }); }} className="vibrant-back-link" style={{ background: 'var(--c-surface-2)' }}>
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleUpdate} className="vibrant-form">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>
                                    <div className="vibrant-field">
                                        <label>Full Name</label>
                                        <div className="vibrant-input-group">
                                            <User className="input-icon" />
                                            <input
                                                type="text"
                                                disabled={!editing}
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                style={{ opacity: editing ? 1 : 0.7 }}
                                                placeholder="Your full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="vibrant-field">
                                        <label>Work Email</label>
                                        <div className="vibrant-input-group">
                                            <Mail className="input-icon" />
                                            <input
                                                type="email"
                                                disabled
                                                value={user.email}
                                                style={{ opacity: 0.6, cursor: 'not-allowed', background: 'var(--c-bg)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="vibrant-field">
                                    <label>School / Institution</label>
                                    <div className="vibrant-input-group">
                                        <Briefcase className="input-icon" />
                                        <input
                                            type="text"
                                            disabled={!editing}
                                            value={formData.school_name}
                                            onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                            style={{ opacity: editing ? 1 : 0.7 }}
                                            placeholder="Where do you teach?"
                                        />
                                    </div>
                                </div>

                                {editing && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
                                        <button type="submit" className="vibrant-submit-btn" disabled={loading} style={{ width: 'auto', padding: '12px 32px' }}>
                                            {loading ? <div className="vibrant-spinner"></div> : <><Check size={20} /> Update Profile</>}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Security Section */}
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-10)', borderLeft: '4px solid var(--c-brand)' }}>
                            <div style={{ marginBottom: 'var(--sp-8)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <Shield size={24} style={{ color: 'var(--c-brand)' }} />
                                    <h2 className="auth-title-large" style={{ margin: 0 }}>Security & Password</h2>
                                </div>
                                <p className="auth-subtitle-soft" style={{ margin: 0 }}>Keep your account secure with a strong password.</p>
                            </div>

                            <form onSubmit={handlePasswordChange} className="vibrant-form">
                                <div className="vibrant-field">
                                    <label>Current Password</label>
                                    <div className="vibrant-input-group">
                                        <Lock className="input-icon" />
                                        <input
                                            type="password"
                                            value={pwdData.currentPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                                            placeholder="Leave blank if using Google Log-in"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>
                                    <div className="vibrant-field">
                                        <label>New Password</label>
                                        <div className="vibrant-input-group">
                                            <Lock className="input-icon" />
                                            <input
                                                type="password"
                                                value={pwdData.newPassword}
                                                onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                                placeholder="Min. 6 chars"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="vibrant-field">
                                        <label>Confirm New Password</label>
                                        <div className="vibrant-input-group">
                                            <Lock className="input-icon" />
                                            <input
                                                type="password"
                                                value={pwdData.confirmPassword}
                                                onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                                placeholder="Repeat new password"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
                                    <button type="submit" className="vibrant-submit-btn" disabled={pwdLoading} style={{ width: 'auto', padding: '12px 32px' }}>
                                        {pwdLoading ? <div className="vibrant-spinner"></div> : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
