import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import api, { invalidateCache } from '../services/api';
import { useApiCache } from '../hooks/useApiCache';
import { SkeletonUserRow } from '../components/Skeleton';
import { FiEdit, FiTrash2, FiUser, FiShield, FiAlertTriangle, FiEye, FiSearch, FiMail, FiHome, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import './Dashboard.css';

const ManageUsers = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('free');
    const [formData, setFormData] = useState({
        full_name: '',
        role: 'teacher',
        school_name: ''
    });

    const { data: rawUsers, loading, refetch: refetchUsers } = useApiCache('/admin/users');
    const users = Array.isArray(rawUsers) ? rawUsers : [];
    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.school_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const fetchUsers = () => { invalidateCache('admin'); refetchUsers(); };


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/users/${editingUser.id}`, formData);
            toast.success('User updated successfully');
            setShowModal(false);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name,
            role: user.role,
            school_name: user.school_name || ''
        });
        setNewPassword('');
        setSelectedPlan(user.subscription_plan || 'free');
        setShowModal(true);
    };

    const handleChangePlan = async () => {
        try {
            await api.patch(`/subscription/admin/users/${editingUser.id}/plan`, { plan: selectedPlan, months: 1 });
            toast.success(`Plan changed to ${selectedPlan} successfully`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change plan');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        try {
            await api.patch(`/admin/users/${editingUser.id}/reset-password`, { newPassword });
            toast.success('Password reset successfully');
            setNewPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await api.delete(`/admin/users/${id}`);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handleToggleSuspension = async (id, currentStatus) => {
        const action = currentStatus ? 'activate' : 'suspend';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await api.patch(`/admin/users/${id}/toggle-suspension`);
            toast.success(`User ${action}ed successfully`);
            fetchUsers();
        } catch (error) {
            toast.error(`Failed to ${action} user`);
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="dashboard-container">
                <div className="workspace-header" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 className="workspace-title text-3xl font-extrabold" style={{ letterSpacing: '-0.025em' }}>User Ecosystem</h1>
                        <p className="workspace-subtitle" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Monitor and manage all active educators in your workspace.</p>
                    </div>
                </div>

                <div className="search-and-stats" style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div className="search-wrapper" style={{ flex: '1 1 300px', position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or school..."
                            className="form-input"
                            style={{ paddingLeft: '48px', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', height: '54px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="stat-pills" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="badge" style={{ background: 'var(--bg-card)', color: 'var(--color-primary)', border: '1px solid var(--border-color)', padding: '10px 18px', borderRadius: '12px' }}>
                            <strong>{users.length}</strong> Total Users
                        </div>
                        <div className="badge" style={{ background: 'var(--color-success)', color: 'white', padding: '10px 18px', borderRadius: '12px' }}>
                            <strong>{users.filter(u => !u.is_suspended).length}</strong> Active
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="users-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '1.75rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                                    <div className="skeleton-shimmer" style={{ width: 56, height: 56, borderRadius: 18, flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div className="skeleton-shimmer" style={{ height: 16, width: '65%', borderRadius: 8 }} />
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <div className="skeleton-shimmer" style={{ height: 22, width: 60, borderRadius: 20 }} />
                                            <div className="skeleton-shimmer" style={{ height: 22, width: 80, borderRadius: 20 }} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                    <div className="skeleton-shimmer" style={{ height: 13, borderRadius: 8 }} />
                                    <div className="skeleton-shimmer" style={{ height: 13, width: '70%', borderRadius: 8 }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                    <div className="skeleton-shimmer" style={{ height: 38, borderRadius: 12 }} />
                                    <div className="skeleton-shimmer" style={{ height: 38, borderRadius: 12 }} />
                                    <div className="skeleton-shimmer" style={{ height: 38, borderRadius: 12 }} />
                                    <div className="skeleton-shimmer" style={{ height: 38, borderRadius: 12 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="users-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="user-premium-card" style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '1.75rem', border: '1px solid var(--border-color)', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '0', right: '0', padding: '12px' }}>
                                    <span className={`status-pill ${user.is_suspended ? 'suspended' : 'active'}`} style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {user.is_suspended ? 'Suspended' : 'Active'}
                                    </span>
                                </div>
                                
                                <div className="user-card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="user-avatar-lg" style={{ 
                                        width: '64px', 
                                        height: '64px', 
                                        background: user.role === 'admin' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                                        borderRadius: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
                                    }}>
                                        {user.role === 'admin' ? <FiShield size={28} /> : <FiUser size={28} />}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{user.full_name}</h3>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                            <span className="badge" style={{ fontSize: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                                                {user.role}
                                            </span>
                                            <span className="badge" style={{ fontSize: '12px', background: 
                                                user.subscription_plan === 'vip' ? 'rgba(234,179,8,0.15)' :
                                                user.subscription_plan === 'standard' ? 'rgba(99,102,241,0.15)' :
                                                user.subscription_plan === 'basic' ? 'rgba(16,185,129,0.15)' :
                                                'rgba(100,116,139,0.15)',
                                                color:
                                                user.subscription_plan === 'vip' ? '#d97706' :
                                                user.subscription_plan === 'standard' ? '#4f46e5' :
                                                user.subscription_plan === 'basic' ? '#059669' :
                                                '#64748b'
                                            }}>
                                                {user.subscription_plan === 'vip' ? '👑 VIP' :
                                                 user.subscription_plan === 'standard' ? '🚀 Standard' :
                                                 user.subscription_plan === 'basic' ? '⭐ Basic' : '🆓 Free'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="user-card-body" style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                        <FiMail size={16} /> <span>{user.email}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                        <FiHome size={16} /> <span>{user.school_name || 'No school assigned'}</span>
                                    </div>
                                </div>

                                <div className="user-card-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                    <Link to={`/admin/users/${user.id}`} className="btn btn-outline" style={{ padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '13px' }}>
                                        <FiEye /> View
                                    </Link>
                                    <button onClick={() => handleEdit(user)} className="btn btn-outline" style={{ padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '13px' }}>
                                        <FiEdit /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggleSuspension(user.id, user.is_suspended)}
                                        className="btn"
                                        style={{ 
                                            background: user.is_suspended ? 'var(--color-success)' : '#f59e0b', 
                                            color: 'white', 
                                            padding: '8px', 
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            fontSize: '13px',
                                            border: 'none'
                                        }}
                                    >
                                        {user.is_suspended ? <FiCheckCircle /> : <FiXCircle />} {user.is_suspended ? 'Activate' : 'Suspend'}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(user.id)} 
                                        className="btn" 
                                        style={{ 
                                            background: '#fee2e2', 
                                            color: '#ef4444', 
                                            padding: '8px', 
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            fontSize: '13px',
                                            border: 'none'
                                        }}
                                    >
                                        <FiTrash2 /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Edit Modal */}
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Edit User Account">
                    <p className="profile-email">Update administrative details for this user profile.</p>

                    <form onSubmit={handleSubmit} style={{ marginTop: '32px', display: 'grid', gap: '24px' }}>
                        <div className="form-field">
                            <label className="info-label">Full Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-field">
                            <label className="info-label">System Role *</label>
                            <select
                                className="form-input"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="teacher">Teacher</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label className="info-label">Assigned School</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.school_name}
                                placeholder="Enter school name"
                                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{
                                    flex: 2,
                                    minWidth: '160px',
                                }}
                            >
                                Save Changes
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                Cancel
                            </button>
                        </div>
                    </form>

                    <hr style={{ margin: '32px 0', borderColor: 'var(--c-border)' }} />
                    
                    <div className="form-field">
                        <label className="info-label" style={{ color: 'var(--c-brand)' }}>Force Reset Password</label>
                        <p style={{ fontSize: '0.85rem', color: 'var(--c-text-secondary)', marginBottom: '12px' }}>
                            Directly assign a new password for this user. They can use this immediately.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="form-input"
                                value={newPassword}
                                placeholder="Enter new password (min 6 chars)"
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={handleResetPassword}
                                disabled={newPassword.length < 6}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <hr style={{ margin: '32px 0', borderColor: 'var(--c-border)' }} />

                    <div className="form-field">
                        <label className="info-label" style={{ color: '#10b981' }}>Subscription Plan</label>
                        <p style={{ fontSize: '0.85rem', color: 'var(--c-text-secondary)', marginBottom: '12px' }}>
                            Instantly activate or change this user's plan. Takes effect immediately.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                className="form-input"
                                value={selectedPlan}
                                onChange={(e) => setSelectedPlan(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="free">🆓 Free</option>
                                <option value="basic">⭐ Basic Top-up</option>
                                <option value="standard">🚀 Standard (Monthly)</option>
                                <option value="vip">👑 VIP Pro (Monthly)</option>
                            </select>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleChangePlan}
                                style={{ background: '#10b981', whiteSpace: 'nowrap' }}
                            >
                                Apply Plan
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default ManageUsers;
