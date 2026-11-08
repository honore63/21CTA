import React, { useState, useEffect } from 'react';
import { Info, X, Heart, Award, Star } from 'lucide-react';

const PostMaintenanceModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Define the expiration time (11:59 AM today, May 13, 2026)
        const expirationTime = new Date('2026-05-13T11:59:00+02:00').getTime();
        const currentTime = new Date().getTime();

        // Check if user has already seen it
        const hasSeen = localStorage.getItem('has_seen_appreciation_medal');

        if (!hasSeen && currentTime < expirationTime) {
            setIsOpen(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem('has_seen_appreciation_medal', 'true');
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--sp-4)',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div style={{
                background: 'var(--c-bg)',
                borderRadius: 'var(--r-2xl)',
                width: '100%',
                maxWidth: '500px',
                padding: 'var(--sp-10)',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                textAlign: 'center',
                overflow: 'hidden',
                animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Decorative Elements */}
                <div style={{ position: 'absolute', top: -20, left: -20, opacity: 0.1 }}><Star size={100} /></div>
                <div style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.1 }}><Star size={100} /></div>

                <button 
                    onClick={handleDismiss}
                    style={{
                        position: 'absolute',
                        top: 'var(--sp-4)',
                        right: 'var(--sp-4)',
                        background: 'rgba(0,0,0,0.05)',
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--c-text-muted)',
                        transition: 'all var(--t-fast)',
                        zIndex: 10
                    }}
                >
                    <X size={24} />
                </button>

                <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto var(--sp-6)',
                    boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)',
                    animation: 'bounce 2s infinite'
                }}>
                    <Award size={40} />
                </div>

                <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 900, 
                    color: 'var(--c-text-primary)',
                    marginBottom: 'var(--sp-4)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1
                }}>
                    A Huge Thank You!
                </h2>
                
                <p style={{ 
                    fontSize: '1.125rem', 
                    color: 'var(--c-text-secondary)', 
                    lineHeight: 1.6,
                    marginBottom: 'var(--sp-8)',
                    fontWeight: 500
                }}>
                    We are back online! Thank you so much for your incredible patience while we worked on making the platform better for you. 
                    <br /><br />
                    We truly appreciate having you as part of our <strong>Digital Lesson Plan Family</strong>. Your support means the world to us!
                </p>

                <button 
                    onClick={handleDismiss}
                    className="vibrant-submit-btn"
                    style={{ 
                        width: '100%', 
                        padding: '18px', 
                        fontSize: '1.1rem', 
                        fontWeight: 700,
                        backgroundColor: 'var(--c-brand)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--r-lg)',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(26, 107, 90, 0.4)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-brand-dark)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-brand)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    Welcome Back Home
                </button>
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
};

export default PostMaintenanceModal;
