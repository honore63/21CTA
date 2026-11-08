import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import api from '../services/api';
import { FiBook, FiPlus, FiEdit, FiTrash2, FiArrowLeft, FiFileText, FiZap, FiCalendar, FiClock, FiLayers, FiActivity } from 'react-icons/fi';
import './Dashboard.css';
import { SkeletonUnitCard, SkeletonGrid } from '../components/Skeleton';
import { useSubjectLanguage } from '../hooks/useSubjectLanguage';
import { useSubscription } from '../context/SubscriptionContext';

const SPECIAL_NEEDS_TYPES = [
    'Visual impairment',
    'Hearing impairment',
    'Physical disability',
    'Intellectual disability',
    'Learning disability (e.g. Dyslexia)',
    'Social, Emotional & Behavioral difficulties',
    'Speech & Language difficulties'
];

const LessonsPage = () => {
    const { unitId } = useParams();
    const navigate = useNavigate();

    const [lessons, setLessons] = useState([]);
    const [unitData, setUnitData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [refMaterials, setRefMaterials] = useState([]);
    const [formData, setFormData] = useState({
        lesson_number: '',
        lesson_title: '',
        duration: '80',
        teaching_date: '',
        term: 'Term 1',
        location: 'inside',
        school_name: '',
        teacher_name: '',
        class_size: '40',
        special_needs: [],
        reference_materials: []
    });

    // TODO: We need subject name to determine language. 
    // Currently unitData doesn't strictly have subject name, but we can infer or pass it if needed.
    // For now assuming we can get it or force English if missing, but ideally we fetch subject data.
    // Let's rely on unitData having subject info if possible or we fetch it.
    // Actually fetches from API usually return nested data.
    // Let's assume English default for safety if subject isn't available immediately.
    const { t } = useSubjectLanguage(unitData?.subject_name || 'English');
    // Note: The previous fetchData for units/lessons might not return subject_name. 
    // If unitData doesn't have it, we might need to fetch subject or rely on a prop.
    // Looking at UnitsPage, we had subjectId. Here we only have unitId in URL.
    // We might need to fetch unit details which usually includes subject_id, then appropriate subject.
    // For this implementation, I'll rely on the fact that we might need to update the backend to send subject_name with unit, 
    // OR just fetch it. *Self-correction*: The `getLessons` controller joins units and subjects, returning `subject_name`.
    // So `lessons[0].subject_name` should exist if lessons exist.

    // Let's refine the hook usage:
    const subjectName = lessons.length > 0 ? lessons[0].subject_name : (unitData?.subject_name || '');
    const { t: translate } = useSubjectLanguage(subjectName);
    // Renaming to avoid conflict if I used t before.


    useEffect(() => {
        fetchData();
    }, [unitId]);

    const fetchData = async () => {
        try {
            const lessonsRes = await api.get(`/lessons/units/${unitId}/lessons`);
            setLessons(lessonsRes.data.data);

            if (lessonsRes.data.data.length > 0) {
                setUnitData({
                    unit_title: lessonsRes.data.data[0].unit_title,
                    unit_number: lessonsRes.data.data[0].unit_number
                });
            } else {
                const unitRes = await api.get(`/units/${unitId}`);
                setUnitData(unitRes.data.data);
            }

            const refRes = await api.get('/reference-materials');
            setRefMaterials(refRes.data.data);
        } catch (error) {
            toast.error('Failed to load lessons');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingLesson) {
                const response = await api.put(`/lessons/${editingLesson.id}`, formData);
                setLessons(prev => prev.map(l => l.id === editingLesson.id ? { ...l, ...response.data.data } : l).sort((a, b) => a.lesson_number - b.lesson_number));
                toast.success('Lesson updated successfully');
            } else {
                const response = await api.post(`/lessons/units/${unitId}/lessons`, formData);
                setLessons(prev => [...prev, response.data.data].sort((a, b) => a.lesson_number - b.lesson_number));
                toast.success('Lesson created successfully');
            }

            setShowModal(false);
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (lesson) => {
        setEditingLesson(lesson);
        setFormData({
            lesson_number: lesson.lesson_number,
            lesson_title: lesson.lesson_title,
            duration: lesson.duration,
            teaching_date: lesson.teaching_date?.split('T')[0] || '',
            term: lesson.term || 'Term 1',
            location: lesson.location || 'inside',
            school_name: lesson.school_name || '',
            teacher_name: lesson.teacher_name || '',
            class_size: lesson.class_size || '40',
            special_needs: lesson.special_needs || [],
            reference_materials: lesson.reference_materials?.map(m => m.id) || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This will delete the lesson and its plan.')) return;

        try {
            await api.delete(`/lessons/${id}`);
            toast.success('Lesson deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete lesson');
        }
    };

    const resetForm = () => {
        const nextNumber = lessons.length > 0 ? Math.max(...lessons.map(l => l.lesson_number)) + 1 : 1;
        const latestLesson = lessons.length > 0 ? lessons[lessons.length - 1] : null;
        const preservedSpecialNeeds = latestLesson?.special_needs || [];

        setFormData({
            lesson_number: nextNumber,
            lesson_title: '',
            duration: '80',
            teaching_date: '',
            term: 'Term 1',
            location: 'inside',
            school_name: '',
            teacher_name: '',
            class_size: '40',
            special_needs: preservedSpecialNeeds.map(sn => ({ ...sn })),
            reference_materials: []
        });
        setEditingLesson(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <div className="dashboard-container">
                    <div style={{ marginBottom: '24px' }}>
                        <div className="skeleton-shimmer" style={{ width: 140, height: 40, borderRadius: 12 }}></div>
                    </div>
                    <div className="workspace-header">
                        <div style={{ flex: 1 }}>
                            <div className="skeleton-shimmer" style={{ width: '40%', height: 32, marginBottom: 8, borderRadius: 8 }}></div>
                            <div className="skeleton-shimmer" style={{ width: '25%', height: 16, borderRadius: 4 }}></div>
                        </div>
                    </div>
                    <SkeletonGrid count={6} component={SkeletonUnitCard} gridStyle={{ marginTop: '40px' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="dashboard-container">
                <div style={{ marginBottom: '24px' }}>
                    <button onClick={() => navigate(-1)} className="update-btn-white" style={{ border: '1px solid var(--border-color)', padding: '10px 20px', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <FiArrowLeft /> Back to Unit
                    </button>
                </div>

                <div className="workspace-header">
                    <div>
                        <h1 className="workspace-title">Managed {translate('Lessons')}</h1>
                        {unitData && <p className="workspace-subtitle">{translate('Unit Number')} {unitData.unit_number}: {unitData.unit_title}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {lessons.length > 0 && (
                            <button 
                                onClick={() => navigate(`/units/${unitId}/batch-generate`)} 
                                className="btn btn-outline btn-sm btn-with-icon"
                                style={{ borderColor: 'var(--c-brand)', color: 'var(--c-brand)' }}
                            >
                                <FiZap /> <span>Batch AI</span>
                            </button>
                        )}
                        <button onClick={openCreateModal} className="btn btn-primary btn-with-icon">
                            <FiPlus /> <span>{translate('Create Lesson')}</span>
                        </button>
                    </div>
                </div>

                {lessons.length > 0 ? (
                    <div className="classes-grid" style={{ marginTop: '40px' }}>
                        {lessons.map((lesson) => (
                            <div key={lesson.id} className="premium-lesson-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span className="unit-num-pill" style={{ background: 'var(--bg-secondary)', color: 'var(--color-gray-500)', marginBottom: '12px' }}>{translate('Lesson Number')} {lesson.lesson_number}</span>
                                        <h3 className="class-title" style={{ fontSize: '1.25rem' }}>{lesson.lesson_title}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleDelete(lesson.id)} className="cancel-btn-circle" title="Delete Lesson" style={{ width: '34px', height: '34px', borderRadius: '12px', color: '#ef4444', background: '#fef2f2' }}><FiTrash2 size={15} /></button>
                                    </div>
                                </div>

                                <div className="lesson-meta-grid">
                                    <div className="lesson-meta-item">
                                        <span className="lesson-meta-label">{t('Duration')}</span>
                                        <span className="lesson-meta-value"><FiClock size={12} /> {lesson.duration}m</span>
                                    </div>
                                    <div className="lesson-meta-item">
                                        <span className="lesson-meta-label">{t('Term')}</span>
                                        <span className="lesson-meta-value"><FiLayers size={12} /> {lesson.term}</span>
                                    </div>
                                    <div className="lesson-meta-item">
                                        <span className="lesson-meta-label">{t('Date')}</span>
                                        <span className="lesson-meta-value">
                                            <FiCalendar size={12} /> {lesson.teaching_date ? new Date(lesson.teaching_date).toLocaleDateString('en-GB') : 'No date'}
                                        </span>
                                    </div>
                                    <div className="lesson-meta-item">
                                        <span className="lesson-meta-label">{t('Learners')}</span>
                                        <span className="lesson-meta-value">👥 {lesson.class_size}</span>
                                    </div>
                                </div>

                                <div className="card-actions-row">
                                    <button
                                        onClick={() => navigate(`/lessons/${lesson.id}/plan`)}
                                        className="btn btn-outline btn-sm flex-1"
                                    >
                                        <FiFileText size={14} /> <span>{t('View')} Plan</span>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(lesson)}
                                        className="btn btn-outline btn-sm flex-1"
                                    >
                                        <FiEdit size={14} /> <span>{t('Update')}</span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/lessons/${lesson.id}/plan?generate=true`)}
                                        className="btn btn-primary btn-sm flex-1"
                                    >
                                        <FiZap size={14} /> <span>AI Generator</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-workspace">
                        <div className="empty-icon-box">
                            <FiFileText size={48} />
                        </div>
                        <h3 className="workspace-title" style={{ fontSize: '1.5rem' }}>{translate('No lessons found')}</h3>
                        <p className="workspace-subtitle" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>{translate('Add lessons subtitle')}</p>
                        <button onClick={openCreateModal} className="btn btn-primary btn-with-icon">
                            <FiPlus /> <span>{translate('Create Lesson')}</span>
                        </button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingLesson ? translate('Edit') : translate('Create Lesson')}>
                        <p className="profile-email">Configure your pedagogical preparation details.</p>

                        <form onSubmit={handleSubmit} style={{ marginTop: '32px', display: 'grid', gap: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                <div className="form-field">
                                    <label className="info-label">{translate('Lesson Number')} *</label>
                                    <input type="number" className="form-input" value={formData.lesson_number} onChange={(e) => setFormData({ ...formData, lesson_number: e.target.value })} required min="1" style={{ width: '100%' }} />
                                </div>
                                <div className="form-field">
                                    <label className="info-label">{translate('Duration')} (min) *</label>
                                    <select className="form-input" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} required style={{ width: '100%' }}>
                                        <option value="40">40 minutes</option>
                                        <option value="80">80 minutes</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label className="info-label">{translate('Term')}</label>
                                    <select className="form-input" value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} style={{ width: '100%' }}>
                                        <option value="Term 1">Term 1</option>
                                        <option value="Term 2">Term 2</option>
                                        <option value="Term 3">Term 3</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="info-label">{translate('Lesson Title')} *</label>
                                <input type="text" className="form-input" placeholder="e.g., Solving Quadratic Equations" value={formData.lesson_title} onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })} required style={{ width: '100%' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                <div className="form-field">
                                    <label className="info-label">{translate('Teaching Date')}</label>
                                    <input type="date" className="form-input" value={formData.teaching_date} onChange={(e) => setFormData({ ...formData, teaching_date: e.target.value })} style={{ width: '100%' }} />
                                </div>
                                <div className="form-field">
                                    <label className="info-label">{translate('Location')}</label>
                                    <select className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%' }}>
                                        <option value="inside">Classroom</option>
                                        <option value="outside">Outside</option>
                                        <option value="lab">Laboratory</option>
                                        <option value="computer_lab">Computer Lab</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="info-label">{translate('Reference Books')}</label>
                                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '20px', maxHeight: '120px', overflowY: 'auto' }}>
                                    {refMaterials.map(mat => (
                                        <label key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                            <input type="checkbox" checked={formData.reference_materials.includes(mat.id)} onChange={(e) => {
                                                const current = [...formData.reference_materials];
                                                if (e.target.checked) current.push(mat.id);
                                                else current.splice(current.indexOf(mat.id), 1);
                                                setFormData({ ...formData, reference_materials: current });
                                            }} />
                                            {mat.title}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="update-btn-blue" style={{ flex: 1 }}>
                                    {editingLesson ? translate('Save') : translate('Create')}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="update-btn-white" style={{ border: '1px solid var(--border-color)' }}>
                                    {translate('Cancel')}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        </div>
    );
};

const FiX = () => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default LessonsPage;
