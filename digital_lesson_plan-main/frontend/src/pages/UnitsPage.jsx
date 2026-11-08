import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import DownloadPlansModal from '../components/DownloadPlansModal';
import api from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiBook, FiCheckCircle, FiChevronRight, FiChevronDown, FiX, FiArrowLeft, FiClock, FiCalendar, FiMapPin, FiUsers, FiList, FiArrowRight, FiDownload, FiCheck, FiZap } from 'react-icons/fi';
import './Dashboard.css';
import { SkeletonUnitCard, SkeletonGrid } from '../components/Skeleton';
import { useSubjectLanguage } from '../hooks/useSubjectLanguage';
import { useSubscription } from '../context/SubscriptionContext';

const UnitsPage = () => {
    const { classId, subjectId } = useParams();
    const navigate = useNavigate();
    const [units, setUnits] = useState([]);
    const [expandedUnits, setExpandedUnits] = useState({}); // {unitId: lessons[]}
    const [loadingUnits, setLoadingUnits] = useState({}); // {unitId: boolean}
    const [classData, setClassData] = useState(null);
    const [subjectData, setSubjectData] = useState(null);
    const [syllabusData, setSyllabusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [batching, setBatching] = useState(null);
    const [importing, setImporting] = useState(false);
    const { isVIP, isStandard, fetchSubscription } = useSubscription();
    const canBatch = true;
    const [suggestedData, setSuggestedData] = useState(null); 
    const [allClassSubjects, setAllClassSubjects] = useState([]);

    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [selectedUnitForDownload, setSelectedUnitForDownload] = useState(null);

    const { t } = useSubjectLanguage(subjectData?.name);

    const [formData, setFormData] = useState({
        unit_number: '',
        unit_title: '',
        key_competences: '',
        lessons: [] // New: for inline topics
    });

    useEffect(() => {
        fetchData();
    }, [classId, subjectId]);

    const handleViewUnit = async (uId) => {
        try {
            const res = await api.get(`/lessons/units/${uId}/lessons`);
            if (res.data.data.length > 0) {
                navigate(`/lessons/${res.data.data[0].id}/plan`);
            } else {
                const u = units.find(unit => unit.id === uId);
                handleEdit(u);
                toast.info('Add some topics to this unit first!');
            }
        } catch (error) {
            toast.error('Could not open unit');
        }
    };

    const fetchData = async (forceRefresh = false) => {
        try {
            const [unitsRes, classRes, subjectsRes] = await Promise.all([
                api.get(`/units/classes/${classId}/subjects/${subjectId}/units`, { noCache: forceRefresh }),
                api.get(`/classes/${classId}`, { noCache: forceRefresh }),
                api.get('/subjects')
            ]);

            const unitsFound = unitsRes.data.data;
            const currentClass = classRes.data.data;
            const currentSubject = currentClass.subjects.find(s => s.id === parseInt(subjectId));

            setUnits(unitsFound);
            setClassData(currentClass);
            setSubjectData(currentSubject);
            setAllClassSubjects(currentClass.subjects || []);

            let matchedUnits = null;
            let matchedMeta = null;

            if (currentSubject) {
                try {
                    const matchRes = await api.get(`/syllabuses/match?class_name=${encodeURIComponent(currentClass.name)}&subject_name=${encodeURIComponent(currentSubject.name)}`);
                    if (matchRes.data.success) {
                        matchedUnits = matchRes.data.units;
                        matchedMeta = matchRes.data.meta;
                        setSyllabusData(matchRes.data.units);
                        setSuggestedData(matchRes.data.meta);
                    } else {
                        matchedUnits = null;
                        matchedMeta = null;
                        setSyllabusData(null);
                        setSuggestedData(null);
                    }
                } catch (err) {
                    matchedUnits = null;
                    matchedMeta = null;
                    setSyllabusData(null);
                }
            }

            return {
                units: unitsFound,
                syllabusUnits: matchedUnits,
                suggestedData: matchedMeta
            };
        } catch (error) {
            toast.error('Failed to load data');
            return { units: [], syllabusUnits: null, suggestedData: null };
        } finally {
            setLoading(false);
        }
    };

    const handleAutoImport = async () => {
        if (!syllabusData || syllabusData.length === 0) return;
        setShowImportConfirm(true);
    };

    const confirmImportAction = async () => {
        setShowImportConfirm(false);
        setImporting(true);
        const toastId = toast.loading('Importing official curriculum structure...');

        try {
            const unitIds = syllabusData.map(u => u.id);
            const response = await api.post('/syllabuses/import', {
                unitIds,
                classId: Number(classId),
                subjectId: Number(subjectId)
            });

            const importedUnits = response.data?.data?.importedUnits;
            const meta = response.data?.meta;

            if (meta?.classId && String(meta.classId) !== String(classId)) {
                navigate(`/classes/${meta.classId}/subjects/${meta.subjectId}/units`);
                return;
            }

            if (Array.isArray(importedUnits) && importedUnits.length > 0) {
                setUnits(importedUnits);
            }

            const refreshed = await fetchData(true);
            const loadedUnits = refreshed?.units || [];

            if (loadedUnits.length > 0) {
                toast.update(toastId, { render: 'Curriculum imported successfully!', type: 'success', isLoading: false, autoClose: 3000 });
                setSyllabusData(null);
            } else {
                toast.update(toastId, { render: 'Import completed but no units were loaded yet.', type: 'warning', isLoading: false, autoClose: 5000 });
            }
        } catch (error) {
            console.error('Import error:', error, {
                responseData: error?.response?.data,
                status: error?.response?.status,
                stack: error?.stack
            });
            if (error?.response?.data?.error) {
                console.error('Server error stack:', error.response.data.error);
            }
            const serverMsg = error?.response?.data?.message || error?.message || 'Import failed.';
            toast.update(toastId, { render: serverMsg, type: 'error', isLoading: false, autoClose: 5000 });
        } finally {
            setImporting(false);
        }
    };

    const toggleLessonExpand = (index) => {
        setFormData(prev => {
            const updated = [...prev.lessons];
            updated[index] = { ...updated[index], isExpanded: !updated[index].isExpanded };
            return { ...prev, lessons: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingUnit) {
                const response = await api.put(`/units/${editingUnit.id}`, formData);
                setUnits(prev => prev.map(u => u.id === editingUnit.id ? { ...u, ...response.data.data } : u));
                toast.success('Unit updated successfully');
            } else {
                const response = await api.post(`/units/classes/${classId}/subjects/${subjectId}/units`, formData);
                setUnits(prev => [...prev, { ...response.data.data, lesson_count: formData.lessons.length }]);
                toast.success('Unit and topics created successfully');
            }

            setShowModal(false);
            setEditingUnit(null);
            setFormData({ unit_number: '', unit_title: '', key_competences: '', lessons: [] });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (unit) => {
        setEditingUnit(unit);
        setFormData({
            unit_number: unit.unit_number,
            unit_title: unit.unit_title,
            key_competences: unit.key_competences || '',
            lessons: []
        });
        setShowModal(true);

        // Fetch existing lessons to populate the modal
        try {
            const res = await api.get(`/lessons/units/${unit.id}/lessons`);
            setFormData(prev => ({
                ...prev,
                lessons: res.data.data.map(l => {
                    // special_needs is already an array returned by getLessons — no extra API call needed
                    let snString = '';
                    if (Array.isArray(l.special_needs) && l.special_needs.length > 0) {
                        snString = l.special_needs
                            .map(sn => `${sn.type || sn.type_of_need || ''}: ${sn.number_of_learners || ''}`)
                            .filter(Boolean)
                            .join(', ');
                    } else if (typeof l.special_needs === 'string') {
                        snString = l.special_needs;
                    }
                    return {
                        id: l.id,
                        lesson_title: l.lesson_title,
                        lesson_number: l.lesson_number,
                        duration: l.duration || '80',
                        class_size: l.class_size || '',
                        term: l.term || 'Term 1',
                        teaching_date: l.teaching_date ? l.teaching_date.split('T')[0] : '',
                        location: l.location || 'inside',
                        special_needs: snString,
                        isExpanded: false
                    };
                })
            }));
        } catch (error) {
            console.error('Failed to load lessons for editing', error);
            toast.error('Could not load lesson topics for this unit');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This will delete all lessons in this unit.')) return;

        try {
            await api.delete(`/units/${id}`);
            toast.success('Unit deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete unit');
        }
    };

    const handleBatchGenerate = async (unit) => {
        if (!window.confirm(`Generate AI lesson plans for all lessons in ${unit.unit_title}? This may take a while.`)) return;

        setBatching(unit.id);
        const toastId = toast.info(`Starting batch generation for ${unit.unit_title}...`, { autoClose: false });

        try {
            const response = await api.post(`/lesson-plans/units/${unit.id}/plans/batch-generate`, {
                provider: localStorage.getItem('ai_provider') || 'openai'
            });
            toast.dismiss(toastId);
            toast.success(response.data.message);
        } catch (error) {
            toast.dismiss(toastId);
            const isSubError = error.response?.data?.subscriptionError;
            const message = error.response?.data?.message || 'Batch generation failed';
            toast.error(isSubError ? `\ud83d\udd12 ${message}` : message);
            if (isSubError) fetchSubscription?.();
        } finally {
            setBatching(null);
        }
    };

    const openCreateModal = () => {
        setEditingUnit(null);
        const nextNumber = units.length > 0 ? Math.max(...units.map(u => u.unit_number)) + 1 : 1;
        setFormData({ unit_number: nextNumber, unit_title: '', key_competences: '', lessons: [] });
        setShowModal(true);
    };

    const addInlineLesson = () => {
        setFormData(prev => ({
            ...prev,
            lessons: [
                ...prev.lessons, 
                { 
                    lesson_title: '', 
                    lesson_number: prev.lessons.length + 1,
                    duration: '80',
                    class_size: classData?.class_size || '40',
                    term: 'Term 1',
                    teaching_date: '',
                    location: 'inside',
                    special_needs: '',
                    isExpanded: true
                }
            ]
        }));
    };

    const removeInlineLesson = (index) => {
        setFormData(prev => ({
            ...prev,
            lessons: prev.lessons.filter((_, i) => i !== index)
        }));
    };

    const updateInlineLesson = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.lessons];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, lessons: updated };
        });
    };

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <div className="dashboard-container">
                    <div className="workspace-header skeleton" style={{ height: '80px', borderRadius: '24px', marginBottom: '40px' }}></div>
                    <div className="classes-grid">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="premium-unit-card skeleton-card">
                                <div className="skeleton-pill"></div>
                                <div className="skeleton-title"></div>
                                <div className="skeleton-text"></div>
                                <div className="skeleton-actions">
                                    <div className="skeleton-btn"></div>
                                    <div className="skeleton-btn"></div>
                                    <div className="skeleton-btn"></div>
                                </div>
                            </div>
                        ))}
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

                {/* Subject Selector Dropdown */}
                {allClassSubjects.length > 0 && (
                    <div className="subject-selector-container animate-fade">
                        <label className="selector-label">Working on:</label>
                        <select 
                            className="subject-dropdown"
                            value={subjectId}
                            onChange={(e) => navigate(`/classes/${classId}/subjects/${e.target.value}/units`)}
                        >
                            {allClassSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} {s.code ? `(${s.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="workspace-header">
                    <div>
                        <h1 className="workspace-title">{subjectData?.name} {t('Units')}</h1>
                        <p className="workspace-subtitle">
                            {classData?.name} • Curriculum organization for this subject.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {syllabusData && units.length === 0 && (
                            <button
                                onClick={handleAutoImport}
                                className="btn btn-success btn-with-icon"
                                disabled={importing}
                            >
                                <FiZap /> <span>{importing ? 'Importing...' : 'Import from Syllabus'}</span>
                            </button>
                        )}
                        <button onClick={openCreateModal} className="btn btn-primary btn-with-icon">
                            <FiPlus /> <span>{t('Create Unit')}</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <SkeletonGrid count={6} component={SkeletonUnitCard} gridStyle={{ marginTop: '40px' }} />
                ) : units.length > 0 ? (
                    <div className="classes-grid" style={{ marginTop: '40px' }}>
                        {units.map((unit) => (
                            <div key={unit.id} className="premium-unit-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span className="unit-num-pill">Unit {unit.unit_number}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleEdit(unit)} className="action-btn-subtle" title="Edit"><FiEdit size={14} /></button>
                                        <button onClick={() => handleDelete(unit.id)} className="action-btn-subtle delete" title="Delete"><FiTrash2 size={14} /></button>
                                    </div>
                                </div>

                                <div className="unit-card-content">
                                    <h3 className="unit-title">{unit.unit_title}</h3>
                                </div>

                                {unit.key_competences && (
                                    <div className="unit-competence-box">
                                        <p style={{ fontWeight: 800, color: 'var(--color-gray-400)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{t('Key Unit Competence')}</p>
                                        <p>{unit.key_competences.length > 180 ? unit.key_competences.substring(0, 180) + '...' : unit.key_competences}</p>
                                    </div>
                                )}

                                <div className="compact-card-actions">
                                    <button
                                        onClick={() => handleViewUnit(unit.id)}
                                        className="btn btn-primary btn-mini-action"
                                        title={t('View')}
                                    >
                                        <FiFileText size={14} /> <span>{t('View')}</span>
                                    </button>
                                    <button
                                        onClick={() => handleBatchGenerate(unit)}
                                        className={`btn ${canBatch ? 'btn-accent' : 'btn-outline'} btn-mini-action`}
                                        disabled={batching !== null}
                                        title={canBatch ? "Batch AI Generation" : "Premium Feature"}
                                    >
                                        {canBatch ? (
                                            <>
                                                <FiZap size={14} className={batching === unit.id ? 'animate-pulse' : ''} /> 
                                                <span>{batching === unit.id ? 'Batching...' : 'AI'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiZap size={14} style={{ opacity: 0.5 }} />
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    AI <FiCheckCircle size={10} style={{ color: 'var(--c-text-muted)' }} />
                                                </span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedUnitForDownload(unit);
                                            setShowDownloadModal(true);
                                        }}
                                        className="btn btn-outline btn-mini-action"
                                        title={t('Download')}
                                    >
                                        <FiDownload size={14} /> <span>{t('Get')}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-workspace">
                        <div className="empty-icon-box">
                            <FiList size={48} />
                        </div>
                        <h3 className="workspace-title" style={{ fontSize: '1.5rem' }}>{t('No units found')}</h3>
                        <p className="workspace-subtitle" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>{t('Organize units subtitle')}</p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={openCreateModal} className="btn btn-primary btn-with-icon">
                                <FiPlus /> <span>{t('Create Unit')}</span>
                            </button>

                            {syllabusData && units.length === 0 && (
                                <button
                                    onClick={handleAutoImport}
                                    className="btn btn-success btn-with-icon"
                                    disabled={importing}
                                >
                                    <FiZap /> <span>{importing ? 'Importing...' : 'Auto-Import from REB'}</span>
                                </button>
                            )}
                        </div>

                        {syllabusData && (
                            <p style={{ marginTop: '16px', fontSize: '13.5px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <FiBook /> Found the REB <strong>{suggestedData?.gradeLevel} {suggestedData?.formalSubject}</strong> curriculum matching this class.
                            </p>
                        )}
                    </div>
                )}

                {showModal && (
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUnit ? 'Edit Unit' : t('Create Unit')}>
                        <form onSubmit={handleSubmit} className="custom-form">
                            <div className="form-section-premium">
                                <div className="form-row-dual">
                                    <div className="form-field" style={{ flex: '0 0 100px' }}>
                                        <label className="field-label">Unit #</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="e.g., 1"
                                            value={formData.unit_number}
                                            onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-field" style={{ flex: 1 }}>
                                        <label className="field-label">Unit Title *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., Cell Structure and Function"
                                            value={formData.unit_title}
                                            onChange={(e) => setFormData({ ...formData, unit_title: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-field mt-4">
                                    <label className="field-label">Key Unit Competence</label>
                                    <textarea
                                        className="form-input"
                                        style={{ minHeight: '80px', resize: 'vertical', borderRadius: '16px' }}
                                        placeholder="What will learners be able to do at the end of this unit?"
                                        value={formData.key_competences}
                                        onChange={(e) => setFormData({ ...formData, key_competences: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-section-premium mt-6">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div>
                                            <label className="field-label-accent">{editingUnit ? 'Edit Topics / Lessons' : 'Inline Topics / Lessons'}</label>
                                            <p className="field-help-top">{editingUnit ? 'Edit existing topics or add new ones to this unit.' : 'List the topics for this unit to create them instantly.'}</p>
                                        </div>
                                        <button type="button" onClick={addInlineLesson} className="btn btn-outline btn-sm">
                                            <FiPlus /> Add Topic
                                        </button>
                                    </div>

                                    <div className="inline-lessons-list">
                                        {formData.lessons.map((lesson, index) => (
                                            <div key={index} className={`inline-lesson-row-expanded animate-slide-up ${lesson.isExpanded ? 'is-expanded' : ''}`}>
                                                <div className="inline-lesson-header">
                                                    <div className="lesson-num-input-box">
                                                        <label>#</label>
                                                        <input 
                                                            type="number" 
                                                            value={lesson.lesson_number} 
                                                            onChange={(e) => updateInlineLesson(index, 'lesson_number', e.target.value)} 
                                                        />
                                                    </div>
                                                    <div 
                                                        className="inline-lesson-title-display"
                                                        onClick={() => toggleLessonExpand(index)}
                                                    >
                                                        <input 
                                                            type="text"
                                                            placeholder="Enter lesson topic title..."
                                                            className="inline-lesson-title-input"
                                                            value={lesson.lesson_title}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                updateInlineLesson(index, 'lesson_title', e.target.value);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <span className={`expand-v-icon ${lesson.isExpanded ? 'rotated' : ''}`}>
                                                            <FiChevronDown />
                                                        </span>
                                                    </div>
                                                    <button type="button" onClick={() => removeInlineLesson(index)} className="remove-lesson-btn-vibrant">
                                                        <FiX size={16} />
                                                    </button>
                                                </div>
                                                
                                                {lesson.isExpanded && (
                                                    <div className="inline-lesson-meta-grid animate-fade">
                                                        <div className="meta-field-vibrant">
                                                            <label>Duration</label>
                                                            <select value={lesson.duration} onChange={(e) => updateInlineLesson(index, 'duration', e.target.value)}>
                                                                <option value="40">40 min</option>
                                                                <option value="80">80 min</option>
                                                            </select>
                                                        </div>
                                                        <div className="meta-field-vibrant">
                                                            <label>Teaching Date</label>
                                                            <input type="date" value={lesson.teaching_date} onChange={(e) => updateInlineLesson(index, 'teaching_date', e.target.value)} />
                                                        </div>
                                                        <div className="meta-field-vibrant">
                                                            <label>Term</label>
                                                            <select value={lesson.term} onChange={(e) => updateInlineLesson(index, 'term', e.target.value)}>
                                                                <option value="Term 1">Term 1</option>
                                                                <option value="Term 2">Term 2</option>
                                                                <option value="Term 3">Term 3</option>
                                                            </select>
                                                        </div>
                                                        <div className="meta-field-vibrant">
                                                            <label>Location</label>
                                                            <select value={lesson.location} onChange={(e) => updateInlineLesson(index, 'location', e.target.value)}>
                                                                <option value="inside">Inside</option>
                                                                <option value="outside">Outside</option>
                                                                <option value="lab">Lab</option>
                                                                <option value="computer_lab">ICT Lab</option>
                                                            </select>
                                                        </div>
                                                        <div className="meta-field-vibrant">
                                                            <label>Learners</label>
                                                            <input type="number" value={lesson.class_size} onChange={(e) => updateInlineLesson(index, 'class_size', e.target.value)} />
                                                        </div>
                                                        <div className="meta-field-vibrant" style={{ gridColumn: 'span 2' }}>
                                                            <label>Special Needs (e.g. Vision: 2, Hearing: 1)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="None specified" 
                                                                value={lesson.special_needs} 
                                                                onChange={(e) => updateInlineLesson(index, 'special_needs', e.target.value)} 
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {formData.lessons.length === 0 && (
                                            <div className="empty-inline-hint" onClick={addInlineLesson}>
                                                <FiList /> <span>{editingUnit ? 'No topics found. Click to add a new topic.' : 'No topics added yet. Click to add a lesson.'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>


                            <div className="form-actions-sticky mt-8">
                                <button type="submit" className="btn btn-primary btn-lg flex-1" disabled={saving}>
                                    {saving ? 'Processing...' : (editingUnit ? t('Save Changes') : 'Create Unit & Topics')}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline btn-lg flex-1">
                                    {t('Cancel')}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}

                <DownloadPlansModal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                    unitId={selectedUnitForDownload?.id}
                    unitTitle={selectedUnitForDownload?.unit_title}
                />

                {showImportConfirm && (
                    <Modal 
                        isOpen={showImportConfirm} 
                        onClose={() => setShowImportConfirm(false)} 
                        title="Confirm Curriculum Import"
                    >
                        <div className="import-confirm-body animate-fadeIn">
                            <div className="import-icon-circle">
                                <FiZap size={32} />
                            </div>
                            
                            <h2 className="import-confirm-title">Ready to import?</h2>
                            <p className="import-confirm-text">
                                We found the official REB Syllabus for <strong>{suggestedData?.gradeLevel} {suggestedData?.formalSubject}</strong>.
                            </p>
                            
                            <div className="import-details-box">
                                <div className="import-detail-item">
                                    <span className="detail-label">Units to Import</span>
                                    <span className="detail-value">{syllabusData?.length || 0} Units</span>
                                </div>
                                <div className="import-detail-item">
                                    <span className="detail-label">Estimated Time</span>
                                    <span className="detail-value">Instant ⚡</span>
                                </div>
                            </div>
                            
                            <div className="import-warning-notice">
                                <FiCheckCircle size={14} />
                                <span>This will automatically populate your unit list and topics.</span>
                            </div>

                            <div className="form-actions-sticky mt-8">
                                <button 
                                    onClick={confirmImportAction} 
                                    className="btn btn-success btn-lg flex-1 btn-with-icon"
                                    style={{ justifyContent: 'center' }}
                                >
                                    <FiZap /> <span>Confirm Import</span>
                                </button>
                                <button 
                                    onClick={() => setShowImportConfirm(false)} 
                                    className="btn btn-outline btn-lg flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
            <style>{`
                .inline-lessons-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding-right: 4px;
                }
                .inline-lesson-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: white;
                    padding: 10px 14px;
                    border-radius: 14px;
                    border: 1px solid var(--c-border);
                    box-shadow: var(--shadow-sm);
                }
                .lesson-number-dot {
                    width: 24px;
                    height: 24px;
                    background: var(--c-brand-light);
                    color: var(--c-brand);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 800;
                    flex-shrink: 0;
                }
                .inline-lesson-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--c-text-primary);
                    background: transparent;
                }
                .remove-lesson-btn {
                    background: #f1f5f9;
                    color: #64748b;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .remove-lesson-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                }
                .empty-inline-hint {
                    padding: 24px;
                    border: 2px dashed var(--c-border);
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    color: var(--c-text-muted);
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .empty-inline-hint:hover {
                    border-color: var(--c-brand);
                    color: var(--c-brand);
                    background: var(--c-brand-light);
                }

                /* Subject Selector Styles */
                .subject-selector-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 32px;
                    background: white;
                    padding: 12px 20px;
                    border-radius: 18px;
                    border: 1px solid var(--c-border-soft);
                    box-shadow: var(--shadow-sm);
                    width: fit-content;
                }
                .selector-label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--c-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .subject-dropdown {
                    border: none;
                    background: var(--c-surface-2);
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: var(--c-brand);
                    cursor: pointer;
                    outline: none;
                    transition: all 0.2s;
                    min-width: 200px;
                }
                .subject-dropdown:hover {
                    background: var(--c-brand-light);
                }

                /* Toast Z-index Fix */
                .Toastify__toast-container {
                    z-index: 10001 !important;
                }

                .inline-lesson-row-expanded {
                    background: white;
                    padding: 20px;
                    border-radius: 20px;
                    border: 1px solid var(--c-border-soft);
                    margin-bottom: 20px;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.2s;
                }
                .inline-lesson-row-expanded:hover {
                    border-color: var(--c-brand-light);
                    box-shadow: var(--shadow-md);
                }
                .inline-lesson-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .lesson-num-input-box {
                    display: flex;
                    align-items: center;
                    background: var(--c-surface-2);
                    padding: 4px 10px;
                    border-radius: 10px;
                    gap: 4px;
                }
                .lesson-num-input-box label {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--c-text-muted);
                }
                .lesson-num-input-box input {
                    width: 35px;
                    background: transparent;
                    border: none;
                    font-size: 0.9rem;
                    font-weight: 800;
                    color: var(--c-brand);
                    outline: none;
                    text-align: center;
                }
                .inline-lesson-title-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--c-text-primary);
                    background: transparent;
                    padding: 8px 0;
                    border-bottom: 1px solid transparent;
                    transition: all 0.2s;
                }
                .inline-lesson-title-input:focus {
                    border-bottom-color: var(--c-brand-light);
                }
                .remove-lesson-btn-vibrant {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    background: #f1f5f9;
                    color: #64748b;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .remove-lesson-btn-vibrant:hover {
                    background: #fee2e2;
                    color: #ef4444;
                    transform: rotate(90deg);
                }
                .inline-lesson-row-expanded.is-expanded {
                    border-color: var(--c-brand-light);
                    background: #f8fafc;
                }
                .inline-lesson-title-display {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                }
                .expand-v-icon {
                    color: var(--c-text-muted);
                    transition: transform 0.3s ease;
                    display: flex;
                    align-items: center;
                }
                .expand-v-icon.rotated {
                    transform: rotate(180deg);
                    color: var(--c-brand);
                }
                .inline-lesson-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 16px;
                    padding-top: 16px;
                    border-top: 1px dashed var(--c-border);
                }
                .meta-field-vibrant {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .meta-field-vibrant label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: var(--c-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .meta-field-vibrant input, .meta-field-vibrant select {
                    border: 1px solid var(--c-border-soft);
                    background: #f8fafc;
                    border-radius: 10px;
                    padding: 8px 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--c-text-primary);
                    outline: none;
                    transition: all 0.2s;
                    width: 100%;
                }
                .meta-field-vibrant input:focus, .meta-field-vibrant select:focus {
                    border-color: var(--c-brand);
                    background: white;
                }

                .premium-unit-card {
                    background: var(--c-surface);
                    border: 1px solid var(--c-border-soft);
                    border-radius: 24px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.3s ease;
                    position: relative;
                }
                .unit-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--c-text-primary);
                    line-height: 1.3;
                    margin: 4px 0;
                }
                .compact-card-actions {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr 1fr;
                    gap: 8px;
                    margin-top: 8px;
                }
                .btn-mini-action {
                    padding: 8px 4px !important;
                    font-size: 0.75rem !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 4px !important;
                    border-radius: 12px !important;
                    min-height: 38px !important;
                }
                .btn-mini-action span {
                    font-weight: 700;
                }

                /* Inline Lessons Workspace */
                .inline-lessons-workspace {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid var(--c-border-soft);
                }
                .lessons-mini-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .lesson-mini-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--c-surface-2);
                    padding: 8px 12px;
                    border-radius: 12px;
                    transition: all 0.2s;
                }
                .lesson-mini-item:hover {
                    background: var(--c-brand-light);
                }
                .lesson-mini-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }
                .lesson-mini-num {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--c-brand);
                    background: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .lesson-mini-title {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--c-text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lesson-mini-actions {
                    display: flex;
                    gap: 4px;
                }
                .mini-tool-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    border: none;
                    background: white;
                    color: var(--c-text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mini-tool-btn:hover {
                    color: var(--c-brand);
                    box-shadow: var(--shadow-sm);
                }
                .mini-tool-btn.primary { color: var(--c-brand); }
                .mini-tool-btn.danger:hover { color: #ef4444; }

                .no-lessons-hint {
                    font-size: 0.8rem;
                    color: var(--c-text-muted);
                    text-align: center;
                    font-style: italic;
                }

                .skeleton-line-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .skeleton-line {
                    height: 36px;
                    background: var(--c-surface-2);
                    border-radius: 12px;
                }
                .pulse {
                    animation: pulse 1.5s infinite ease-in-out;
                }
                .unit-competence-box {
                    background: var(--c-surface-2);
                    padding: 16px;
                    border-radius: 16px;
                    font-size: 0.9rem;
                    color: var(--c-text-secondary);
                    line-height: 1.5;
                }
                .action-btn-subtle {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    border: none;
                    background: var(--c-surface-2);
                    color: var(--c-text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
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

                /* Dark Mode Support Overrides */
                [data-theme='dark'] .premium-unit-card {
                    background: #1e293b;
                    border-color: #334155;
                }
                [data-theme='dark'] .unit-competence-box {
                    background: #0f172a;
                    color: #94a3b8;
                }
                [data-theme='dark'] .action-btn-subtle {
                    background: #334155;
                    color: #94a3b8;
                }
                [data-theme='dark'] .subject-selector-container {
                    background: #1e293b;
                    border-color: #334155;
                }
                [data-theme='dark'] .subject-dropdown {
                    background: #334155;
                    color: #38bdf8;
                }
                [data-theme='dark'] .inline-lesson-row-expanded {
                    background: #1e293b;
                    border-color: #334155;
                }
                [data-theme='dark'] .inline-lesson-row-expanded.is-expanded {
                    background: #0f172a;
                    border-color: #38bdf8;
                }
                [data-theme='dark'] .meta-field-vibrant input, [data-theme='dark'] .meta-field-vibrant select {
                    background: #334155;
                    border-color: #475569;
                    color: #f1f5f9;
                }
                
                .btn-accent {
                    background: #f59e0b;
                    color: white;
                }
                .btn-accent:hover {
                    background: #d97706;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                }

                /* Import Confirm Modal Styles */
                .import-confirm-body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 20px 10px;
                }
                .import-icon-circle {
                    width: 70px;
                    height: 70px;
                    background: #e6fcf5;
                    color: #1a6b5a;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                    box-shadow: 0 10px 20px -5px rgba(26, 107, 90, 0.2);
                }
                .import-confirm-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 12px;
                }
                .import-confirm-text {
                    color: #64748b;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }
                .import-details-box {
                    width: 100%;
                    background: #f8fafc;
                    border-radius: 20px;
                    padding: 20px;
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 24px;
                    border: 1px solid #e2e8f0;
                }
                .import-detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .detail-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .detail-value {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #1a6b5a;
                }
                .import-warning-notice {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #10b981;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: #f0fdf4;
                    padding: 10px 16px;
                    border-radius: 12px;
                }
                [data-theme='dark'] .import-confirm-title { color: #f1f5f9; }
                [data-theme='dark'] .import-confirm-text { color: #94a3b8; }
                [data-theme='dark'] .import-details-box { background: #1e293b; border-color: #334155; }
                [data-theme='dark'] .import-icon-circle { background: #1a6b5a; color: #ccfbf1; }
                [data-theme='dark'] .import-warning-notice { background: #064e3b; color: #34d399; }
            `}</style>
        </div >
    );
};

export default UnitsPage;
