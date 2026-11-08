import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import api from '../services/api';
import { FiBook, FiPlus, FiTrash2, FiArrowLeft, FiArrowRight, FiClock, FiFileText } from 'react-icons/fi';
import { useSubscription } from '../context/SubscriptionContext';
import './Dashboard.css';

const ClassDetailPage = () => {
    const { isPending, isFree } = useSubscription();
    const { classId } = useParams();
    const navigate = useNavigate();
    const [classData, setClassData] = useState(null);
    const [allSubjects, setAllSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [customSubjectName, setCustomSubjectName] = useState('');

    useEffect(() => {
        fetchClassData();
        fetchAllSubjects();
    }, [classId]);

    const fetchClassData = async () => {
        try {
            const response = await api.get(`/classes/${classId}`);
            const data = response.data.data;
            setClassData(data);
            
            // Redirect to first subject's units if available
            if (data.subjects && data.subjects.length > 0) {
                navigate(`/classes/${classId}/subjects/${data.subjects[0].id}/units`, { replace: true });
            }
        } catch (error) {
            toast.error('Failed to load class details');
            navigate('/classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllSubjects = async () => {
        try {
            const response = await api.get('/subjects');
            setAllSubjects(response.data.data);
        } catch (error) {
            console.error('Failed to load subjects');
        }
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();

        try {
            let subjectId = selectedSubject;

            if (isCustomSubject) {
                const createRes = await api.post('/subjects', {
                    name: customSubjectName.trim(),
                    is_custom: true
                });
                subjectId = createRes.data.data.id;
            }

            await api.post(`/classes/${classId}/subjects`, {
                subject_id: subjectId
            });
            toast.success('Subject assigned successfully');
            setShowModal(false);
            setSelectedSubject('');
            setCustomSubjectName('');
            setIsCustomSubject(false);
            fetchClassData();
            fetchAllSubjects();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign subject');
        }
    };

    const handleRemoveSubject = async (subjectId) => {
        if (!window.confirm('Are you sure you want to remove this subject?')) return;

        try {
            await api.delete(`/classes/${classId}/subjects/${subjectId}`);
            toast.success('Subject removed successfully');
            fetchClassData();
        } catch (error) {
            toast.error('Failed to remove subject');
        }
    };

    const getAvailableSubjects = () => {
        if (!classData) return [];
        const assignedIds = classData.subjects.map(s => s.id);
        return allSubjects.filter(s => !assignedIds.includes(s.id));
    };

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <div className="dashboard-container">
                    <div className="workspace-header skeleton" style={{ height: '100px', borderRadius: '24px' }}></div>
                    <div className="classes-grid mt-5">
                        {[1, 2, 3].map(i => <div key={i} className="premium-subject-card skeleton" style={{ height: '180px' }}></div>)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="dashboard-container">
                <div style={{ marginBottom: '24px' }}>
                    <button onClick={() => navigate('/classes')} className="btn btn-outline btn-sm btn-with-icon">
                        <FiArrowLeft /> Back to Classes
                    </button>
                </div>

                {isPending && (
                    <div className="alert alert-info animate-fade" style={{ marginBottom: 'var(--sp-6)', borderLeft: '4px solid var(--c-brand)' }}>
                        <FiClock size={18} />
                        <div>
                            <strong>Verification in Progress</strong> — We're confirming your access. You can still assign subjects and organize units while you wait.
                        </div>
                    </div>
                )}

                <div className="workspace-header">
                    <div>
                        <h1 className="workspace-title">{classData.name}</h1>
                        <p className="workspace-subtitle">
                            {classData.class_size} students • {classData.academic_year || 'Current'} Academic Year
                        </p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary btn-with-icon">
                        <FiPlus /> <span>Assign Subject</span>
                    </button>
                </div>

                <div className="section-header" style={{ marginTop: '48px' }}>
                    <h2 className="class-title" style={{ fontSize: '1.5rem', margin: 0 }}>Assigned Subjects</h2>
                </div>

                {classData.subjects && classData.subjects.length > 0 ? (
                    <div className="classes-grid">
                        {classData.subjects.map((subject) => (
                            <div key={subject.id} className="premium-subject-card-modern">
                                <div className="subject-card-header">
                                    <div className="subject-icon">
                                        <FiBook size={20} />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveSubject(subject.id)}
                                        className="action-btn-subtle delete"
                                        title="Remove subject"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                                
                                <div className="subject-info">
                                    <h3 className="subject-card-title">{subject.name}</h3>
                                    {subject.code && <span className="subject-code-tag">{subject.code}</span>}
                                </div>

                                <div className="subject-actions-grid">
                                    <Link to={`/classes/${classId}/subjects/${subject.id}/units`} className="btn btn-primary btn-sm btn-with-icon">
                                        <FiFileText size={14} /> <span>Units</span>
                                    </Link>
                                    <Link to={`/classes/${classId}/subjects/${subject.id}/schedule`} className="btn btn-outline btn-sm">
                                        Timetable
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-workspace">
                        <div className="empty-icon-box">
                            <FiBook size={48} />
                        </div>
                        <h3 className="workspace-title" style={{ fontSize: '1.5rem' }}>No subjects assigned</h3>
                        <p className="workspace-subtitle" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>Assign subjects to this class to start creating units and lessons.</p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-with-icon mt-4">
                            <FiPlus /> <span>Assign My First Subject</span>
                        </button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Subject">
                        <p className="profile-email" style={{ marginBottom: '32px' }}>Choose or create a subject for this class.</p>

                        <form onSubmit={handleAssignSubject}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', padding: '16px', border: `1px solid ${!isCustomSubject ? 'var(--color-primary-light)' : 'var(--border-color)'}`, borderRadius: '16px', background: !isCustomSubject ? '#eff6ff' : 'white' }}>
                                    <input type="radio" checked={!isCustomSubject} onChange={() => setIsCustomSubject(false)} style={{ display: 'none' }} />
                                    <span style={{ fontWeight: 800, fontSize: '14px', color: !isCustomSubject ? 'var(--color-primary-light)' : 'var(--color-gray-600)' }}>Select Existing</span>
                                    <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>REB standard subjects</span>
                                </label>
                                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', padding: '16px', border: `1px solid ${isCustomSubject ? 'var(--color-primary-light)' : 'var(--border-color)'}`, borderRadius: '16px', background: isCustomSubject ? '#eff6ff' : 'white' }}>
                                    <input type="radio" checked={isCustomSubject} onChange={() => setIsCustomSubject(true)} style={{ display: 'none' }} />
                                    <span style={{ fontWeight: 800, fontSize: '14px', color: isCustomSubject ? 'var(--color-primary-light)' : 'var(--color-gray-600)' }}>Create Custom</span>
                                    <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>For specialized courses</span>
                                </label>
                            </div>

                            {!isCustomSubject ? (
                                <div className="form-field" style={{ marginBottom: '32px' }}>
                                    <label className="info-label">Select Subject *</label>
                                    <select
                                        className="form-input"
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        required
                                        style={{ width: '100%', appearance: 'none' }}
                                    >
                                        <option value="">Choose from list...</option>
                                        {getAvailableSubjects().map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name} {subject.code && `(${subject.code})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="form-field" style={{ marginBottom: '32px' }}>
                                    <label className="info-label">Subject Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={customSubjectName}
                                        onChange={(e) => setCustomSubjectName(e.target.value)}
                                        placeholder="e.g., Robotics and IoT"
                                        required
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="update-btn-blue" disabled={!isCustomSubject && !selectedSubject} style={{ flex: 2 }}>
                                    Assign to {classData.name}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="update-btn-white" style={{ flex: 1, border: '1px solid var(--border-color)' }}>
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

const styles = `
    .premium-subject-card-modern {
        background: var(--c-surface);
        border: 1px solid var(--c-border-soft);
        border-radius: var(--r-2xl);
        padding: var(--sp-6);
        transition: all var(--t-fast);
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
    }
    .premium-subject-card-modern:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--c-brand-light);
    }
    .subject-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--sp-4);
    }
    .subject-icon {
        width: 40px;
        height: 40px;
        background: #f0f9ff;
        color: #0369a1;
        border-radius: var(--r-lg);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .subject-info {
        flex: 1;
        margin-bottom: var(--sp-6);
    }
    .subject-card-title {
        font-size: 1.125rem;
        font-weight: 800;
        color: var(--c-text-primary);
        margin: 0 0 6px 0;
        letter-spacing: -0.01em;
    }
    .subject-code-tag {
        font-size: 0.7rem;
        font-weight: 700;
        background: #f1f5f9;
        color: #475569;
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: uppercase;
    }
    .subject-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--sp-2);
    }
    .action-btn-subtle {
        width: 28px;
        height: 28px;
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
`;

// Add styles to head
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

export default ClassDetailPage;
