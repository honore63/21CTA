import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import api from '../services/api';
import { FiBook, FiPlus, FiEdit, FiTrash2, FiUsers, FiArrowRight, FiSearch } from 'react-icons/fi';
import { SkeletonClassCard, SkeletonGrid } from '../components/Skeleton';
import './Dashboard.css';

const ClassesPage = () => {

    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [allSubjects, setAllSubjects] = useState([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        class_size: '',
        academic_year: '',
        subject_ids: []
    });

    useEffect(() => {
        fetchClasses();
        fetchSubjects();

        const handleRefresh = () => {
            fetchClasses();
            fetchSubjects();
        };
        window.addEventListener('refreshData', handleRefresh);
        return () => window.removeEventListener('refreshData', handleRefresh);
    }, []);

    const fetchSubjects = async () => {
        try {
            const response = await api.get('/subjects');
            setAllSubjects(response.data.data);
        } catch (error) {
            console.error('Failed to load subjects');
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await api.get('/classes');
            setClasses(response.data.data);
        } catch (error) {
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingClass) {
                await api.put(`/classes/${editingClass.id}`, formData);
                toast.success('Class updated successfully');
            } else {
                const response = await api.post('/classes', formData);
                const newClass = response.data.data;
                toast.success('Class created successfully');
                
                // If subjects were assigned, go directly to the first one's units
                if (formData.subject_ids && formData.subject_ids.length > 0) {
                    navigate(`/classes/${newClass.id}/subjects/${formData.subject_ids[0]}/units`);
                    return;
                }
            }

            setShowModal(false);
            setFormData({ name: '', class_size: '', academic_year: '', subject_ids: [] });
            setEditingClass(null);
            fetchClasses();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = async (classItem) => {
        setEditingClass(classItem);
        
        try {
            // Fetch the full class details to get current subject IDs
            const response = await api.get(`/classes/${classItem.id}`);
            const currentSubjectIds = response.data.data.subjects.map(s => s.id);
            
            setFormData({
                name: classItem.name,
                class_size: classItem.class_size,
                academic_year: classItem.academic_year || '',
                subject_ids: currentSubjectIds
            });
            setShowModal(true);
        } catch (error) {
            toast.error('Failed to load class subjects');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this class?')) return;

        try {
            await api.delete(`/classes/${id}`);
            toast.success('Class deleted successfully');
            fetchClasses();
        } catch (error) {
            toast.error('Failed to delete class');
        }
    };

    const openCreateModal = () => {
        setEditingClass(null);
        setFormData({ name: '', class_size: '', academic_year: '', subject_ids: [] });
        setSubjectSearch('');
        setShowModal(true);
    };

    const handleCreateNewSubject = async () => {
        if (!subjectSearch.trim()) return;
        
        try {
            const response = await api.post('/subjects', { name: subjectSearch.trim() });
            const newSubject = response.data.data;
            
            // Add to allSubjects and select it
            setAllSubjects(prev => [...prev, newSubject]);
            setFormData(prev => ({
                ...prev,
                subject_ids: [...prev.subject_ids, newSubject.id]
            }));
            setSubjectSearch('');
            toast.success(`Subject "${newSubject.name}" created and assigned`);
        } catch (error) {
            toast.error('Failed to create new subject');
        }
    };

    const filteredSubjects = allSubjects.filter(s => 
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
        formData.subject_ids.includes(s.id)
    );

    const toggleSubject = (subjectId) => {
        setFormData(prev => {
            const current = [...prev.subject_ids];
            const index = current.indexOf(subjectId);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(subjectId);
            }
            return { ...prev, subject_ids: current };
        });
    };

    return (
        <div className="animate-slide-up">
            <div className="dashboard-container">
                <header className="workspace-header">
                    <div>
                        <h1 className="workspace-title">Academic Classes</h1>
                        <p className="workspace-subtitle">Organize your teaching workflow and track curriculum progress.</p>
                    </div>
                    <button onClick={openCreateModal} className="btn btn-primary btn-with-icon">
                        <FiPlus /> <span>New Class</span>
                    </button>
                </header>



                {loading ? (
                    <SkeletonGrid count={6} component={SkeletonClassCard} />
                ) : classes.length > 0 ? (
                    <div className="classes-grid">
                        {classes.map((classItem) => (
                            <div key={classItem.id} className="premium-class-card-modern">
                                <div className="class-card-inner">
                                    <div className="class-header-row">
                                        <div className="class-avatar-mini">
                                            <FiUsers size={18} />
                                        </div>
                                        <div className="class-title-group">
                                            <h3 className="class-card-title-mini">{classItem.name}</h3>
                                            <span className="year-badge-mini">{classItem.academic_year || '2026'}</span>
                                        </div>
                                        <div className="class-actions-mini">
                                            <button onClick={() => handleEdit(classItem)} className="action-btn-subtle" title="Edit">
                                                <FiEdit size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(classItem.id)} className="action-btn-subtle delete" title="Delete">
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="class-stats-row-mini">
                                        <div className="class-stat-item">
                                            <span className="stat-value">{classItem.class_size}</span>
                                            <span className="stat-label">Students</span>
                                        </div>
                                        <div className="class-stat-divider"></div>
                                        <div className="class-stat-item">
                                            <span className="stat-value">{classItem.subject_count || 0}</span>
                                            <span className="stat-label">Subjects</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => {
                                            if (classItem.first_subject_id) {
                                                navigate(`/classes/${classItem.id}/subjects/${classItem.first_subject_id}/units`);
                                            } else {
                                                navigate(`/classes/${classItem.id}`);
                                            }
                                        }} 
                                        className="btn btn-primary btn-sm w-full btn-card-action-mini"
                                    >
                                        Manage Workspace <FiArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-workspace">
                        <div className="empty-icon-box">
                            <FiBook size={48} />
                        </div>
                        <h3 className="workspace-title" style={{ fontSize: '1.5rem' }}>No classes found</h3>
                        <p className="workspace-subtitle">Start by creating your first class to organize your teaching materials.</p>
                        <button onClick={openCreateModal} className="btn btn-primary mt-6">
                            <FiPlus /> Create Your First Class
                        </button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingClass ? 'Update Class' : 'New Class'}>
                        <form onSubmit={handleSubmit} className="custom-form">
                            <div className="form-section-premium">
                                <div className="form-field">
                                    <label className="field-label">Class Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Senior 4 PCM"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-row-dual">
                                    <div className="form-field">
                                        <label className="field-label">Learners Count *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Students"
                                            value={formData.class_size}
                                            onChange={(e) => setFormData({ ...formData, class_size: e.target.value })}
                                            required
                                            min="1"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label className="field-label">Academic Year</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., 2026"
                                            value={formData.academic_year}
                                            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section-premium mt-6">
                                <label className="field-label-accent">Assign Teaching Subjects</label>
                                <p className="field-help-top">Search or type a new subject to assign it to this class.</p>
                                
                                <div className="subject-search-wrapper">
                                    <div className="search-input-group">
                                        <FiSearch className="search-icon" />
                                        <input 
                                            type="text" 
                                            placeholder="Search or type new subject..." 
                                            className="search-input"
                                            value={subjectSearch}
                                            onChange={(e) => setSubjectSearch(e.target.value)}
                                        />
                                        {subjectSearch && !allSubjects.some(s => s.name.toLowerCase() === subjectSearch.toLowerCase()) && (
                                            <button 
                                                type="button" 
                                                className="add-new-subject-btn"
                                                onClick={handleCreateNewSubject}
                                            >
                                                <FiPlus size={14} /> Add New
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="subjects-multi-select">
                                    {filteredSubjects.map(subject => (
                                        <div 
                                            key={subject.id} 
                                            className={`subject-chip-modern ${formData.subject_ids.includes(subject.id) ? 'selected' : ''}`}
                                            onClick={() => toggleSubject(subject.id)}
                                        >
                                            <span className="chip-indicator"></span>
                                            {subject.name}
                                        </div>
                                    ))}
                                    {filteredSubjects.length === 0 && !subjectSearch && (
                                        <p className="no-subjects-hint">No subjects available. Type above to create one.</p>
                                    )}
                                </div>
                            </div>

                            <div className="form-actions-sticky mt-8">
                                <button type="submit" className="btn btn-primary btn-lg flex-1">
                                    {editingClass ? 'Update Class Workspace' : 'Create Class Workspace'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline btn-lg flex-1">
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

// Simple FiX icon since it's missing from imports but used in modal
const FiX = () => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const styles = `
    .premium-class-card-modern {
        background: var(--c-surface);
        border: 1px solid var(--c-border-soft);
        border-radius: var(--r-2xl);
        overflow: hidden;
        transition: all var(--t-fast);
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
    }
    .premium-class-card-modern:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--c-brand-light);
    }
    .class-card-inner {
        padding: var(--sp-4) var(--sp-5);
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 180px;
    }
    .class-header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: var(--sp-3);
    }
    .class-avatar-mini {
        width: 36px;
        height: 36px;
        background: var(--c-brand-light);
        color: var(--c-brand);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .class-title-group {
        flex: 1;
        min-width: 0;
    }
    .class-card-title-mini {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--c-text-primary);
        margin: 0;
        letter-spacing: -0.02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .year-badge-mini {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--c-text-muted);
        text-transform: uppercase;
    }
    .class-actions-mini {
        display: flex;
        gap: 4px;
    }
    .action-btn-subtle {
        width: 26px;
        height: 26px;
        border-radius: 6px;
        background: var(--c-surface-2);
        color: var(--c-text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
    }
    .action-btn-subtle:hover {
        background: var(--c-brand-light);
        color: var(--c-brand);
    }
    .action-btn-subtle.delete:hover {
        background: #fee2e2;
        color: #ef4444;
    }
    .class-stats-row-mini {
        display: flex;
        align-items: center;
        background: var(--c-surface-2);
        padding: var(--sp-2) var(--sp-3);
        border-radius: var(--r-lg);
        margin-bottom: var(--sp-4);
    }
    .class-stat-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .class-stat-divider {
        width: 1px;
        height: 20px;
        background: var(--c-border);
        margin: 0 var(--sp-2);
    }
    .stat-value {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--c-text-primary);
    }
    .stat-label {
        font-size: 0.6rem;
        font-weight: 600;
        color: var(--c-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .btn-card-action-mini {
        gap: 6px;
        font-weight: 700;
        padding: 8px;
        font-size: 0.85rem;
    }
    .subjects-multi-select {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        max-height: 150px;
        overflow-y: auto;
        padding: 4px;
    }
    .subject-chip {
        padding: 6px 12px;
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--c-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .subject-chip:hover {
        border-color: var(--c-brand);
        color: var(--c-brand);
    }
    .subject-chip.selected {
        background: var(--c-brand-light);
        border-color: var(--c-brand);
        color: var(--c-brand);
    }
    .field-help {
        font-size: 0.75rem;
        color: var(--c-text-muted);
        margin-top: 6px;
    }
    .form-section-premium {
        background: #f8fafc;
        padding: 24px;
        border-radius: 20px;
        border: 1px solid var(--c-border);
    }
    .form-row-dual {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 20px;
    }
    @media (max-width: 480px) {
        .form-row-dual { grid-template-columns: 1fr; }
    }
    .field-label-accent {
        display: block;
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--c-text-primary);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .field-help-top {
        font-size: 0.8rem;
        color: var(--c-text-muted);
        margin-bottom: 16px;
    }
    .subject-chip-modern {
        padding: 8px 16px;
        background: white;
        border: 1px solid var(--c-border);
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--c-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: var(--shadow-sm);
    }
    .subject-chip-modern:hover {
        transform: translateY(-2px);
        border-color: var(--c-brand);
    }
    .subject-chip-modern.selected {
        background: var(--c-brand);
        color: white;
        border-color: var(--c-brand);
    }
    .chip-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--c-border);
        transition: all 0.2s;
    }
    .subject-chip-modern.selected .chip-indicator {
        background: white;
        box-shadow: 0 0 8px rgba(255,255,255,0.8);
    }
    .form-actions-sticky {
        display: flex;
        gap: 16px;
        padding-top: 24px;
        border-top: 1px solid var(--c-border);
    }
    .subject-search-wrapper {
        margin-bottom: 16px;
    }
    .search-input-group {
        position: relative;
        display: flex;
        align-items: center;
        background: white;
        border: 1px solid var(--c-border);
        border-radius: 14px;
        padding: 0 12px;
        transition: all 0.2s;
    }
    .search-input-group:focus-within {
        border-color: var(--c-brand);
        box-shadow: 0 0 0 3px var(--c-brand-light);
    }
    .search-icon {
        color: var(--c-text-muted);
        margin-right: 10px;
    }
    .search-input {
        flex: 1;
        border: none;
        padding: 12px 0;
        font-size: 0.9rem;
        outline: none;
        background: transparent;
    }
    .add-new-subject-btn {
        background: var(--c-brand);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 0.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .add-new-subject-btn:hover {
        background: var(--c-brand-dark);
        transform: scale(1.05);
    }
    .no-subjects-hint {
        width: 100%;
        text-align: center;
        padding: 20px;
        font-size: 0.85rem;
        color: var(--c-text-muted);
        font-style: italic;
    }
`;

// Add styles to head
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

export default ClassesPage;
