import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { 
    ArrowLeft, Zap, Printer, RefreshCw, Clock, 
    FileText, Download, AlertTriangle, Trash2, 
    CheckCircle, Save, FileDown, Edit3, X, Sparkles
} from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, TextRun, ShadingType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';
import './AuthPages.css';
import './LessonPlan.css';
import { useSubjectLanguage } from '../hooks/useSubjectLanguage';
import { useSubscription } from '../context/SubscriptionContext';
import MermaidDiagram from '../components/MermaidDiagram';
import ImageWidget from '../components/ImageWidget';
import ChartWidget from '../components/ChartWidget';

// Helper to convert any value (string with newlines/bullets or array) into a clean string array
const toList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map(v => typeof v === 'string' ? v.trim() : JSON.stringify(v)).filter(Boolean);
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return [];
        // Split on newlines or bullet markers
        const lines = trimmed.split(/\r?\n|•|\d+\.\s+/).map(s => s.trim()).filter(s => s.length > 0);
        return lines.length > 0 ? lines : [trimmed];
    }
    return [String(val)];
};

// Robust normalizer to ensure all fields and subphases are clean, non-empty arrays
const normalizeLessonPlanData = (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const data = { ...raw };

    // 1. Normalize Header Details
    const header = data.header_details || data.headerDetails || data.header || {};
    data.header_details = {
        school_name: header.school_name || header.school || '',
        teacher_name: header.teacher_name || header.teacher || '',
        academic_year: header.academic_year || header.year || '',
        term: header.term || '',
        class_name: header.class_name || header.class || header.grade || '',
        subject_name: header.subject_name || header.subject || '',
        unit_number: header.unit_number || header.unit || '',
        unit_title: header.unit_title || header.unit_name || header.unit || '',
        lesson_number: header.lesson_number || header.lesson || '',
        lesson_title: header.lesson_title || header.title || '',
        duration: header.duration || header.duration_minutes || '40 min',
        class_size: header.class_size || header.students_count || '',
        location: header.location || header.plan_for_class || 'Classroom',
        special_needs_provision: header.special_needs_provision || header.special_needs || 'None',
        key_unit_competence: header.key_unit_competence || header.key_competence || '',
        instructional_objective: header.instructional_objective || header.objective || '',
        plan_for_class: header.plan_for_class || header.location || 'Classroom',
        learning_materials: header.learning_materials || header.materials || header.resources || '',
        references: header.references || header.reference_materials || header.reference || ''
    };

    // 2. Normalize Visual Aid
    if (data.visual_aid || data.visualAid || data.diagram) {
        const v = data.visual_aid || data.visualAid || data.diagram;
        data.visual_aid = {
            title: v.title || 'Concept Diagram',
            mermaid_code: v.mermaid_code || v.code || v.mermaid || '',
            description: v.description || '',
            image_prompt: v.image_prompt || v.prompt || ''
        };
    }

    // 3. Normalize Phases
    const rawPhases = data.phases || data.lesson_phases || data.sections || data.steps || data.stages || [];
    const phasesArray = Array.isArray(rawPhases) ? rawPhases : Object.values(rawPhases);

    data.phases = phasesArray.map((p, idx) => {
        const section_name = p.section_name || p.name || p.phase_name || p.title || `Phase ${idx + 1}`;
        const timing = p.timing || p.duration || p.time || '';
        
        let rawSubs = p.sub_phases || p.subphases || p.subPhases || p.activities || p.steps || [];
        if (!Array.isArray(rawSubs) || rawSubs.length === 0) {
            if (p.teacher_activities || p.learner_activities || p.teacher_activity || p.student_activities || p.activities) {
                rawSubs = [p];
            } else {
                rawSubs = [{ type: section_name, teacher_activities: [], learner_activities: [], competences: [] }];
            }
        }

        const sub_phases = rawSubs.map(sub => {
            const type = sub.type || sub.name || sub.phase_type || section_name;
            const teacher_activities = toList(sub.teacher_activities || sub.teacher_activity || sub.teaching_activities || sub.teacher_actions || sub.teacher || sub.teacherActivities);
            const learner_activities = toList(sub.learner_activities || sub.learner_activity || sub.student_activities || sub.learning_activities || sub.learner_actions || sub.students || sub.learnerActivities);
            const competences = toList(sub.competences || sub.competence || sub.generic_competences || sub.cross_cutting_issues || sub.competencies);
            return {
                type,
                teacher_activities,
                learner_activities,
                competences
            };
        });

        return {
            section_name,
            timing,
            sub_phases
        };
    });

    data.lesson_flow_overview = data.lesson_flow_overview || data.overview || data.description || '';
    data.teacher_self_evaluation = data.teacher_self_evaluation || data.self_evaluation || data.evaluation || '';

    return data;
};

// Helper to parse and repair AI content outside component to avoid recreation
const parseAIContent = (content) => {
    if (!content) return null;

    let s = typeof content === 'string' ? content.trim() : JSON.stringify(content);

    // 1. Remove markdown code blocks if present
    if (s.includes('```')) {
        const jsonMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            s = jsonMatch[1].trim();
        } else {
            s = s.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        }
    }

    // 2. Find start of JSON object
    const firstBrace = s.indexOf('{');
    if (firstBrace !== -1) {
        s = s.substring(firstBrace);
    }

    // 3. Fix invalid escape sequences (LaTeX math \frac, \(, etc.)
    s = s.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');

    // 4. Try standard JSON.parse first
    try {
        const parsed = JSON.parse(s);
        return normalizeLessonPlanData(parsed);
    } catch (initialErr) {
        // Fall through to repair logic
    }

    try {
        // 5. Truncation & Unclosed Quote Repair
        let inString = false;
        let escaped = false;
        const openStack = [];

        for (let i = 0; i < s.length; i++) {
            const char = s[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{' || char === '[') {
                    openStack.push(char);
                } else if (char === '}' && openStack[openStack.length - 1] === '{') {
                    openStack.pop();
                } else if (char === ']' && openStack[openStack.length - 1] === '[') {
                    openStack.pop();
                }
            }
        }

        // If truncated inside a string literal, close the quote
        if (inString) {
            s += '"';
        }

        // Close all open brackets/braces in reverse order
        while (openStack.length > 0) {
            const open = openStack.pop();
            if (open === '{') s += '}';
            else if (open === '[') s += ']';
        }

        // Remove trailing commas before closing braces/brackets
        s = s.replace(/,\s*([\}\]])/g, '$1');

        const parsed = JSON.parse(s);
        return normalizeLessonPlanData(parsed);
    } catch (e) {
        console.error("Failed to parse AI content as JSON:", e);
        console.error("Problematic content (first 500 chars):", content?.substring(0, 500));
        return null;
    }
};

