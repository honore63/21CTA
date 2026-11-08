import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === 'undefined') return null;

    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '24px',
    };

    const contentStyle = {
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        width: '100%',
        maxWidth: '720px',
        minWidth: '320px',
        borderRadius: '32px',
        padding: '0',
        boxShadow: '0 40px 90px rgba(15, 23, 42, 0.22)',
        maxHeight: '88vh',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        display: 'flex',
        flexDirection: 'column',
    };

    const topAccentStyle = {
        height: '12px',
        background: 'linear-gradient(90deg, #1a6b5a 0%, #134d41 55%, #d97706 100%)',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 32px 18px',
        borderBottom: '1px solid rgba(22, 163, 74, 0.14)',
        background: 'rgba(255,255,255,0.95)',
        gap: '16px',
    };

    const titleStyle = {
        margin: 0,
        fontSize: '1.9rem',
        letterSpacing: '-0.03em',
        color: '#0f172a',
    };

    const closeButtonStyle = {
        width: '46px',
        height: '46px',
        borderRadius: '16px',
        background: 'rgba(26, 107, 90, 0.08)',
        border: '1px solid rgba(26, 107, 90, 0.18)',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    const bodyStyle = {
        padding: '34px 36px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: 'rgba(255, 255, 255, 0.96)',
        overflowY: 'auto',
        flex: 1,
    };

    const modalContent = (
        <div style={overlayStyle} onClick={onClose}>
            <div style={contentStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={topAccentStyle} />
                <div style={headerStyle}>
                    <h2 style={titleStyle}>{title}</h2>
                    <button onClick={onClose} style={closeButtonStyle} aria-label="Close modal">
                        <FiX size={20} />
                    </button>
                </div>
                <div style={bodyStyle}>
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
