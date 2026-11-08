import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FiLock, FiCheckCircle, FiShield, FiKey, FiArrowLeft, FiSave } from 'react-icons/fi';
import { Volume2, VolumeX } from 'lucide-react';
import './AuthPages.css';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    // Screen Reader Synchronization State
    const [isScreenReaderActive, setIsScreenReaderActive] = useState(() => {
        return localStorage.getItem('screenReaderActive') === 'true';
    });

    useEffect(() => {
        const syncState = () => {
            setIsScreenReaderActive(localStorage.getItem('screenReaderActive') === 'true');
        };
        window.addEventListener('screenReaderToggle', syncState);
        window.addEventListener('storage', syncState);
        return () => {
            window.removeEventListener('screenReaderToggle', syncState);
            window.removeEventListener('storage', syncState);
        };
    }, []);

    const toggleScreenReader = () => {
        const nextState = !isScreenReaderActive;
        setIsScreenReaderActive(nextState);
        localStorage.setItem('screenReaderActive', String(nextState));
        window.dispatchEvent(new Event('screenReaderToggle'));
        if (!nextState) {
            window.speechSynthesis.cancel();
            document.querySelectorAll('.screen-reader-highlight').forEach(el => {
                el.classList.remove('screen-reader-highlight');
            });
        }
    };

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return toast.error('Passwords do not match');
        }

        if (formData.password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                password: formData.password
            });

            if (response.data.success) {
                toast.success('Password updated! Please login.');
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Token invalid or expired');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, name: 'Identity', active: false, completed: true },
        { id: 2, name: 'Verification', active: false, completed: true },
        { id: 3, name: 'Reset', active: true, completed: false }
    ];

    if (!token) {
        return (
            <div className="auth-vibrant-layout">
                <div className="vibrant-orb orb-1"></div>
                <div className="vibrant-orb orb-2"></div>
                
                <div className="auth-centered-card" style={{ textAlign: 'center', padding: 'var(--sp-12)' }}>
                    <div className="vibrant-error-icon" style={{ marginBottom: 'var(--sp-6)' }}>
                        <FiShield />
                    </div>
                    <h2 className="auth-title-large">Invalid Link</h2>
                    <p className="auth-subtitle-soft" style={{ marginBottom: 'var(--sp-8)' }}>
                        This security link is missing its token or has already been used.
                    </p>
                    <Link to="/forgot-password" className="vibrant-submit-btn" style={{ textDecoration: 'none' }}>
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-vibrant-layout animate-fadeIn">
            <div className="auth-centered-card">
                <div className="card-header-logo">
                    <img src="/images/reallogo.png" alt="Logo" />
                    <span>21st Century Lesson Plan</span>
                </div>

                {/* Progress Stepper - Matching Payment Process */}
                <div className="premium-stepper">
                    {steps.map((step, idx) => (
                        <div 
                            key={step.id} 
                            className={`p-step ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                            style={{ flex: idx < steps.length - 1 ? 1 : 'none' }}
                        >
                            <div className="p-step-circle">
                                {step.completed ? <FiCheckCircle size={14} /> : step.id}
                            </div>
                            <span className="p-step-label">{step.name}</span>
                            {idx < steps.length - 1 && <div className="p-step-line"></div>}
                        </div>
                    ))}
                </div>

                <div className="auth-form-body">
                    <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
                        <h2 className="auth-title-large">New Password</h2>
                        <p className="auth-subtitle-soft">
                            Create a strong, secure password for your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="vibrant-form">
                        <div className="vibrant-field">
                            <label>New Password</label>
                            <div className="vibrant-input-group">
                                <FiKey className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Min. 6 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="vibrant-field">
                            <label>Confirm Password</label>
                            <div className="vibrant-input-group">
                                <FiLock className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Repeat password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="vibrant-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="vibrant-spinner"></div>
                            ) : (
                                <>
                                    <span>Update Password</span>
                                    <FiSave />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Link to="/login" className="vibrant-back-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiArrowLeft />
                            <span>Back to Sign In</span>
                        </Link>
                        <button 
                            type="button"
                            onClick={toggleScreenReader}
                            className={`nav-accessibility-toggle ${isScreenReaderActive ? 'active' : ''}`}
                            aria-label="Toggle Screen Reader"
                            title="Toggle Screen Reader (Hover text to read)"
                        >
                            {isScreenReaderActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