// Moved outside to prevent focus loss on state updates (unmount/remount)
const EditableCell = ({ value, onChange, multiline = true, bold = false, isEditing }) => {
    if (!isEditing) return <span>{value}</span>;
    
    if (multiline) {
        return (
            <textarea 
                className="reb-editable-input"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                style={{ fontWeight: bold ? 'bold' : 'normal' }}
            />
        );
    }
    return (
        <input 
            type="text"
            className="reb-editable-input-single"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontWeight: bold ? 'bold' : 'normal' }}
        />
    );
};const REBTableLayout = ({ 
    data, lesson, selfEval, setSelfEval, totalLessons, setTotalLessons,
    isEditing, onDataChange
}) => {
    if (!data) return <div className="alert alert-danger">Error rendering lesson plan structure. Please try regenerating.</div>;

    const header = data.header_details || {};
    const phases = data.phases || [];
    const [showImageAid, setShowImageAid] = useState(false);

    // Determine subject name for translation
    const subjectName = lesson.subject_name || lesson.subject?.name || '';
    const { t } = useSubjectLanguage(subjectName);

    const handleHeaderChange = (key, value) => {
        const newData = { ...data, header_details: { ...header, [key]: value } };
        onDataChange(newData);
    };

    const handlePhaseChange = (phaseIdx, key, value) => {
        const newPhases = [...phases];
        newPhases[phaseIdx] = { ...newPhases[phaseIdx], [key]: value };
        onDataChange({ ...data, phases: newPhases });
    };


    return (
        <div className="reb-container">
            <div className="reb-school-info-centered">
                <span>{t('School Name')}: <strong>{lesson.school_name || '-'}</strong></span>
                <span>{t('Teacher\'s Name')}: <strong>{lesson.teacher_name || '-'}</strong></span>
            </div>

            <table className="print-wrapper-table">
                <thead>
                    <tr>
                        <td>
                            <div className="print-header-spacer"></div>
                        </td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div className="table-container">
                                <table className="reb-table">
                                    <thead>
                                        <tr>
                                            <th colSpan="1">{t('Term')}</th>
                                            <th colSpan="1">{t('Date')}</th>
                                            <th colSpan="2">{t('Subject')}</th>
                                            <th colSpan="1">{t('Class')}</th>
                                            <th colSpan="1">{t('Unit Nº')}</th>
                                            <th colSpan="1">{t('Lesson Nº')}</th>
                                            <th colSpan="1">{t('Duration')}</th>
                                            <th colSpan="2">{t('Class Size')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan="1" style={{ textAlign: 'center' }}>{lesson.term || '-'}</td>
                                            <td colSpan="1" style={{ textAlign: 'center' }}>{lesson.teaching_date ? new Date(lesson.teaching_date).toLocaleDateString('en-GB') : '-'}</td>
                                            <td colSpan="2" style={{ textAlign: 'center' }}>{lesson.subject_name || lesson.subject?.name || '-'}</td>
                                            <td colSpan="1" style={{ textAlign: 'center' }}>{lesson.class_name || '-'}</td>
                                            <td colSpan="1" style={{ textAlign: 'center' }}>{lesson.unit_number || '-'}</td>
                                            <td colSpan="1" style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <span>{lesson.lesson_number}</span>
                                                    <span>/</span>
                                                    <input
                                                        type="text"
                                                        value={totalLessons}
                                                        onChange={(e) => setTotalLessons(e.target.value)}
                                                        placeholder="?"
                                                        disabled={!isEditing && false}
                                                        style={{
                                                            width: '25px',
                                                            border: 'none',
                                                            background: 'transparent',
                                                            textAlign: 'center',
                                                            fontFamily: 'inherit',
                                                            fontSize: 'inherit',
                                                            padding: '0',
                                                            outline: 'none',
                                                            fontWeight: 'inherit'
                                                        }}
                                                        title="Edit total lessons"
                                                    />
                                                </div>
                                            </td>
                                            <td colSpan="1" style={{ textAlign: 'center' }}>{lesson.duration ? `${lesson.duration} mins` : '-'}</td>
                                            <td colSpan="2" style={{ textAlign: 'center' }}>{lesson.class_size || '-'}</td>
                                        </tr>
                                        <tr>
                                            <th colSpan="3" className="reb-label">{t('Special Needs')}</th>
                                            <td colSpan="7">
                                                <EditableCell 
                                                    value={header.special_needs_provision} 
                                                    onChange={(val) => handleHeaderChange('special_needs_provision', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Unit Title Label')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.unit_title} 
                                                    onChange={(val) => handleHeaderChange('unit_title', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Key Unit Competence Label')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.key_unit_competence} 
                                                    onChange={(val) => handleHeaderChange('key_unit_competence', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Title of the lesson')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.lesson_title} 
                                                    onChange={(val) => handleHeaderChange('lesson_title', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Instructional Objective')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.instructional_objective} 
                                                    onChange={(val) => handleHeaderChange('instructional_objective', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Plan for this Class')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.plan_for_class} 
                                                    onChange={(val) => handleHeaderChange('plan_for_class', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Learning Materials')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.learning_materials} 
                                                    onChange={(val) => handleHeaderChange('learning_materials', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('References')}</th>
                                            <td colSpan="8">
                                                <EditableCell 
                                                    value={header.references} 
                                                    onChange={(val) => handleHeaderChange('references', val)} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>

                                        <tr>
                                            <th colSpan="2" className="reb-label">Visual Aid & Diagram</th>
                                            <td colSpan="8" style={{ padding: '12px' }}>
                                                {data.visual_aid ? (
                                                    <div>
                                                        <MermaidDiagram
                                                            code={data.visual_aid.mermaid_code}
                                                            title={data.visual_aid.title}
                                                            description={data.visual_aid.description}
                                                            onGenerateImage={() => setShowImageAid(prev => !prev)}
                                                        />
                                                        {(showImageAid || data.visual_aid.image_prompt) && (
                                                            <div style={{ marginTop: '12px', maxWidth: '650px', margin: '12px auto 0 auto' }}>
                                                                <ImageWidget
                                                                    url={`https://image.pollinations.ai/prompt/${encodeURIComponent(data.visual_aid.image_prompt || `${lesson.lesson_title || 'science'} educational diagram illustration, 4k`)}?width=900&height=500&nologo=true`}
                                                                    caption={data.visual_aid.image_prompt || `${lesson.lesson_title || 'Lesson'} Visual Aid`}
                                                                    badge="AI CLASSROOM VISUAL"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
                                                        <ImageWidget
                                                            url={`https://image.pollinations.ai/prompt/${encodeURIComponent(`${lesson.lesson_title || 'classroom'} educational diagram illustration, 4k`)}?width=900&height=500&nologo=true`}
                                                            caption={`${lesson.lesson_title || 'Lesson'} Visual Aid`}
                                                            badge="AI CLASSROOM VISUAL"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>

                                        {data.timing_chart && (
                                            <tr>
                                                <th colSpan="2" className="reb-label">Timing Distribution</th>
                                                <td colSpan="8" style={{ padding: '8px' }}>
                                                    <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                                                        <ChartWidget chartData={data.timing_chart} />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Development Table Headers */}
                                        <tr>
                                            <th rowSpan="3" colSpan="1" className="timing-col" style={{ width: '80px' }}>{t('Timing for each step')}</th>
                                            <th colSpan="6">{t('Description of teaching and learning activity')}</th>
                                            <th rowSpan="3" colSpan="3" className="competences-col">{t('Generic competences and Cross cutting issues')}</th>
                                        </tr>
                                        <tr>
                                            <td colSpan="6" className="activity-overview-cell">
                                                <EditableCell 
                                                    value={data.lesson_flow_overview} 
                                                    onChange={(val) => onDataChange({ ...data, lesson_flow_overview: val })} 
                                                    isEditing={isEditing}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="3">{t('Teacher activities')}</th>
                                            <th colSpan="3">{t('Learner activities')}</th>
                                        </tr>

                                        {/* Content Rows */}
                                        {phases.map((section, idx) => {
                                            const subPhases = (section.sub_phases && section.sub_phases.length > 0) 
                                                ? section.sub_phases 
                                                : [{ type: section.section_name, teacher_activities: [], learner_activities: [], competences: [] }];

                                            return (
                                                <tr key={idx}>
                                                    <td colSpan="1" className="timing-col">
                                                        <EditableCell 
                                                            value={section.section_name} 
                                                            onChange={(val) => handlePhaseChange(idx, 'section_name', val)} 
                                                            bold 
                                                            isEditing={isEditing}
                                                        />
                                                        <EditableCell 
                                                            value={section.timing} 
                                                            onChange={(val) => handlePhaseChange(idx, 'timing', val)} 
                                                            isEditing={isEditing}
                                                        />
                                                    </td>
                                                    <td colSpan="3">
                                                        {isEditing ? (
                                                            <textarea 
                                                                className="reb-editable-input"
                                                                style={{ minHeight: '150px' }}
                                                                value={subPhases.map(sub => 
                                                                    `${sub.type ? `${sub.type} Phase:\n` : ''}${toList(sub.teacher_activities).join('\n')}`
                                                                ).join('\n\n')}
                                                                onChange={(e) => {
                                                                    handlePhaseChange(idx, 'raw_teacher_activities', e.target.value);
                                                                }}
                                                            />
                                                        ) : (
                                                            subPhases.map((sub, i) => (
                                                                <div key={i} style={{ marginBottom: i < subPhases.length - 1 ? '15px' : '0' }}>
                                                                    {sub.type && (
                                                                        <div className="phase-inner-header">
                                                                            {sub.type.toLowerCase().includes('phase') ? sub.type : `${sub.type} Phase`}:
                                                                        </div>
                                                                    )}
                                                                    <ul className="bullet-list">
                                                                        {toList(sub.teacher_activities).map((act, j) => <li key={j}>{act}</li>)}
                                                                    </ul>
                                                                </div>
                                                            ))
                                                        )}
                                                    </td>
                                                    <td colSpan="3">
                                                        {isEditing ? (
                                                            <textarea 
                                                                className="reb-editable-input"
                                                                style={{ minHeight: '150px' }}
                                                                value={subPhases.map(sub => 
                                                                    toList(sub.learner_activities).join('\n')
                                                                ).join('\n\n')}
                                                                onChange={(e) => {
                                                                    handlePhaseChange(idx, 'raw_learner_activities', e.target.value);
                                                                }}
                                                            />
                                                        ) : (
                                                            subPhases.map((sub, i) => (
                                                                <div key={i} style={{ marginBottom: i < subPhases.length - 1 ? '15px' : '0' }}>
                                                                    <ul className="bullet-list">
                                                                        {toList(sub.learner_activities).map((act, j) => <li key={j}>{act}</li>)}
                                                                    </ul>
                                                                </div>
                                                            ))
                                                        )}
                                                    </td>
                                                    <td colSpan="3">
                                                        {isEditing ? (
                                                            <textarea 
                                                                className="reb-editable-input"
                                                                style={{ minHeight: '150px' }}
                                                                value={subPhases.map(sub => 
                                                                    toList(sub.competences).join('\n')
                                                                ).join('\n\n')}
                                                                onChange={(e) => {
                                                                    handlePhaseChange(idx, 'raw_competences', e.target.value);
                                                                }}
                                                            />
                                                        ) : (
                                                            subPhases.map((sub, i) => (
                                                                <ul className="bullet-list" key={i}>
                                                                    {toList(sub.competences).map((comp, j) => {
                                                                        const parts = typeof comp === 'string' ? comp.split(':') : [String(comp)];
                                                                        if (parts.length > 1) {
                                                                            return (
                                                                                <li key={j}>
                                                                                    <strong>{parts[0]}:</strong> {parts.slice(1).join(':')}
                                                                                </li>
                                                                            );
                                                                        }
                                                                        return <li key={j}>{comp}</li>;
                                                                    })}
                                                                </ul>
                                                            ))
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {/* Final row for self-evaluation */}
                                        <tr>
                                            <th colSpan="2" className="reb-label">{t('Teacher\'s self-evaluation')}</th>
                                            <td colSpan="8" style={{ padding: '0' }}>
                                                <textarea
                                                    className="self-evaluation-input"
                                                    value={selfEval}
                                                    onChange={(e) => setSelfEval(e.target.value)}
                                                    placeholder="Click to edit self-evaluation..."
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '100px',
                                                        border: 'none',
                                                        padding: '12px',
                                                        fontFamily: 'inherit',
                                                        fontSize: '11pt',
                                                        resize: 'vertical',
                                                        display: 'block',
                                                        outline: 'none',
                                                        background: 'transparent'
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td>
                            <div className="print-footer-spacer"></div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

const LessonPlanPage = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { fetchSubscription } = useSubscription();
    const shouldGenerate = searchParams.get('generate') === 'true';

    const [lessonPlan, setLessonPlan] = useState(null);
    const [lessonData, setLessonData] = useState(null);
    const [unitLessons, setUnitLessons] = useState([]); // Other lessons in same unit
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableData, setEditableData] = useState(null);
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [selfEval, setSelfEval] = useState('');
    const [totalLessons, setTotalLessons] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('groq');
    const [genStep, setGenStep] = useState(0);

    const { isVIP } = useSubscription();

    const subjectName = lessonData?.subject_name || lessonData?.subject?.name || '';
    const { t } = useSubjectLanguage(subjectName);

    const generateWordDocument = () => {
        const data = parseAIContent(lessonPlan.content);
        if (!data) return;

        const header = data.header_details || {};
        const phases = data.phases || [];
        const selfEvalStr = selfEval || data.teacher_self_evaluation || '';

        const createCell = (text, opts = {}) => {
            const paragraphs = [];
            const lines = String(text || "-").split('\n');

            lines.forEach((line) => {
                const rawLine = line;
                const trimmedLine = line.trim();

                if (!trimmedLine) {
                    if (lines.length > 1) {
                        paragraphs.push(new Paragraph({
                            children: [new TextRun({ text: "", size: 22, font: "Times New Roman", color: "000000" })],
                            spacing: { before: 60, after: 60 }
                        }));
                    }
                    return;
                }

                // Detection for styles
                const isSubHeader = trimmedLine.startsWith('•') && trimmedLine.endsWith('Phase:');
                const isBullet = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*');
                const isNumbered = /^\d+[\.\)]\s/.test(trimmedLine);
                const isActivityPoint = rawLine.startsWith('   -') || rawLine.startsWith('   •');
                const isAnswer = rawLine.startsWith('   Answer:') || rawLine.startsWith('   A:');

                // Parsing for bold **text**
                const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
                const runs = parts.filter(p => p).map(part => {
                    const isPartBold = (part.startsWith('**') && part.endsWith('**')) || isSubHeader || opts.bold;
                    let cleanText = isPartBold ? part.replace(/\*\*/g, '') : part;

                    return new TextRun({
                        text: cleanText,
                        bold: isPartBold,
                        italic: opts.italic,
                        size: 22,
                        font: "Times New Roman",
                        color: "000000"
                    });
                });

                // Calculate Indentation (in twips: 1/1440 inch)
                let indent = undefined;
                if (isAnswer || isActivityPoint) {
                    indent = { left: 720 }; // 0.5 inch indent for nested content
                } else if (isBullet || isNumbered) {
                    indent = { left: 360, hanging: 360 }; // Hanging indent for list items
                } else if (rawLine.startsWith('   ')) {
                    indent = { left: 360 }; // Basic indent for wrapped lines
                }

                paragraphs.push(new Paragraph({
                    children: runs,
                    alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT),
                    spacing: { before: 80, after: 80 },
                    indent: indent
                }));
            });

            return new TableCell({
                children: paragraphs,
                columnSpan: opts.colSpan || 1,
                rowSpan: opts.rowSpan || 1,
                shading: opts.header ? { fill: "F2F2F2", type: ShadingType.CLEAR, color: "000000" } : undefined,
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
                }
            });
        };

        const createRowWithLabel = (label, value) => new TableRow({
            children: [
                createCell(label, { bold: true, colSpan: 2, header: true }),
                createCell(value, { colSpan: 8 })
            ]
        });

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 720, right: 720, bottom: 720, left: 720 }
                    }
                },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `School Name: ${lessonData.school_name || '-'}`, bold: true, size: 32, font: "Times New Roman", color: "000000" }),
                            new TextRun({ text: `        `, size: 32, font: "Times New Roman", color: "000000" }), // Spacing
                            new TextRun({ text: `Teacher's name: ${lessonData.teacher_name || '-'}`, bold: true, size: 32, font: "Times New Roman", color: "000000" })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    createCell("Term", { bold: true, center: true, header: true }),
                                    createCell("Date", { bold: true, center: true, header: true }),
                                    createCell("Subject", { bold: true, center: true, header: true, colSpan: 2 }),
                                    createCell("Class", { bold: true, center: true, header: true }),
                                    createCell("Unit Nº", { bold: true, center: true, header: true }),
                                    createCell("Lesson Nº", { bold: true, center: true, header: true }),
                                    createCell("Duration", { bold: true, center: true, header: true }),
                                    createCell("Class size", { bold: true, center: true, header: true, colSpan: 2 })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell(lessonData.term, { center: true }),
                                    createCell(lessonData.teaching_date ? new Date(lessonData.teaching_date).toLocaleDateString('en-GB') : '', { center: true }),
                                    createCell(lessonData.subject_name || lessonData.subject?.name, { center: true, colSpan: 2 }),
                                    createCell(lessonData.class_name, { center: true }),
                                    createCell(lessonData.unit_number, { center: true }),
                                    createCell(`${lessonData.lesson_number}/${totalLessons}`, { center: true }),
                                    createCell(lessonData.duration ? `${lessonData.duration} mins` : '', { center: true }),
                                    createCell(lessonData.class_size, { center: true, colSpan: 2 })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Type of Special Educational Needs to be catered for in this lesson and number of learners in each category", { bold: true, colSpan: 3, header: true }),
                                    createCell(header.special_needs_provision || "None", { colSpan: 7 })
                                ]
                            }),
                            createRowWithLabel("Unit title", header.unit_title),
                            createRowWithLabel("Key Unit Competence", header.key_unit_competence),
                            createRowWithLabel("Title of the lesson", header.lesson_title),
                            createRowWithLabel("Instructional Objective", header.instructional_objective),
                            createRowWithLabel("Plan for this Class (location: in / outside)", header.plan_for_class),
                            createRowWithLabel("Learning Materials (for all learners)", header.learning_materials),
                            createRowWithLabel("References", header.references),

                            new TableRow({
                                children: [
                                    createCell("Timing for each step", { bold: true, center: true, rowSpan: 3, header: true }),
                                    createCell("Description of teaching and learning activity", { bold: true, center: true, colSpan: 6, header: true }),
                                    createCell("Generic competences and Cross cutting issues to be addressed + a short explanation", { bold: true, center: true, colSpan: 3, rowSpan: 3, header: true })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell(data.lesson_flow_overview, { colSpan: 6, italic: true, center: false, allowEmpty: true })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Teacher activities", { bold: true, center: true, colSpan: 3, header: true }),
                                    createCell("Learner activities", { bold: true, center: true, colSpan: 3, header: true })
                                ]
                            }),
                            ...phases.map(section => new TableRow({
                                children: [
                                    createCell(`${section.section_name}\n(${section.timing})`, { bold: true, center: true }),
                                    createCell((section.sub_phases || section.subphases || []).map(sub => {
                                        const typeLabel = sub.type?.toLowerCase().includes('phase') ? sub.type : `${sub.type} Phase`;
                                        return `• ${typeLabel}:\n${Array.isArray(sub.teacher_activities) ? sub.teacher_activities.map(a => `   - ${a}`).join('\n') : sub.teacher_activities || ''}`;
                                    }).join('\n\n'), { colSpan: 3 }),
                                    createCell((section.sub_phases || section.subphases || []).map(sub => `${Array.isArray(sub.learner_activities) ? sub.learner_activities.map(act => `• ${act}`).join('\n') : sub.learner_activities || ''}`).join('\n\n'), { colSpan: 3 }),
                                    createCell((section.sub_phases || section.subphases || []).map(sub => `${Array.isArray(sub.competences) ? sub.competences.map(c => `• ${c}`).join('\n') : sub.competences || ''}`).join('\n\n'), { colSpan: 3 })
                                ]
                            })),
                            createRowWithLabel("Teacher's self-evaluation", selfEvalStr)
                        ]
                    })
                ]
            }]
        });



        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `LessonPlan_${lessonData.lesson_title.replace(/\s+/g, '_')}.docx`);
            setShowExportOptions(false);
        });
    };

    useEffect(() => {
        fetchLessonPlan();
    }, [lessonId]);

    useEffect(() => {
        if (shouldGenerate && !lessonPlan && !generating) {
            handleGenerate();
        }
    }, [shouldGenerate, lessonPlan]);

    const fetchLessonPlan = async () => {
        try {
            const response = await api.get(`/lesson-plans/lessons/${lessonId}/plan`);
            let lData = null;
            
            if (response.data.success && response.data.data) {
                lData = response.data.data;
                setLessonData(lData);
                setTotalLessons(lData.total_lessons || '');

                if (!response.data.noPlan) {
                    setLessonPlan(lData);
                    const parsed = parseAIContent(lData.content);
                    setEditableData(parsed);
                    // Keep selfEval empty for manual entry as requested
                } else {
                    // It's a new lesson with no generated plan yet
                    setLessonPlan(null);
                    setEditableData(null);
                }
            }

            // Fetch other lessons in the same unit for the switcher
            if (lData && lData.unit_id) {
                const unitRes = await api.get(`/lessons/units/${lData.unit_id}/lessons`);
                setUnitLessons(unitRes.data.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if (error.response?.status !== 404) {
                toast.error('Failed to load lesson data');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdits = async () => {
        try {
            const toastId = toast.loading('Saving changes...');
            
            // Process the raw_ activities if they were edited
            const finalData = { ...editableData };
            finalData.teacher_self_evaluation = selfEval;

            finalData.phases = finalData.phases.map(section => {
                const newSection = { ...section };
                
                if (section.raw_teacher_activities) {
                    // Split by "Phase:" to find sub-phases
                    const raw = section.raw_teacher_activities;
                    const subPhaseTexts = raw.split(/(\w+ Phase:)/).filter(p => p.trim());
                    
                    const subPhases = [];
                    for (let i = 0; i < subPhaseTexts.length; i += 2) {
                        const type = subPhaseTexts[i].replace(' Phase:', '').trim();
                        const activities = subPhaseTexts[i+1]?.split('\n').map(a => a.trim()).filter(a => a) || [];
                        subPhases.push({ type, teacher_activities: activities });
                    }
                    newSection.sub_phases = subPhases;
                    delete newSection.raw_teacher_activities;
                }

                if (section.raw_learner_activities) {
                    // For learner activities, we map back to the sub_phases in order
                    const activities = section.raw_learner_activities.split('\n\n');
                    (newSection.sub_phases || newSection.subphases || []).forEach((sub, i) => {
                        if (activities[i]) {
                            sub.learner_activities = activities[i].split('\n').map(a => a.trim()).filter(a => a);
                        }
                    });
                    delete newSection.raw_learner_activities;
                }

                if (section.raw_competences) {
                    const activities = section.raw_competences.split('\n\n');
                    (newSection.sub_phases || newSection.subphases || []).forEach((sub, i) => {
                        if (activities[i]) {
                            sub.competences = activities[i].split('\n').map(a => a.trim()).filter(a => a);
                        }
                    });
                    delete newSection.raw_competences;
                }

                return newSection;
            });

            const res = await api.put(`/lesson-plans/${lessonPlan.id}`, {
                content: JSON.stringify(finalData)
            });

            setLessonPlan(res.data.data);
            setIsEditing(false);
            toast.update(toastId, { render: 'Lesson plan updated successfully!', type: 'success', isLoading: false, autoClose: 2000 });
        } catch (error) {
            toast.error('Failed to save changes');
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setGenStep(1); // Reading materials
        const toastId = toast.loading('Reading materials and curriculum...');

        try {
            await new Promise(r => setTimeout(r, 600));
            setGenStep(2); // AI Analysis
            toast.update(toastId, { render: 'AI Engine analyzing curriculum...' });

            const response = await api.post(`/lesson-plans/lessons/${lessonId}/plan/generate`, {
                provider: selectedProvider
            });

            setGenStep(3); // Finalizing
            toast.update(toastId, {
                render: 'Lesson plan generated successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 3000
            });

            setLessonPlan(response.data.data);
            setLessonData(response.data.data);
            setTotalLessons(response.data.data.total_lessons || '');

            const parsed = parseAIContent(response.data.data.content);
            setEditableData(parsed);
            // Keep selfEval empty for manual entry as requested
        } catch (error) {
            const isSubError = error.response?.data?.subscriptionError;
            const message = error.response?.data?.message || 'Failed to generate lesson plan';
            toast.update(toastId, {
                render: isSubError
                    ? `🔒 ${message}`
                    : message,
                type: 'error',
                isLoading: false,
                autoClose: isSubError ? 8000 : 5000
            });
            if (isSubError) {
                // Refresh subscription context so UI reflects real state
                fetchSubscription?.();
            }
        } finally {
            setGenerating(false);
            setGenStep(0);
            setShowRegenerateModal(false);
        }
    };

    const updateLessonStatus = async (isCompleted) => {
        try {
            await api.put(`/lessons/${lessonId}`, { is_completed: isCompleted });
            setLessonData({ ...lessonData, is_completed: isCompleted });
            toast.success(isCompleted ? 'Lesson marked as completed' : 'Lesson set to upcoming');
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const updateReflection = async () => {
        try {
            await api.put(`/lessons/${lessonId}`, { teacher_reflection: lessonData.teacher_reflection });
            toast.success('Reflection saved. This will be used to improve the next lesson plan.');
        } catch (error) {
            toast.error('Failed to save reflection');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
                <div className="vibrant-spinner" style={{ width: 48, height: 48 }}></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', paddingBottom: 'var(--sp-12)' }}>
            <div className="dashboard-container" style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--sp-8)' }}>
                
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <button 
                        onClick={() => {
                            if (lessonData?.unit_id) {
                                // Navigate back to the specific unit list
                                navigate(-1); // or build specific path if needed
                            } else {
                                navigate(-1);
                            }
                        }} 
                        className="vibrant-back-link" 
                        style={{ background: 'var(--c-surface)', padding: '10px 16px', border: '1px solid var(--c-border-soft)', margin: 0 }}
                    >
                        <ArrowLeft size={18} /> Back to Units
                    </button>

                    <div className="lesson-switcher-box">
                        <div className="current-lesson-indicator">
                            <span className="switcher-label">Currently Planning:</span>
                            <span className="current-lesson-name">
                                Topic {lessonData?.lesson_number}: {lessonData?.lesson_title}
                            </span>
                        </div>
                        
                        {unitLessons.length > 1 && (
                            <div className="switcher-select-wrapper">
                                <span className="switcher-label">Switch to:</span>
                                <select 
                                    className="lesson-switcher-select"
                                    value={lessonId}
                                    onChange={(e) => navigate(`/lessons/${e.target.value}/plan`)}
                                >
                                    {unitLessons.map(l => (
                                        <option key={l.id} value={l.id}>
                                            Topic {l.lesson_number}: {l.lesson_title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Header Card */}
                <div className="auth-centered-card no-print" style={{ maxWidth: 'none', padding: 'var(--sp-8)', marginBottom: 'var(--sp-6)' }}>
                    <div className="plan-actions-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-6)' }}>
                        <div>
                            <h1 className="auth-title-large" style={{ fontSize: '2rem', marginBottom: 'var(--sp-2)', textAlign: 'left' }}>
                                {lessonData?.lesson_title || 'Lesson Plan'}
                            </h1>
                            {lessonData && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', alignItems: 'center' }}>
                                    <span style={{ background: 'var(--c-brand-light)', color: 'var(--c-brand)', padding: '4px 12px', borderRadius: 'var(--r-full)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                        Unit {lessonData.unit_number || '-'}
                                    </span>
                                    <span style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-secondary)', padding: '4px 12px', borderRadius: 'var(--r-full)', fontSize: '0.7rem', fontWeight: 600 }}>
                                        Lesson {lessonData.lesson_number}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-text-muted)', fontSize: '0.8125rem' }}>
                                        <Clock size={14} /> {lessonData.duration} mins
                                    </span>
                                </div>
                            )}
                        </div>

                    </div>
                    
                    <div style={{ marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-6)', borderTop: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 'var(--r-md)', background: lessonData?.is_completed ? 'var(--c-brand-light)' : '#fff8e1', color: lessonData?.is_completed ? 'var(--c-brand)' : '#b45309', border: '1px solid currentColor', fontSize: '0.65rem', fontWeight: 800 }}>
                            {lessonData?.is_completed ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {lessonData?.is_completed ? 'COMPLETED' : 'UPCOMING'}
                        </div>
                        <span style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem' }}>
                            Generated: {lessonPlan?.created_at ? new Date(lessonPlan.created_at).toLocaleDateString('en-GB') : '-'}
                        </span>
                    </div>
                </div>


                {/* Lesson Plan Content */}
                <div className="auth-centered-card lesson-plan-content-card" style={{ maxWidth: 'none', padding: 0, overflow: 'hidden' }}>
                    <div className="no-print plan-actions-container" style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border-soft)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={16} style={{ color: 'var(--c-brand)' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official REB Format</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="no-print plan-actions-group">
                            <button 
                                onClick={() => setShowRegenerateModal(true)} 
                                className="vibrant-secondary-btn" 
                                style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', height: '32px' }}
                                disabled={generating}
                            >
                                <RefreshCw size={14} /> Regenerate
                            </button>

                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setShowExportOptions(!showExportOptions)} 
                                    className="vibrant-submit-btn" 
                                    style={{ width: 'auto', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', height: '32px', background: 'var(--c-brand)', border: 'none' }}
                                >
                                    <FileDown size={14} /> Export / Print
                                </button>
                                
                                {showExportOptions && (
                                    <div className="auth-centered-card no-print" style={{ maxWidth: 280, position: 'absolute', right: 0, top: '100%', marginTop: 8, zIndex: 100, padding: 'var(--sp-2)', boxShadow: 'var(--shadow-xl)' }}>
                                        <div style={{ display: 'grid', gap: '2px' }}>
                                            <button onClick={() => { window.print(); setShowExportOptions(false); }} className="action-item" style={{ width: '100%', textAlign: 'left', padding: '10px', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.8rem' }}>
                                                <Printer size={14} style={{ color: 'var(--c-brand)' }} /> <span>Print / Save as PDF</span>
                                            </button>
                                            <button onClick={generateWordDocument} className="action-item" style={{ width: '100%', textAlign: 'left', padding: '10px', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.8rem' }}>
                                                <FileText size={14} style={{ color: 'var(--c-brand)' }} /> <span>Export to Word (.docx)</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ width: '1px', height: '20px', background: 'var(--c-border-soft)', margin: '0 4px' }}></div>

                            {isEditing ? (
                                <button onClick={handleSaveEdits} className="vibrant-secondary-btn" style={{ width: 'auto', background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', fontSize: '0.75rem', height: '32px' }}>
                                    <CheckCircle size={14} /> Save
                                </button>
                            ) : (
                                isVIP && (
                                    <button onClick={() => setIsEditing(true)} className="vibrant-secondary-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.75rem', height: '32px' }}>
                                        <Edit3 size={14} /> Edit Plan
                                    </button>
                                )
                            )}
                            {isEditing && (
                                <button onClick={() => setIsEditing(false)} className="vibrant-back-link" style={{ fontSize: '0.75rem', padding: '6px 14px', background: 'none', margin: 0 }}>
                                    <X size={14} /> Cancel
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ padding: 'var(--sp-2)', background: '#fff' }}>
                        {lessonPlan ? (
                            <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <REBTableLayout 
                                    data={isEditing ? editableData : parseAIContent(lessonPlan.content)} 
                                    lesson={lessonData} 
                                    selfEval={selfEval}
                                    setSelfEval={setSelfEval}
                                    totalLessons={totalLessons}
                                    setTotalLessons={setTotalLessons}
                                    isEditing={isEditing}
                                    onDataChange={(newData) => {
                                        setIsEditing(true);
                                        setEditableData(newData);
                                    }}
                                />
                            </div>
                        ) : (
                            <div style={{ padding: 'var(--sp-12)', textAlign: 'center' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'var(--c-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-6)' }}>
                                    <Zap size={32} style={{ color: 'var(--c-brand)', opacity: 0.5 }} />
                                </div>
                                <h3 style={{ color: 'var(--c-text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>No lesson plan generated yet</h3>
                                <p style={{ color: 'var(--c-text-muted)', marginBottom: 'var(--sp-8)', maxWidth: 300, margin: 'var(--sp-2) auto var(--sp-8)' }}>
                                    Create a professional, REB-aligned lesson plan in seconds using our AI.
                                </p>
                                <button onClick={handleGenerate} disabled={generating} className="vibrant-submit-btn" style={{ width: 'auto', margin: '0 auto', padding: '12px 32px' }}>
                                    {generating ? <div className="vibrant-spinner" style={{ width: 20, height: 20 }}></div> : 'Generate Plan Now'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reflection & Status Section - Moved to Bottom */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--sp-6)', marginTop: 'var(--sp-6)' }} className="no-print">
                    <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', borderLeft: '4px solid var(--c-brand)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: 'var(--sp-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Edit3 size={16} style={{ color: 'var(--c-brand)' }} /> Teacher's Reflection & Progress
                        </h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-secondary)', marginBottom: 'var(--sp-4)' }}>
                            How did the lesson go? Your reflection here will guide the AI for the next lesson plan.
                        </p>
                        <div className="vibrant-field">
                            <textarea 
                                className="vibrant-input-group"
                                style={{ width: '100%', minHeight: 80, padding: '12px', borderRadius: 'var(--r-lg)', background: 'var(--c-bg)', border: '1.5px solid var(--c-border)', fontSize: '0.875rem', outline: 'none' }}
                                value={lessonData?.teacher_reflection || ''}
                                onChange={(e) => setLessonData({ ...lessonData, teacher_reflection: e.target.value })}
                                onBlur={updateReflection}
                                placeholder="e.g., Learners struggled with division of fractions. Need to review this in the next session."
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sp-3)' }}>
                            <button onClick={updateReflection} className="vibrant-secondary-btn" style={{ width: 'auto', border: 'none', background: 'var(--c-brand)', color: '#fff', padding: '6px 16px', fontSize: '0.75rem' }}>
                                <Save size={14} /> Save Reflection
                            </button>
                        </div>
                    </div>

                    <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', margin: 0 }} onClick={() => updateLessonStatus(!lessonData?.is_completed)}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid var(--c-brand)', background: lessonData?.is_completed ? 'var(--c-brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                                {lessonData?.is_completed && <X size={14} color="white" style={{ transform: 'rotate(45deg)' }} />}
                                {!lessonData?.is_completed && <div style={{ width: 10, height: 10, borderRadius: 2, background: 'transparent' }}></div>}
                            </div>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--c-text-primary)' }}>Mark as Completed</span>
                        </label>
                        <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: 8, paddingLeft: 34, lineHeight: 1.4 }}>
                            Moving completed lessons to history helps unlock professional analytics.
                        </p>
                    </div>
                </div>
            </div>

            {/* Regenerate Warning Modal */}
            {showRegenerateModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)' }}>
                    <div className="auth-centered-card" style={{ maxWidth: 420, animation: 'scaleIn 0.3s ease-out', padding: 'var(--sp-8)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-6)' }}>
                            <AlertTriangle size={28} />
                        </div>
                        <h2 className="auth-title-large" style={{ textAlign: 'center', marginBottom: 'var(--sp-2)' }}>Regenerate Plan?</h2>
                        <p className="auth-subtitle-soft" style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
                            This will create a fresh lesson plan. <strong>Your previous versions will be permanently removed</strong> and cannot be recovered.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                            <button 
                                onClick={handleGenerate} 
                                className="vibrant-submit-btn" 
                                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                                disabled={generating}
                            >
                                <Trash2 size={18} /> Confirm & Replace
                            </button>
                            <button onClick={() => setShowRegenerateModal(false)} className="vibrant-secondary-btn">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {/* Generation Progress Overlay */}
            {generating && createPortal(
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 12000, 
                    background: 'rgba(var(--c-brand-rgb), 0.15)', 
                    backdropFilter: 'blur(24px)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: 'var(--sp-4)' 
                }}
                className="animate-fade"
                >
                    <div style={{ 
                        textAlign: 'center', 
                        maxWidth: 480, 
                        width: '100%',
                        background: 'var(--c-surface)',
                        padding: '48px 32px',
                        borderRadius: '40px',
                        boxShadow: 'var(--sh-xl)',
                        border: '1px solid var(--c-border)'
                    }}>
                        <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 32px' }}>
                            <div className="vibrant-spinner" style={{ width: 120, height: 120, borderWidth: 5 }}></div>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={40} style={{ color: 'var(--c-brand)' }} className="animate-pulse" />
                            </div>
                        </div>
                        
                        <h2 style={{ color: 'var(--c-text-primary)', fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--sp-2)', fontFamily: 'var(--font-display)' }}>
                            {genStep === 1 ? 'Gathering Context...' : genStep === 2 ? 'AI is Analyzing...' : 'Polishing Your Plan...'}
                        </h2>
                        <p style={{ color: 'var(--c-text-secondary)', fontSize: '0.9375rem', marginBottom: '40px' }}>
                            Creating a professional REB-aligned pedagogical script.
                        </p>
                        
                        <div style={{ background: 'var(--c-surface-2)', borderRadius: '28px', padding: '28px', textAlign: 'left', border: '1px solid var(--c-border-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, opacity: genStep >= 1 ? 1 : 0.3, transition: 'all 0.4s' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: genStep > 1 ? 'var(--c-brand)' : 'var(--c-surface)', border: '2px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: genStep > 1 ? '#fff' : 'var(--c-text-muted)', fontWeight: 800 }}>
                                    {genStep > 1 ? <CheckCircle size={20} /> : '1'}
                                </div>
                                <div>
                                    <div style={{ color: 'var(--c-text-primary)', fontSize: '0.95rem', fontWeight: 700 }}>Curriculum Scan</div>
                                    <div style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem' }}>Extracting relevant REB standards</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, opacity: genStep >= 2 ? 1 : 0.3, transition: 'all 0.4s' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: genStep > 2 ? 'var(--c-brand)' : 'var(--c-surface)', border: '2px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: genStep > 2 ? '#fff' : 'var(--c-text-muted)', fontWeight: 800 }}>
                                    {genStep > 2 ? <CheckCircle size={20} /> : '2'}
                                </div>
                                <div>
                                    <div style={{ color: 'var(--c-text-primary)', fontSize: '0.95rem', fontWeight: 700 }}>AI Pedagogical Analysis</div>
                                    <div style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem' }}>Structuring objectives and assessment</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: genStep >= 3 ? 1 : 0.3, transition: 'all 0.4s' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: genStep > 3 ? 'var(--c-brand)' : 'var(--c-surface)', border: '2px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: genStep > 3 ? '#fff' : 'var(--c-text-muted)', fontWeight: 800 }}>
                                    {genStep > 3 ? <CheckCircle size={20} /> : '3'}
                                </div>
                                <div>
                                    <div style={{ color: 'var(--c-text-primary)', fontSize: '0.95rem', fontWeight: 700 }}>Final Quality Check</div>
                                    <div style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem' }}>Validating content and timing</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; padding: 0; }
                    .dashboard-container { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                    .lesson-plan-content-card { box-shadow: none !important; border: none !important; padding: 0 !important; }
                    .reb-container { padding: 0 !important; margin: 0 !important; }
                }
                .lesson-plan-content-card { animation: slideUp 0.5s ease-out; }
                .action-item:hover { background: var(--c-brand-light) !important; color: var(--c-brand); }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
export default LessonPlanPage;
