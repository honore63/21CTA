import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { API_BASE_URL } from '../services/api';
import './AuthPages.css';

const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fingerprint, setFingerprint] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

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

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error(decodeURIComponent(error));
            // Clean up the URL
            navigate('/login', { replace: true });
        }

        const setFp = async () => {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            setFingerprint(result.visitorId);
        };
        setFp();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login({
                identifier: formData.email,
                password: formData.password
            });
            toast.success('Welcome back!');
            const redirectTo = searchParams.get('redirectTo');
            const planId = searchParams.get('plan');
            if (redirectTo) {
                navigate(planId ? `${redirectTo}?plan=${planId}` : redirectTo);
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-vibrant-layout">
            <div className="auth-centered-card auth-split-card" style={{ maxWidth: 900 }}>

                {/* Brand Side - professional teal */}
                <div className="auth-split-brand">
                    <div>
                        <img src="/images/reallogo.png" alt="Logo" style={{ width: 45, height: 45, marginBottom: 'var(--sp-6)', objectFit: 'contain' }} />
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-.04em', marginBottom: 'var(--sp-4)' }}>Welcome back.</h2>
                        <p style={{ fontSize: '.95rem', color: '#e8f4f1', lineHeight: 1.6 }}>Access your dashboard and start creating professional REB-compliant plans today.</p>
                    </div>

                    <div style={{ padding: 'var(--sp-5)', borderRadius: 'var(--r-lg)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p style={{ fontSize: '.85rem', fontStyle: 'italic', opacity: 0.9 }}>"This platform saved me over 15 hours last month. A true revolution for teachers."</p>
                        <p style={{ fontSize: '.75rem', fontWeight: 700, marginTop: 12, color: '#fff' }}>— Roger H.</p>
                    </div>
                </div>

                {/* Form Side */}
                <div className="auth-split-form">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-8)' }}>
                        <Link to="/" className="vibrant-back-link" style={{ paddingLeft: 0 }}>
                            <ArrowLeft size={18} /> Back to home
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

                    <div style={{ marginBottom: 'var(--sp-10)' }}>
                        <h1 className="auth-title-large">Sign In</h1>
                        <p className="auth-subtitle-soft">Enter your credentials to access your account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="vibrant-form">
                        <div className="vibrant-field">
                            <label>Email Address</label>
                            <div className="vibrant-input-group">
                                <Mail className="input-icon" />
                                <input type="email" name="email" placeholder="name@email.com" value={formData.email} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="vibrant-field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>Password</label>
                                <Link to="/forgot-password" style={{ fontSize: '.8rem', color: 'var(--c-brand)', fontWeight: 600, textDecoration: 'none' }}>Forgot?</Link>
                            </div>
                            <div className="vibrant-input-group">
                                <Lock className="input-icon" />
                                <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 'var(--sp-4)', background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="vibrant-submit-btn" disabled={loading} style={{ marginTop: 'var(--sp-2)' }}>
                            {loading ? <div className="vibrant-spinner"></div> : <>Sign In Now <ArrowRight size={20} /></>}
                        </button>
                    </form>

                    <div style={{ marginTop: 'var(--sp-10)', textAlign: 'center' }}>
                        <p style={{ fontSize: '.85rem', color: 'var(--c-text-secondary)' }}>
                            New here? <Link to="/register" style={{ color: 'var(--c-brand)', fontWeight: 700, textDecoration: 'none' }}>Create an Account</Link>
                        </p>
                    </div>

                    <div style={{ marginTop: 'var(--sp-8)', paddingTop: 'var(--sp-8)', borderTop: '1px solid var(--c-border-soft)' }}>
                        <button type="button" className="vibrant-secondary-btn" onClick={() => window.location.href = `${API_BASE_URL}/auth/google?action=login&fingerprint=${fingerprint}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <FcGoogle size={18} /> Continue with Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
