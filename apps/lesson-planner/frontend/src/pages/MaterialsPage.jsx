import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FiUpload, FiDownload, FiTrash2, FiFile } from 'react-icons/fi';
import './Dashboard.css';
import './Pages.css';

const MaterialsPage = () => {
    const [materials, setMaterials] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subject_id: '',
        material_type: 'teacher_guide',
        description: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [materialsRes, subjectsRes] = await Promise.all([
                api.get('/materials'),
                api.get('/subjects')
            ]);
            setMaterials(materialsRes.data.data);
            setSubjects(subjectsRes.data.data);
        } catch (error) {
            toast.error('Failed to load materials');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                toast.error('File size must be less than 50MB');
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
        uploadData.append('subject_id', formData.subject_id);
        uploadData.append('material_type', formData.material_type);
        uploadData.append('description', formData.description);

        try {
            await api.post('/materials/upload', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Material uploaded successfully');
            setShowModal(false);
            setFormData({ title: '', subject_id: '', material_type: 'teacher_guide', description: '' });
            setSelectedFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (id, filename) => {
        try {
            const response = await api.get(`/materials/${id}/download`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this material?')) return;

        try {
            await api.delete(`/materials/${id}`);
            toast.success('Material deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete material');
        }
    };

    const getFileIcon = (fileType) => {
        if (fileType?.includes('pdf')) return '📄';
        if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
        if (fileType?.includes('image')) return '🖼️';
        if (fileType?.includes('presentation')) return '📊';
        return '📁';
    };

    return (
        <div>
            <div className="dashboard-container">
                <div className="section-header">
                    <div>
                        <h1>Teaching Materials</h1>
                        <p>Upload and manage teaching resources and references</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <FiUpload /> Upload Material
                    </button>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
                    </div>
                ) : materials.length > 0 ? (
                    <div className="materials-list">
                        {materials.map((material) => (
                            <div key={material.id} className="card material-card">
                                <div className="material-icon">
                                    {getFileIcon(material.file_type)}
                                </div>
                                <div className="material-info">
                                    <h3>{material.title}</h3>
                                    <p className="text-secondary">{material.subject_name}</p>
                                    {material.description && (
                                        <p className="material-description">{material.description}</p>
                                    )}
                                    <div className="material-meta">
                                        <span>{material.material_type.replace('_', ' ')}</span>
                                        <span>•</span>
                                        <span>{new Date(material.uploaded_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="material-actions">
                                    <button
                                        onClick={() => handleDownload(material.id, material.title)}
                                        className="btn btn-outline btn-sm"
                                    >
                                        <FiDownload /> Download
                                    </button>
                                    <button
                                        onClick={() => handleDelete(material.id)}
                                        className="btn-icon btn-danger"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiFile size={64} />
                        <h3>No materials uploaded</h3>
                        <p>Upload teaching guides, references, and other materials</p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary">
                            <FiUpload /> Upload Material
                        </button>
                    </div>
                )}

                {/* Upload Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Upload Teaching Material</h2>
                                <button onClick={() => setShowModal(false)} className="modal-close">×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Mathematics Teacher Guide S5"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Subject *</label>
                                        <select
                                            className="form-select"
                                            value={formData.subject_id}
                                            onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select subject...</option>
                                            {subjects.map((subject) => (
                                                <option key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Material Type *</label>
                                        <select
                                            className="form-select"
                                            value={formData.material_type}
                                            onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                                            required
                                        >
                                            <option value="teacher_guide">Teacher Guide</option>
                                            <option value="student_book">Student Book</option>
                                            <option value="worksheet">Worksheet</option>
                                            <option value="reference">Reference Material</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Brief description of the material..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">File * (Max 50MB)</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                                        required
                                    />
                                    {selectedFile && (
                                        <p className="text-secondary mt-1">
                                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </p>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={uploading}>
                                        {uploading ? (
                                            <>
                                                <div className="spinner"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <FiUpload /> Upload Material
                                            </>
                                        )}
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

export default MaterialsPage;
