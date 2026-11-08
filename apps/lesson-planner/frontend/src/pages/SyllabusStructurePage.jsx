import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
    FiPlus, FiTrash2, FiEdit2, FiSave, FiArrowLeft, FiChevronRight, 
    FiChevronDown, FiBookOpen, FiFileText, FiLayers, FiSearch
} from 'react-icons/fi';
import './Dashboard.css';

const SyllabusStructurePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syllabus, setSyllabus] = useState(null);
    const [units, setUnits] = useState([]);
    const [expandedUnits, setExpandedUnits] = useState({});
    const [expandedLessons, setExpandedLessons] = useState({}); // Tracking expanded lesson details

    useEffect(() => {
        fetchSyllabus();
    }, [id]);

    const fetchSyllabus = async () => {
        try {
            const response = await api.get(`/syllabuses/${id}`);
            const data = response.data.data;
            setSyllabus(data);
            setUnits(data.structured_data?.units || []);
            
            // Auto expand first unit
            if (data.structured_data?.units?.length > 0) {
                setExpandedUnits({ 0: true });
            }
        } catch (error) {
            toast.error('Failed to load syllabus structure');
        } finally {
            setLoading(false);
        }
    };

    const toggleUnit = (index) => {
        setExpandedUnits(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/syllabuses/${id}/structured-data`, {
                structured_data: { units }
            });
            toast.success('Syllabus structure saved successfully');
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // --- UNIT CRUD ---
    const addUnit = () => {
        const newUnit = {
            grade_level: 'S4',
            unit_number: units.length + 1,
            unit_title: 'New Unit',
            key_competences: '',
            lessons: []
        };
        setUnits([...units, newUnit]);
        setExpandedUnits({ ...expandedUnits, [units.length]: true });
    };

    const updateUnit = (index, field, value) => {
        const newUnits = [...units];
        newUnits[index][field] = value;
        setUnits(newUnits);
    };

    const deleteUnit = (index) => {
        if (!window.confirm('Delete this unit and all its lessons?')) return;
        setUnits(units.filter((_, i) => i !== index));
    };

    // --- LESSON CRUD ---
    const toggleLessonDetails = (unitIndex, lessonIndex) => {
        const key = `${unitIndex}-${lessonIndex}`;
        setExpandedLessons(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const addLesson = (unitIndex) => {
        const newUnits = [...units];
        const currentLessons = newUnits[unitIndex].lessons || [];
        const nextNum = currentLessons.length + 1;
        newUnits[unitIndex].lessons = [
            ...currentLessons, 
            { 
                lesson_number: nextNum, 
                lesson_title: `Lesson ${nextNum}`,
                knowledge_understanding: '',
                skills: '',
                attitudes_values: '',
                content_area: '',
                learning_activities: ''
            }
        ];
        setUnits(newUnits);
        toggleLessonDetails(unitIndex, currentLessons.length);
    };

    const updateLesson = (unitIndex, lessonIndex, field, value) => {
        const newUnits = [...units];
        if (newUnits[unitIndex]?.lessons[lessonIndex]) {
            newUnits[unitIndex].lessons[lessonIndex][field] = value;
            setUnits(newUnits);
        }
    };

    const deleteLesson = (unitIndex, lessonIndex) => {
        if (!window.confirm('Delete this lesson?')) return;
        const newUnits = [...units];
        if (newUnits[unitIndex]?.lessons) {
            newUnits[unitIndex].lessons = newUnits[unitIndex].lessons.filter((_, i) => i !== lessonIndex);
            setUnits(newUnits);
        }
    };

    if (loading) return (
        <div>
            <div className="dashboard-container">
                <div className="skeleton" style={{ height: '500px', borderRadius: '24px' }}></div>
            </div>
        </div>
    );

    return (
        <div className="animate-fadeIn">
            <div className="dashboard-container">
                <div className="workspace-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="back-btn-premium" onClick={() => navigate('/admin/syllabuses')}>
                            <FiArrowLeft />
                        </button>
                        <div>
                            <h1 className="workspace-title">{syllabus?.subject_name}</h1>
                            <p className="workspace-subtitle">
                                {syllabus?.grade_level || 'General Level'} • Curriculum Structure Management
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="update-btn-blue" style={{ background: '#10b981' }} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : <><FiSave /> Save Changes</>}
                        </button>
                    </div>
                </div>

                <div className="settings-section mt-4" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="section-header" style={{ padding: '24px 32px', background: 'rgba(59, 130, 246, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="admin-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '40px', height: '40px' }}>
                                <FiLayers />
                            </div>
                            <h2 className="class-title" style={{ fontSize: '1.2rem', margin: 0 }}>Unit & Lesson Tree</h2>
                        </div>
                        <button className="update-btn-blue" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }} onClick={addUnit}>
                            <FiPlus /> Add Unit
                        </button>
                    </div>

                    <div className="curriculum-tree" style={{ padding: '0 32px 32px 32px' }}>
                        {Object.entries(
                            units.reduce((acc, unit, index) => {
                                const grade = unit.grade_level || 'General';
                                if (!acc[grade]) acc[grade] = [];
                                acc[grade].push({ ...unit, originalIndex: index });
                                return acc;
                            }, {})
                        ).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([grade, gradeUnits], gIdx) => (
                            <div key={grade} className="grade-section" style={{ marginBottom: '32px' }}>
                                <div className="grade-header" style={{ 
                                    padding: '12px 0', 
                                    borderBottom: '2px solid #eff6ff', 
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#1e40af',
                                    fontWeight: 700,
                                    fontSize: '15px'
                                }}>
                                    <span style={{ color: '#94a3b8' }}>{syllabus?.subject_name || 'Subject'}</span>
                                    <FiChevronRight size={14} />
                                    <span style={{ background: '#dbeafe', padding: '2px 10px', borderRadius: '6px' }}>{grade}</span>
                                </div>

                                {gradeUnits.map((unit, _) => {
                                    const uIdx = unit.originalIndex;
                                    return (
                                        <div key={uIdx} className="unit-branch" style={{ marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div 
                                                className="unit-row" 
                                                style={{ 
                                                    padding: '16px 20px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '12px', 
                                                    cursor: 'pointer',
                                                    background: expandedUnits[uIdx] ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
                                                    borderBottom: expandedUnits[uIdx] ? '1px solid var(--border-color)' : 'none'
                                                }}
                                                onClick={() => toggleUnit(uIdx)}
                                            >
                                                {expandedUnits[uIdx] ? <FiChevronDown color="#3b82f6" /> : <FiChevronRight />}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                    <input 
                                                        className="admin-badge"
                                                        value={unit.grade_level || ''}
                                                        onChange={(e) => updateUnit(uIdx, 'grade_level', e.target.value)}
                                                        placeholder="Grade"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: '50px', height: '28px', textAlign: 'center', background: '#eff6ff', color: '#2563eb', fontWeight: 800, border: 'none', borderRadius: '8px', padding: 0 }}
                                                    />
                                                    <span className="admin-badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 800 }}>U{unit.unit_number}</span>
                                                    <input 
                                                        className="tree-input-title"
                                                        value={unit.unit_title}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => updateUnit(uIdx, 'unit_title', e.target.value)}
                                                        placeholder="Unit Title..."
                                                        style={{ fontWeight: 700, fontSize: '16px', border: 'none', background: 'transparent', width: '100%', outline: 'none' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                                    <button className="delete-icon-btn" style={{ padding: '8px', color: '#ef4444' }} onClick={() => deleteUnit(uIdx)}>
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedUnits[uIdx] && (
                                                <div className="unit-details animate-slideDown" style={{ padding: '12px 20px 20px 52px' }}>
                                                    <div className="form-group mb-4">
                                                        <label style={{ fontSize: '12px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>Key Competences</label>
                                                        <textarea 
                                                            value={unit.key_competences || ''}
                                                            onChange={(e) => updateUnit(uIdx, 'key_competences', e.target.value)}
                                                            placeholder="What should learners achieve in this unit?"
                                                            style={{ minHeight: '60px', borderRadius: '12px', marginTop: '8px', fontSize: '14px' }}
                                                        ></textarea>
                                                    </div>

                                                    <div className="lessons-list">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-gray-600)' }}>Lessons in this Unit</h4>
                                                            <button 
                                                                className="update-btn-blue" 
                                                                style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none' }}
                                                                onClick={() => addLesson(uIdx)}
                                                            >
                                                                <FiPlus /> Add Lesson
                                                            </button>
                                                        </div>

                                                        {unit.lessons && unit.lessons.map((lesson, lIdx) => {
                                                            const lessonKey = `${uIdx}-${lIdx}`;
                                                            const isLessonExpanded = expandedLessons[lessonKey];
                                                            return (
                                                                <div key={lIdx} className="lesson-branch" style={{ marginBottom: '12px' }}>
                                                                    <div 
                                                                        className="lesson-header" 
                                                                        style={{ 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            gap: '12px', 
                                                                            padding: '12px 16px', 
                                                                            background: '#f8fafc', 
                                                                            borderRadius: '12px',
                                                                            border: isLessonExpanded ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        onClick={() => toggleLessonDetails(uIdx, lIdx)}
                                                                    >
                                                                        {isLessonExpanded ? <FiChevronDown color="#3b82f6" /> : <FiSearch size={14} color="#94a3b8" />}
                                                                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', minWidth: '40px' }}>LESSON {lesson.lesson_number}</span>
                                                                        <input 
                                                                            value={lesson.lesson_title}
                                                                            onChange={(e) => updateLesson(uIdx, lIdx, 'lesson_title', e.target.value)}
                                                                            placeholder="Lesson Title..."
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '14px', color: '#1e293b', fontWeight: 600, outline: 'none' }}
                                                                        />
                                                                        <button 
                                                                            className="delete-icon-btn" 
                                                                            style={{ padding: '6px', color: '#cbd5e1' }} 
                                                                            onClick={(e) => { e.stopPropagation(); deleteLesson(uIdx, lIdx); }}
                                                                        >
                                                                            <FiTrash2 size={14} />
                                                                        </button>
                                                                    </div>

                                                                    {isLessonExpanded && (
                                                                        <div className="lesson-details-expanded" style={{ 
                                                                            padding: '24px', 
                                                                            marginTop: '-8px',
                                                                            paddingTop: '32px',
                                                                            background: 'white', 
                                                                            border: '1px solid #3b82f6', 
                                                                            borderTop: 'none',
                                                                            borderBottomLeftRadius: '12px',
                                                                            borderBottomRightRadius: '12px',
                                                                            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.05)',
                                                                            zIndex: 1
                                                                        }}>
                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                                                <div className="form-group">
                                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '8px' }}>Knowledge & Understanding</label>
                                                                                    <textarea 
                                                                                        value={lesson.knowledge_understanding || ''}
                                                                                        onChange={(e) => updateLesson(uIdx, lIdx, 'knowledge_understanding', e.target.value)}
                                                                                        placeholder="What will they know?"
                                                                                        style={{ minHeight: '80px', fontSize: '13px', borderRadius: '10px' }}
                                                                                    />
                                                                                </div>
                                                                                <div className="form-group">
                                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '8px' }}>Skills</label>
                                                                                    <textarea 
                                                                                        value={lesson.skills || ''}
                                                                                        onChange={(e) => updateLesson(uIdx, lIdx, 'skills', e.target.value)}
                                                                                        placeholder="What will they do?"
                                                                                        style={{ minHeight: '80px', fontSize: '13px', borderRadius: '10px' }}
                                                                                    />
                                                                                </div>
                                                                                <div className="form-group">
                                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '8px' }}>Attitudes & Values</label>
                                                                                    <textarea 
                                                                                        value={lesson.attitudes_values || ''}
                                                                                        onChange={(e) => updateLesson(uIdx, lIdx, 'attitudes_values', e.target.value)}
                                                                                        placeholder="Mindset & perspective..."
                                                                                        style={{ minHeight: '80px', fontSize: '13px', borderRadius: '10px' }}
                                                                                    />
                                                                                </div>
                                                                                <div className="form-group">
                                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '8px' }}>Content Area</label>
                                                                                    <textarea 
                                                                                        value={lesson.content_area || ''}
                                                                                        onChange={(e) => updateLesson(uIdx, lIdx, 'content_area', e.target.value)}
                                                                                        placeholder="Focus areas..."
                                                                                        style={{ minHeight: '80px', fontSize: '13px', borderRadius: '10px' }}
                                                                                    />
                                                                                </div>
                                                                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '8px' }}>Learning Activities</label>
                                                                                    <textarea 
                                                                                        value={lesson.learning_activities || ''}
                                                                                        onChange={(e) => updateLesson(uIdx, lIdx, 'learning_activities', e.target.value)}
                                                                                        placeholder="Suggested activities..."
                                                                                        style={{ minHeight: '60px', fontSize: '13px', borderRadius: '10px' }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {(!unit.lessons || unit.lessons.length === 0) && (
                                                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-gray-400)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                                                No lessons added to this unit yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {units.length === 0 && (
                            <div className="empty-state-workspace" style={{ padding: '60px' }}>
                                <FiLayers size={48} color="var(--color-gray-300)" />
                                <h3 className="class-title mt-3">Empty Syllabus Structure</h3>
                                <p className="workspace-subtitle">Click "Add Unit" to start building the curriculum manually.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyllabusStructurePage;
