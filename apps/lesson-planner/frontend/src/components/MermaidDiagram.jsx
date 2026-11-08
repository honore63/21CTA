import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Eye, Download, Copy, Check, Sparkles, RefreshCw, ZoomIn } from 'lucide-react';

let mermaidInitialized = false;

function initMermaid(theme = 'default') {
    try {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'Inter, system-ui, sans-serif',
            themeVariables: {
                fontFamily: 'Inter, system-ui, sans-serif',
                primaryColor: '#3b82f6',
                primaryTextColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                primaryBorderColor: '#60a5fa',
                lineColor: theme === 'dark' ? '#94a3b8' : '#64748b',
                secondaryColor: '#10b981',
                tertiaryColor: '#f59e0b'
            }
        });
        mermaidInitialized = true;
    } catch (e) {
        console.warn('Mermaid init warning:', e);
    }
}

export default function MermaidDiagram({ 
    code, 
    title, 
    description, 
    onGenerateImage,
    allowCopy = true,
    allowDownload = true 
}) {
    const containerRef = useRef(null);
    const [svgContent, setSvgContent] = useState('');
    const [renderError, setRenderError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    // Clean and normalize mermaid syntax
    const cleanCode = (raw) => {
        if (!raw) return '';
        let cleaned = raw.trim();
        // Remove markdown backticks if wrapped
        cleaned = cleaned.replace(/^```(?:mermaid)?/i, '').replace(/```$/i, '').trim();
        
        // Ensure starting directive
        const hasDirective = /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|mindmap|gantt|gitGraph|journey|pie|timeline|subgraph)/i.test(cleaned);
        if (!hasDirective) {
            cleaned = `flowchart TD\n${cleaned}`;
        }
        return cleaned;
    };

    useEffect(() => {
        const isDark = document.body.getAttribute('data-theme') === 'dark' ||
                       window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
        initMermaid(isDark ? 'dark' : 'default');

        const rawCode = cleanCode(code);
        if (!rawCode) {
            setSvgContent('');
            return;
        }

        const id = `mermaid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        mermaid.render(id, rawCode)
            .then(({ svg }) => {
                setSvgContent(svg);
                setRenderError(null);
            })
            .catch((err) => {
                console.warn('Mermaid rendering syntax error, trying fallback:', err);
                // Attempt simple TD flowchart fallback
                const fallbackCode = `flowchart TD\n` + rawCode.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('flowchart') && !line.startsWith('graph'))
                    .join('\n');
                
                const fallbackId = `mermaid_fb_${Date.now()}`;
                mermaid.render(fallbackId, fallbackCode)
                    .then(({ svg }) => {
                        setSvgContent(svg);
                        setRenderError(null);
                    })
                    .catch(() => {
                        setRenderError('Could not render diagram syntax');
                    });
            });
    }, [code]);

    const handleCopy = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadSvg = () => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || 'lesson_concept_diagram').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!code && !svgContent) return null;

    return (
        <div 
            className="mermaid-diagram-card"
            style={{
                background: 'var(--ai-card-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--ai-border, rgba(255, 255, 255, 0.1))',
                borderRadius: '12px',
                padding: '16px',
                margin: '12px 0',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Vector Diagram
                    </span>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-primary, #f8fafc)' }}>
                        {title || 'Concept & Process Flowchart'}
                    </h4>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    {allowCopy && (
                        <button
                            onClick={handleCopy}
                            title="Copy Mermaid Code"
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: 'var(--text-secondary, #94a3b8)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {copied ? 'Copied' : 'Code'}
                        </button>
                    )}

                    {allowDownload && svgContent && (
                        <button
                            onClick={handleDownloadSvg}
                            title="Download SVG Diagram"
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: 'var(--text-secondary, #94a3b8)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Download size={12} /> SVG
                        </button>
                    )}

                    {svgContent && (
                        <button
                            onClick={() => setIsLightboxOpen(true)}
                            title="View Fullscreen"
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: 'var(--text-secondary, #94a3b8)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <ZoomIn size={12} /> Fullscreen
                        </button>
                    )}

                    {onGenerateImage && (
                        <button
                            onClick={onGenerateImage}
                            title="Generate AI Illustration"
                            style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: '#a78bfa',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Sparkles size={12} /> Image Aid
                        </button>
                    )}
                </div>
            </div>

            {/* Diagram Container */}
            <div 
                ref={containerRef}
                style={{
                    overflowX: 'auto',
                    textAlign: 'center',
                    padding: '12px 8px',
                    borderRadius: '8px',
                    background: 'var(--ai-diagram-bg, rgba(0, 0, 0, 0.15))'
                }}
            >
                {svgContent ? (
                    <div 
                        dangerouslySetInnerHTML={{ __html: svgContent }} 
                        style={{ display: 'inline-block', maxWidth: '100%' }}
                    />
                ) : renderError ? (
                    <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                        <pre style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', overflowX: 'auto' }}>
                            {code}
                        </pre>
                    </div>
                ) : (
                    <div style={{ color: '#94a3b8', fontSize: '12px', padding: '16px' }}>
                        <RefreshCw size={14} className="animate-spin" style={{ display: 'inline', marginRight: '6px' }} />
                        Rendering vector diagram...
                    </div>
                )}
            </div>

            {description && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.4' }}>
                    {description}
                </div>
            )}

            {/* Fullscreen Lightbox Modal */}
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
                            maxWidth: '92vw',
                            maxHeight: '90vh',
                            background: 'var(--ai-panel-bg, #0f172a)',
                            border: '1px solid var(--ai-border, #334155)',
                            borderRadius: '16px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            overflow: 'auto',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px' }}>{title || 'Diagram'}</h3>
                            <button
                                onClick={() => setIsLightboxOpen(false)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                        <div 
                            dangerouslySetInnerHTML={{ __html: svgContent }}
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'auto' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
