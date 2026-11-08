import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPhone, FiCheckCircle, FiLock, FiX, FiSmartphone } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';

const PhoneUpdateModal = () => {
    const { user, updateProfile } = useAuth();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // Only show if user is logged in, hasn't dismissed it, and doesn't have a phone number
    if (!user || user.phone_number || isDismissed) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!phone || phone.length < 8) {
            toast.error('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        try {
            const response = await api.put('/auth/profile', { phone_number: phone });
            if (response.data.success) {
                updateProfile(response.data.data);
                toast.success('Profile updated successfully!');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update phone number');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="phone-modal-overlay">
            <style>{`
                .phone-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    padding: 20px;
                }
                .phone-modal-content {
                    background: white;
                    width: 100%;
                    max-width: 440px;
                    border-radius: 32px;
                    padding: 40px;
                    position: relative;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    animation: phoneModalFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes phoneModalFadeUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .phone-modal-close {
                    position: absolute;
                    top: 24px;
                    right: 24px;
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    background: #f1f5f9;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .phone-modal-close:hover {
                    background: #fee2e2;
                    color: #ef4444;
                }
                .phone-modal-header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .phone-icon-badge {
                    width: 64px;
                    height: 64px;
                    background: var(--c-brand-light);
                    color: var(--c-brand);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    box-shadow: 0 10px 25px rgba(26, 107, 90, 0.15);
                }
                .phone-modal-header h2 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 12px;
                    letter-spacing: -0.02em;
                }
                .phone-modal-header p {
                    color: #64748b;
                    font-size: 0.95rem;
                    line-height: 1.6;
                }
                .phone-modal-form {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .phone-input-group {
                    position: relative;
                }
                .phone-input-label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 8px;
                    margin-left: 4px;
                }
                .phone-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .phone-input-icon {
                    position: absolute;
                    left: 18px;
                    color: #94a3b8;
                    transition: all 0.3s;
                }
                .phone-field-input {
                    width: 100%;
                    padding: 16px 16px 16px 50px;
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #0f172a;
                    transition: all 0.3s;
                    outline: none;
                    -webkit-appearance: none;
                }
                .phone-field-input:focus {
                    border-color: var(--c-brand);
                    background: white;
                    box-shadow: 0 0 0 4px var(--c-brand-light);
                }
                .phone-field-input:focus + .phone-input-icon {
                    color: var(--c-brand);
                }
                .phone-security-note {
                    display: flex;
                    gap: 12px;
                    background: #f0fdf4;
                    padding: 16px;
                    border-radius: 16px;
                    border: 1px solid #dcfce7;
                }
                .phone-security-note svg {
                    color: #22c55e;
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .phone-security-note span {
                    font-size: 0.8rem;
                    color: #166534;
                    line-height: 1.4;
                    font-weight: 500;
                }
                .phone-submit-btn {
                    width: 100%;
                    padding: 16px;
                    background: var(--c-brand);
                    color: white;
                    border: none;
                    border-radius: 16px;
                    font-size: 1rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 10px 20px rgba(26, 107, 90, 0.2);
                }
                .phone-submit-btn:hover {
                    background: var(--c-brand-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px rgba(26, 107, 90, 0.3);
                }
                .phone-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
                @media (max-width: 480px) {
                    .phone-modal-content {
                        padding: 30px 20px;
                        border-radius: 24px;
                    }
                    .phone-modal-header h2 { font-size: 1.5rem; }
                    .phone-field-input { padding: 14px 14px 14px 44px; font-size: 1rem; }
                }
            `}</style>
            
            <div className="phone-modal-content">
                <button 
                    className="phone-modal-close" 
                    onClick={() => setIsDismissed(true)}
                    aria-label="Dismiss"
                >
                    <FiX size={20} />
                </button>
                
                <div className="phone-modal-header">
                    <div className="phone-icon-badge">
                        <FiSmartphone size={32} />
                    </div>
                    <h2>Secure Your Account</h2>
                    <p>To keep your teaching workspace safe, please verify your mobile number. This will also enable easy login recovery.</p>
                </div>

                <form onSubmit={handleSubmit} className="phone-modal-form">
                    <div className="phone-input-group">
                        <label className="phone-input-label">Mobile Number</label>
                        <div className="phone-input-wrapper">
                            <FiPhone className="phone-input-icon" size={20} />
                            <input
                                type="tel"
                                className="phone-field-input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="e.g. 078XXXXXXX"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="phone-security-note">
                        <FiLock size={18} />
                        <span>This number is strictly for account security and will never be shared with third parties.</span>
                    </div>

                    <button 
                        type="submit" 
                        className="phone-submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <span>Updating...</span>
                        ) : (
                            <>
                                <span>Complete Verification</span>
                                <FiCheckCircle size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PhoneUpdateModal;
