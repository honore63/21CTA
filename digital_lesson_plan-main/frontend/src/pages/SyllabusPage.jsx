import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiBookOpen, FiFileText, FiSearch, FiCode, FiArrowRight, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { SkeletonBox, SkeletonCard } from '../components/Skeleton';
import './Dashboard.css';
import './SyllabusPage.css';

const SyllabusPage = () => {
    const navigate = useNavigate();
    const [syllabuses, setSyllabuses] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        subject_name: '',
        grade_level: '', // Now used as Level (O-Level, A-Level, Primary, etc.)
        content_text: ''
    });
    const [isManualSubject, setIsManualSubject] = useState(false);
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchSyllabuses();
        fetchSubjects();
    }, []);

    const fetchSyllabuses = async () => {
        try {
            const response = await api.get('/syllabuses');
            setSyllabuses(response.data.data);
        } catch (error) {
            toast.error('Failed to load syllabuses');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const response = await api.get('/subjects');
            setAllSubjects(response.data.data);
        } catch (error) {
            console.error('Failed to load subjects');
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSyllabusUpload = async (e) => {
        e.preventDefault();

        if (!file && !formData.content_text) {
            toast.error('Please provide syllabus content as text or upload a PDF');
            return;
        }

        setProcessing(true);
        try {
            if (file) {
                const data = new FormData();
                data.append('syllabus', file);
                data.append('subject_name', formData.subject_name);
                data.append('grade_level', formData.grade_level);

                await api.post('/syllabuses/process-pdf', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Syllabus processed and structured by AI');
            } else {
                await api.post('/syllabuses', formData);
                toast.success('Syllabus added and structured');
            }

            setShowModal(false);
            setFormData({ subject_name: '', grade_level: '', content_text: '' });
            setFile(null);
            fetchSyllabuses();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload syllabus');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this syllabus?')) return;
        try {
            await api.delete(`/syllabuses/${id}`);
            toast.success('Syllabus deleted');
            setSyllabuses(syllabuses.filter(s => s.id !== id));
        } catch (error) {
            toast.error('Failed to delete syllabus');
        }
    };

    const handleManageStructure = (syllabusId) => {
        navigate(`/admin/syllabuses/${syllabusId}/structure`);
    };

    const filteredSyllabuses = syllabuses.filter(s =>
        s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.grade_level?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-slide-up">
            <div className="dashboard-container">
                {/* Header Section */}
                <div className="syllabus-header">
                    <div className="syllabus-header-content">
                        <h1 className="workspace-title">REB Syllabuses</h1>
                        <p className="workspace-subtitle">Manage curriculum levels (O-Level, A-Level, Primary) for AI automation.</p>
                    </div>
                    <button className="btn btn-primary btn-with-icon" onClick={() => setShowModal(true)}>
                        <FiPlus size={20} />
                        <span>New Syllabus</span>
                    </button>
                </div>

                {/* Search Section */}
                <div className="syllabus-search-section">
                    <div className="search-bar-premium">
                        <FiSearch size={18} />
                        <input
                            type="text"
                            placeholder="Search by subject or level (e.g., Mathematics, O-Level)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="syllabus-content">
                    {loading ? (
                        <div className="syllabuses-grid">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <SkeletonSyllabusCard key={i} />
                            ))}
                        </div>
                    ) : filteredSyllabuses.length === 0 ? (
                        <div className="empty-state-container">
                            <div className="empty-state-icon">
                                <FiFileText size={48} />
                            </div>
                            <h3 className="empty-state-title">No Syllabuses Found</h3>
                            <p className="empty-state-text">
                                {searchTerm ? 'Try adjusting your search terms' : 'Upload a PDF or paste text to enable curriculum automation.'}
                            </p>
                            {!searchTerm && (
                                <button className="btn btn-primary mt-6" onClick={() => setShowModal(true)}>
                                    <FiPlus size={18} /> Create First Syllabus
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="syllabuses-grid">
                            {filteredSyllabuses.map(syllabus => (
                                <SyllabusCard 
                                    key={syllabus.id}
                                    syllabus={syllabus}
                                    onManageStructure={() => handleManageStructure(syllabus.id)}
                                    onDelete={() => handleDelete(syllabus.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Setup Official Syllabus">
                    <p className="text-muted mb-6" style={{ fontSize: '14px' }}>
                        Upload an REB Syllabus PDF (Teacher Guide) and AI will extract all Units and Lessons automatically.
                    </p>

                    <form onSubmit={handleSyllabusUpload} className="custom-form">
                        <div className="form-field">
                            <label className="field-label">Subject Selection</label>
                            <select
                                className="form-input"
                                value={isManualSubject ? 'manual' : formData.subject_name}
                                onChange={(e) => {
                                    if (e.target.value === 'manual') {
                                        setIsManualSubject(true);
                                        setFormData({ ...formData, subject_name: '' });
                                    } else {
                                        setIsManualSubject(false);
                                        setFormData({ ...formData, subject_name: e.target.value });
                                    }
                                }}
                                required
                            >
                                <option value="">Select a registered subject...</option>
                                {allSubjects.map(s => (
                                    <option key={s.id} value={s.name}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                                ))}
                                <option value="manual" style={{ fontWeight: 800, color: 'var(--c-brand)' }}>+ Enter name manually</option>
                            </select>
                        </div>

                        {isManualSubject && (
                            <div className="form-field animate-slide-up">
                                <label className="field-label">Manual Subject Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter subject name..."
                                    value={formData.subject_name}
                                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                        )}
                        <div className="form-field">
                            <label className="field-label">Curriculum Level (Scope)</label>
                            <select
                                className="form-input"
                                value={formData.grade_level}
                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                required
                            >
                                <option value="">Select Level</option>
                                <option value="Primary">Primary School</option>
                                <option value="O-Level">O-Level (S1-S3)</option>
                                <option value="A-Level">A-Level (S4-S6)</option>
                                <option value="TVET">TVET</option>
                                <option value="General">Other / General</option>
                            </select>
                        </div>

                        <div className="modal-upload-section">
                            <label className="field-label">Option A: Upload Teacher Guide PDF</label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="file-input"
                                id="pdf-upload"
                            />
                            <label htmlFor="pdf-upload" className="file-input-label">
                                <div className="file-input-content">
                                    <FiFileText size={24} />
                                    <p className="file-input-text">Click to upload PDF or drag and drop</p>
                                    <p className="file-input-hint">Recommended for best accuracy. AI handles the sorting.</p>
                                </div>
                            </label>
                            {file && <p className="file-selected">✓ {file.name}</p>}
                        </div>

                        <div className="modal-divider">
                            <span>OR</span>
                        </div>

                        <div className="form-field">
                            <label className="field-label">Option B: Paste Syllabus Text</label>
                            <textarea
                                className="form-input"
                                rows="5"
                                placeholder="If you don't have a PDF, paste the units and lesson titles here."
                                value={formData.content_text}
                                onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                                disabled={!!file}
                            ></textarea>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary flex-1" disabled={processing}>
                                {processing ? 'Processing...' : 'Save & Extract Content'}
                            </button>
                            <button type="button" className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// ─── Syllabus Card Component ─────────────────────────────────────
function SyllabusCard({ syllabus, onManageStructure, onDelete }) {
    const [isHovering, setIsHovering] = useState(false);

    const getLevelColor = (level) => {
        const colors = {
            'Primary': '#10b981',
            'O-Level': '#3b82f6',
            'A-Level': '#8b5cf6',
            'TVET': '#f59e0b',
            'General': '#6b7280'
        };
        return colors[level] || '#6b7280';
    };

    return (
        <div
            className="syllabus-card"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Card Header */}
            <div className="syllabus-card-header">
                <div className="syllabus-icon-wrapper">
                    <FiBookOpen size={24} />
                </div>
                <div className="syllabus-card-actions">
                    <button 
                        className="card-action-btn"
                        onClick={onManageStructure}
                        title="Manage Units"
                        aria-label="Manage Units"
                    >
                        <FiCode size={18} />
                    </button>
                    <button 
                        className="card-action-btn card-action-delete"
                        onClick={onDelete}
                        title="Delete Syllabus"
                        aria-label="Delete Syllabus"
                    >
                        <FiTrash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Card Body */}
            <div className="syllabus-card-body">
                <h3 className="syllabus-card-title">{syllabus.subject_name}</h3>
                
                <div className="syllabus-level-badge" style={{ '--badge-color': getLevelColor(syllabus.grade_level) }}>
                    {syllabus.grade_level || 'General Level'}
                </div>

                {/* Status Badge */}
                <div className="syllabus-status-wrapper">
                    <div className={`status-badge ${syllabus.structured_data ? 'structured' : 'raw'}`}>
                        {syllabus.structured_data ? (
                            <>
                                <span className="status-dot"></span>
                                <FiCode size={14} />
                                <span>AI Structured</span>
                            </>
                        ) : (
                            <>
                                <span className="status-dot"></span>
                                <FiFileText size={14} />
                                <span>Raw Text</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="syllabus-card-footer">
                    <p className="sync-date">
                        Last updated: {new Date(syllabus.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Skeleton Syllabus Card Component ────────────────────────────
function SkeletonSyllabusCard() {
    return (
        <div className="syllabus-card skeleton-card">
            <div className="syllabus-card-header">
                <SkeletonBox width={40} height={40} radius={12} />
                <div className="syllabus-card-actions">
                    <SkeletonBox width={36} height={36} radius={8} />
                    <SkeletonBox width={36} height={36} radius={8} />
                </div>
            </div>
            <div className="syllabus-card-body">
                <SkeletonBox width="100%" height={20} radius={6} style={{ marginBottom: '12px' }} />
                <SkeletonBox width="60%" height={24} radius={6} style={{ marginBottom: '16px' }} />
                <SkeletonBox width="70%" height={16} radius={4} style={{ marginBottom: '20px' }} />
                <SkeletonBox width="100%" height={12} radius={4} />
            </div>
        </div>
    );
}

export default SyllabusPage;
