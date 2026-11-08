import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FiUpload, FiTrash2, FiFileText, FiBookOpen } from 'react-icons/fi';
import './Dashboard.css';
import './Pages.css';
import { SkeletonRow } from '../components/Skeleton';

const ReferenceMaterialsPage = () => {
    const [materials, setMaterials] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subject_id: '',
        description: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [materialsRes, subjectsRes] = await Promise.all([
                api.get('/reference-materials'),
                api.get('/subjects')
            ]);
            setMaterials(materialsRes.data.data);
            setSubjects(subjectsRes.data.data);
        } catch (error) {
            toast.error('Failed to load reference materials');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['.pdf', '.docx', '.txt'];
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

            if (!allowedTypes.includes(ext)) {
                toast.error('Only .pdf, .docx and .txt files are allowed');
                e.target.value = null;
                return;
            }

            if (file.size > 50 * 1024 * 1024) {
                toast.error('File size must be less than 50MB');
                e.target.value = null;
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('title', formData.title);
        if (formData.subject_id) uploadData.append('subject_id', formData.subject_id);
        uploadData.append('description', formData.description);

        try {
            await api.post('/reference-materials/upload', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Book uploaded and processed successfully');
            setShowModal(false);
            setFormData({ title: '', subject_id: '', description: '' });
            setSelectedFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            return;
        }
        setConfirmDeleteId(null);
        try {
            await api.delete(`/reference-materials/${id}`);
            toast.success('Book deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete book');
        }
    };

    const cancelDelete = () => setConfirmDeleteId(null);

    const getFileIcon = (fileType) => {
        if (fileType?.includes('pdf')) return <FiFileText className="text-danger" size={24} />;
        if (fileType?.includes('word') || fileType?.includes('document')) return <FiBookOpen className="text-primary" size={24} />;
        return <FiFileText size={24} />;
    };

    return (
        <div>
            <div className="dashboard-container">
                <div className="section-header">
                    <div>
                        <h1>AI Reference Books</h1>
                        <p>Upload books and documents that the AI will use to build your lesson plans</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <FiUpload /> Upload New Book
                    </button>
                </div>

                {loading ? (
                    <div className="materials-list">
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                ) : materials.length > 0 ? (
                    <div className="materials-list">
                        {materials.map((material) => (
                            <div key={material.id} className="card material-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
                                <div className="material-icon-box" style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                                    {getFileIcon(material.file_type)}
                                </div>
                                <div className="material-info" style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 5px 0' }}>
                                        {material.file_url ? (
                                            <a href={material.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                                {material.title}
                                            </a>
                                        ) : material.title}
                                    </h3>
                                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                                        {subjects.find(s => s.id === material.subject_id)?.name || 'General Reference'}
                                    </p>
                                    {material.description && (
                                        <p className="text-secondary" style={{ fontSize: '0.85rem' }}>{material.description}</p>
                                    )}
                                    <div className="material-meta" style={{ marginTop: '10px', fontSize: '0.8rem', opacity: 0.7 }}>
                                        <span>Added on {new Date(material.created_at).toLocaleDateString()}</span>
                                        <span style={{ margin: '0 8px' }}>•</span>
                                        <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>AI Ready</span>
                                        {material.extracted_text && (
                                            <><span style={{ margin: '0 8px' }}>•</span>
                                            <span style={{ color: '#22c55e' }}>Text Extracted ✓</span></>
                                        )}
                                    </div>
                                </div>
                                <div className="material-actions" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                    {confirmDeleteId === material.id ? (
                                        <>
                                            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Delete?</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => handleDelete(material.id)} className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', padding: '4px 10px', fontSize: '0.75rem' }}>Yes</button>
                                                <button onClick={cancelDelete} className="btn btn-sm btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>No</button>
                                            </div>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(material.id)}
                                            className="btn-icon btn-danger"
                                            title="Delete"
                                            aria-label="Delete book"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiBookOpen size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3>No reference books yet</h3>
                        <p>Upload textbooks or guides to help the AI generate more accurate content.</p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginTop: '20px' }}>
                            <FiUpload /> Upload your first book
                        </button>
                    </div>
                )}

                {/* Upload Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h2>Upload Reference Material</h2>
                                <button onClick={() => setShowModal(false)} className="modal-close">×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Book Title *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Biology Secondary 5 Textbook"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Associated Subject (Optional)</label>
                                    <select
                                        className="form-select"
                                        value={formData.subject_id}
                                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                    >
                                        <option value="">General / All Subjects</option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description (Optional)</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="What is this book about?"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="2"
                                    />
                                </div>

                                <div className="form-group" style={{ border: '2px dashed #e2e8f0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '10px' }}>Select File (.pdf, .docx, .txt)</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        onChange={handleFileChange}
                                        accept=".pdf,.docx,.txt"
                                        required
                                    />
                                    {selectedFile && (
                                        <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={uploading}>
                                        {uploading ? 'Processing...' : 'Upload & Process'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferenceMaterialsPage;
