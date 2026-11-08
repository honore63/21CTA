import React, { useState } from 'react';
import { Eye, Download, Sparkles, X, ExternalLink } from 'lucide-react';

export default function ImageWidget({ url, caption, badge = 'AI VISUAL AID' }) {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    if (!url) return null;

    const handleDownload = async (e) => {
        e.stopPropagation();
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `visual_aid_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            window.open(url, '_blank');
        }
    };

    return (
        <>
            <div 
                className="ai-image-widget-card"
                onClick={() => !hasError && setIsLightboxOpen(true)}
                style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--ai-border, rgba(255, 255, 255, 0.12))',
                    background: 'var(--ai-card-bg, rgba(255, 255, 255, 0.04))',
                    margin: '12px 0',
                    cursor: hasError ? 'default' : 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                }}
            >
                <div style={{ position: 'relative', width: '100%', height: '180px', background: '#1e293b' }}>
                    {!loaded && !hasError && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '12px',
                            gap: '8px'
                        }}>
                            <Sparkles size={16} className="animate-spin" /> Generating visual aid...
                        </div>
                    )}

                    {hasError ? (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444',
                            fontSize: '12px',
                            padding: '16px',
                            textAlign: 'center'
                        }}>
                            Failed to load image. Click to open external link.
                        </div>
                    ) : (
                        <img
                            src={url}
                            alt={caption || 'AI Visual Aid'}
                            onLoad={() => setLoaded(true)}
                            onError={() => setHasError(true)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: loaded ? 1 : 0,
                                transition: 'opacity 0.3s ease'
                            }}
                        />
                    )}

                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#60a5fa',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <Sparkles size={11} /> {badge}
                    </div>

                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        display: 'flex',
                        gap: '6px'
                    }}>
                        <button
                            onClick={handleDownload}
                            title="Download Image"
                            style={{
                                background: 'rgba(15, 23, 42, 0.75)',
                                border: 'none',
                                color: '#f8fafc',
                                borderRadius: '6px',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={13} />
                        </button>
                    </div>
                </div>

                {caption && (
                    <div style={{
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: 'var(--ai-text-secondary, #94a3b8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {caption}
                        </span>
                        <span style={{ fontSize: '11px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                            <Eye size={12} /> View
                        </span>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {isLightboxOpen && (
                <div 
                    onClick={() => setIsLightboxOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-44px',
                            right: '0',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <button
                                onClick={handleDownload}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px'
                                }}
                            >
                                <Download size={15} /> Download
                            </button>
                            <button
                                onClick={() => setIsLightboxOpen(false)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: 'none',
                                    color: '#fff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <img 
                            src={url} 
                            alt={caption || 'AI Visual Aid'} 
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                borderRadius: '12px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                objectFit: 'contain'
                            }}
                        />

                        {caption && (
                            <p style={{
                                marginTop: '12px',
                                color: '#e2e8f0',
                                fontSize: '14px',
                                textAlign: 'center',
                                maxWidth: '700px'
                            }}>
                                {caption}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
