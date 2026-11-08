import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiSearch, FiBook, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import api from '../services/api';

const ManageSubjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const response = await api.get('/subjects');
            setSubjects(response.data.data);
        } catch (error) {
            toast.error('Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (subject = null) => {
        if (subject) {
            setEditingSubject(subject);
            setFormData({ name: subject.name, code: subject.code });
        } else {
            setEditingSubject(null);
            setFormData({ name: '', code: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSubject) {
                const response = await api.put(`/subjects/${editingSubject.id}`, formData);
                setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, ...response.data.data } : s));
                toast.success('Subject updated successfully');
            } else {
                const response = await api.post('/subjects', formData);
                setSubjects(prev => [...prev, response.data.data]);
                toast.success('Subject created successfully');
            }
            setShowModal(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subject? This will affect units and lessons associated with it.')) return;
        try {
            await api.delete(`/subjects/${id}`);
            toast.success('Subject deleted');
            fetchSubjects();
        } catch (error) {
            toast.error('Failed to delete subject');
        }
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fadeIn">
            <div className="dashboard-container">
                <div className="workspace-header">
                    <div>
                        <h1 className="workspace-title">Curriculum Subjects</h1>
                        <p className="workspace-subtitle">Define and manage the global subject catalog.</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="update-btn-blue">
                        <FiPlus /> Add New Subject
                    </button>
                </div>

                <div className="settings-section" style={{ marginBottom: '32px', padding: '24px' }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            className="form-input"
                            style={{ paddingLeft: '48px', width: '100%' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="classes-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="premium-class-card skeleton" style={{ height: '160px' }}></div>)}
                    </div>
                ) : (
                    <div className="classes-grid">
                        {filteredSubjects.map(subject => (
                            <div key={subject.id} className="premium-class-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div className="info-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '16px' }}>
                                        <FiBook size={24} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleOpenModal(subject)} className="cancel-btn-circle" style={{ width: '32px', height: '32px', borderRadius: '10px' }}>
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(subject.id)} className="cancel-btn-circle" style={{ width: '32px', height: '32px', borderRadius: '10px', color: '#ef4444' }}>
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="class-title" style={{ fontSize: '1.25rem' }}>{subject.name}</h3>
                                <div className="class-badge" style={{ marginTop: '12px' }}>{subject.code}</div>
                            </div>
                        ))}
                    </div>
                )}

                {showModal && (
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSubject ? 'Edit Subject' : 'New Subject'}>
                        <p className="profile-email">Define subject details for the curriculum.</p>

                        <form onSubmit={handleSubmit} style={{ marginTop: '32px', display: 'grid', gap: '20px' }}>
                            <div className="form-field">
                                <label className="info-label">Subject Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Mathematics"
                                />
                            </div>
                            <div className="form-field">
                                <label className="info-label">Subject Code *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    placeholder="e.g., MATH-P4"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="submit" className="update-btn-blue" style={{ flex: 1 }}>
                                    {editingSubject ? 'Update Subject' : 'Create Subject'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="update-btn-white" style={{ border: '1px solid var(--border-color)' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default ManageSubjects;
