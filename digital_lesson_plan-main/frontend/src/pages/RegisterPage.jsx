import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Lock, User, Phone, Home, ArrowRight, 
  ArrowLeft, Eye, EyeOff, CheckCircle, Volume2, VolumeX 
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import './AuthPages.css';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone_number: '',
        password: '', confirmPassword: '', school_name: '',
        role: 'teacher'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fingerprint, setFingerprint] = useState(null);
    const { register } = useAuth();
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
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const { confirmPassword, ...registerData } = formData;
            await register({ ...registerData, fingerprint });
            toast.success('Welcome aboard!');
            const redirectTo = searchParams.get('redirectTo');
            const planId = searchParams.get('plan');
            if (redirectTo) {
                navigate(planId ? `${redirectTo}?plan=${planId}` : redirectTo);
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-vibrant-layout">
            <div className="auth-centered-card auth-split-card" style={{ maxWidth: 960 }}>
                
                {/* Brand Side - professional teal */}
                <div className="auth-split-brand">
                    <div style={{ marginBottom: 'var(--sp-10)' }}>
                        <img src="/images/reallogo.png" alt="Logo" style={{ width: 50, height: 50, marginBottom: 'var(--sp-6)', objectFit: 'contain' }} />
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-.04em' }}>Join the Future of Teaching.</h2>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                        {[
                            'REB CBC Aligned Plans',
                            '5Es & 3Ps Pedagogy',
                            'Inclusive Learning Scripts',
                            'Export to PDF & Word'
                        ].map(t => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.9rem', fontWeight: 500 }}>
                                <CheckCircle size={16} style={{ color: '#4ade80' }} /> {t}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 'var(--sp-12)', paddingTop: 'var(--sp-8)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <p style={{ fontSize: '.8rem', opacity: 0.8 }}>Ready to save 10+ hours a week?</p>
                        <p style={{ fontSize: '.85rem', fontWeight: 700 }}>Start your professional trial.</p>
                    </div>
                </div>

                {/* Form Side */}
                <div className="auth-split-form">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
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

                    <div style={{ marginBottom: 'var(--sp-8)' }}>
                        <h1 className="auth-title-large">Create Account</h1>
                        <p className="auth-subtitle-soft">Fill in the details to set up your workspace.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="vibrant-form">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
                            <div className="vibrant-field">
                                <label>Full Name</label>
                                <div className="vibrant-input-group">
                                    <User className="input-icon" />
                                    <input name="full_name" placeholder="John Doe" value={formData.full_name} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="vibrant-field">
                                <label>Phone Number</label>
                                <div className="vibrant-input-group">
                                    <Phone className="input-icon" />
                                    <input name="phone_number" placeholder="078xxxxxxx" value={formData.phone_number} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
                            <div className="vibrant-field">
                                <label>Email Address</label>
                                <div className="vibrant-input-group">
                                    <Mail className="input-icon" />
                                    <input type="email" name="email" placeholder="teacher@school.rw" value={formData.email} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="vibrant-field">
                                <label>School / Institution</label>
                                <div className="vibrant-input-group">
                                    <Home className="input-icon" />
                                    <input name="school_name" placeholder="School Name" value={formData.school_name} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
                            <div className="vibrant-field">
                                <label>Password</label>
                                <div className="vibrant-input-group">
                                    <Lock className="input-icon" />
                                    <input type={showPassword ? "text" : "password"} name="password" placeholder="Min. 6 chars" value={formData.password} onChange={handleChange} required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 'var(--sp-4)', background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="vibrant-field">
                                <label>Confirm Password</label>
                                <div className="vibrant-input-group">
                                    <Lock className="input-icon" />
                                    <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Repeat" value={formData.confirmPassword} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="vibrant-submit-btn" disabled={loading} style={{ marginTop: 'var(--sp-4)' }}>
                            {loading ? <div className="vibrant-spinner"></div> : <>Create My Account <ArrowRight size={20} /></>}
                        </button>
                    </form>

                    <div style={{ marginTop: 'var(--sp-8)', textAlign: 'center' }}>
                        <p style={{ fontSize: '.85rem', color: 'var(--c-text-secondary)' }}>
                            Already have an account? <Link to="/login" style={{ color: 'var(--c-brand)', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
                        </p>
                    </div>

                    <div style={{ marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-6)', borderTop: '1px solid var(--c-border-soft)' }}>
                        <button type="button" className="vibrant-secondary-btn" onClick={() => window.location.href = `${API_BASE_URL}/auth/google?action=register&fingerprint=${fingerprint}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <FcGoogle size={18} /> Sign up with Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
