import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FiMail, FiArrowRight, FiArrowLeft, FiCheckCircle, FiLock, FiClock, FiSend } from 'react-icons/fi';
import { Volume2, VolumeX } from 'lucide-react';
import './AuthPages.css';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/forgot-password', { email });
            if (response.data.success) {
                toast.success('Reset link sent to your email!');
                setSent(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, name: 'Identity', active: !sent, completed: sent },
        { id: 2, name: 'Verification', active: sent, completed: false },
        { id: 3, name: 'Reset', active: false, completed: false }
    ];

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
                        <h2 className="auth-title-large">{sent ? 'Check Your Email' : 'Forgot Password?'}</h2>
                        <p className="auth-subtitle-soft">
                            {sent 
                                ? `We've sent a secure link to ${email}.` 
                                : 'Enter your email and we\'ll send you a secure link to reset your password.'}
                        </p>
                    </div>

                    {!sent ? (
                        <form onSubmit={handleSubmit} className="vibrant-form">
                            <div className="vibrant-field">
                                <label>Email Address</label>
                                <div className="vibrant-input-group">
                                    <FiMail className="input-icon" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                        <span>Send Recovery Link</span>
                                        <FiSend />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="vibrant-success-state animate-slideUp">
                            <div className="vibrant-info-box">
                                <FiClock className="vibrant-info-icon" />
                                <div className="vibrant-info-text">
                                    <strong>Link expires in 5 minutes</strong>
                                    <p>Please check your inbox (and spam) and act quickly.</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => setSent(false)}
                                className="vibrant-secondary-btn"
                            >
                                Try a different email
                            </button>
                        </div>
                    )}

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

export default ForgotPasswordPage;
