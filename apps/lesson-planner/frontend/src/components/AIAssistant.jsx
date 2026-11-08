import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare, Send, X, Clock, Plus,
    MoreHorizontal, Copy, ThumbsUp, ThumbsDown,
    Mic, Sliders, Trash2, CornerDownLeft, ArrowRight,
    Upload, Image, FileText
} from 'lucide-react';
import './AIAssistant.css';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import MermaidDiagram from './MermaidDiagram';
import ChartWidget from './ChartWidget';
import ImageWidget from './ImageWidget';

const AIAssistant = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false); // History toggled off by default
    const [showMenu, setShowMenu] = useState(false); // For 3 dots menu


    // Session state
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [currentSessionTitle, setCurrentSessionTitle] = useState('New Session');

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingLabel, setLoadingLabel] = useState('Thinking...');
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Voice recognition state
    const [isListening, setIsListening] = useState(false);
    const [voiceText, setVoiceText] = useState('');
    const [speechRecognition, setSpeechRecognition] = useState(null);

    // File upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Title Editing state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const voiceTextRef = useRef('');

    // Autonomous Agent state
    const [isAgentMode, setIsAgentMode] = useState(false);
    const [agentGoal, setAgentGoal] = useState('');
    const [agentRunning, setAgentRunning] = useState(false);
    const [agentLogs, setAgentLogs] = useState([]);
    const [agentStatus, setAgentStatus] = useState('idle'); // idle, running, completed, error
    const agentRunningRef = useRef(false);
    const isAgentModeRef = useRef(false);

    useEffect(() => {
        isAgentModeRef.current = isAgentMode;
    }, [isAgentMode]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    // Load Sessions when opened
    useEffect(() => {
        if (isOpen) {
            fetchSessions();
        }
    }, [isOpen]);

    // Update Session Title when selected
    useEffect(() => {
        if (currentSessionId && sessions.length > 0) {
            const found = sessions.find(s => s.id === currentSessionId);
            if (found) setCurrentSessionTitle(found.title);
        } else {
            setCurrentSessionTitle('New Session');
        }
    }, [currentSessionId, sessions]);

    // Load History when session changes
    useEffect(() => {
        if (isOpen) {
            fetchHistory(currentSessionId);
        }
    }, [currentSessionId, isOpen]);

    useEffect(() => {
        if (isOpen && messages.length > 0 && !isHistoryLoading) {
            scrollToBottom();
        }
    }, [messages.length, isOpen]);

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');
                setVoiceText(transcript);
                voiceTextRef.current = transcript;
            };

            recognition.onend = () => {
                setIsListening(false);
                const currentVoiceText = voiceTextRef.current;
                if (currentVoiceText.trim()) {
                    if (isAgentModeRef.current) {
                        setAgentGoal(currentVoiceText.trim());
                        setInput('');
                        setAgentLogs([]);
                        runAgentLoop(currentVoiceText.trim());
                    } else {
                        handleSend(null, currentVoiceText);
                    }
                    voiceTextRef.current = '';
                    setVoiceText('');
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                setVoiceText('');
                voiceTextRef.current = '';
            };

            setSpeechRecognition(recognition);
        }

        return () => {
            if (speechRecognition) {
                speechRecognition.stop();
            }
        };
    }, []);

    // Handle outside clicks to close menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMenu &&
                event.target !== textareaRef.current &&
                !event.target.closest('.ai-input-box') &&
                !event.target.closest('.ai-header-actions')) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    // Auto-grow textarea to prevent cut-offs/scrollbars
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input, isAgentMode]);

    const fetchSessions = async () => {
        try {
            const res = await api.get('/chat/sessions');
            if (res.data.success) {
                setSessions(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load sessions');
        }
    };

    const fetchHistory = async (sessionId) => {
        setIsHistoryLoading(true);
        try {
            const url = sessionId ? `/chat/history?sessionId=${sessionId}` : '/chat/history';
            const res = await api.get(url);
            
            if (res.data.success && res.data.data.length > 0) {
                const history = [];
                res.data.data.forEach(chat => {
                    history.push({ type: 'user', content: chat.message });
                    history.push({ type: 'ai', content: chat.response });
                });
                setMessages(history);
            } else {
                setMessages([{ type: 'ai', content: "Hello! How can I help you with your project today?" }]);
            }
        } catch (err) {
            console.error('History fetch failed');
        } finally {
            setIsHistoryLoading(false);
            setTimeout(scrollToBottom, 100);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([{ type: 'ai', content: "Hello! How can I help you with your project today?" }]);
        setShowHistory(false);
    };

    const handleSelectSession = (id) => {
        setCurrentSessionId(id);
        setShowHistory(false);
    };

    const handleDeleteSession = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Delete this chat?")) {
            try {
                await api.delete(`/chat/sessions/${id}`);
                setSessions(sessions.filter(s => s.id !== id));
                if (currentSessionId === id) {
                    handleNewChat();
                }
            } catch (err) {
                console.error('Delete failed');
            }
        }
    };

    const handleDeleteAllSessions = async () => {
        if (window.confirm("Are you sure you want to delete ALL chat history? This cannot be undone.")) {
            try {
                await api.delete('/chat/history');
                setSessions([]);
                handleNewChat();
            } catch (err) {
                console.error('Clear all failed', err);
            }
        }
    };

    const handleExportChat = () => {
        if (messages.length === 0) return;
        const textContent = messages.map(m => `[${m.type.toUpperCase()}]: ${m.content}`).join('\n\n');
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentSessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'chat_export'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowMenu(false);
    };

    const handleStopAgent = () => {
        agentRunningRef.current = false;
        setAgentRunning(false);
        setAgentStatus('stopped');
        setLoading(false);
        setLoadingLabel('Stopped.');
        setAgentLogs(prev => prev.map(l => l.status === 'running' ? {
            ...l,
            action: 'Execution stopped by user.',
            thought: 'Agent stopped.',
            status: 'error'
        } : l));
    };

    const captureDOMState = () => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, button, a, input, select, textarea, label, [role="button"], table, th, td'));
        const items = [];
        
        elements.forEach(el => {
            if (el.closest('.ai-assistant-container') || el.closest('.chat-trigger-btn')) return;
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
            
            const tagName = el.tagName.toLowerCase();
            const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
            
            if (tagName === 'button' || el.getAttribute('role') === 'button' || el.classList.contains('btn')) {
                if (text) items.push(`[BUTTON] "${text}"`);
            } else if (tagName === 'a') {
                if (text) items.push(`[LINK] "${text}" (href: ${el.getAttribute('href') || ''})`);
            } else if (tagName === 'input') {
                const type = el.getAttribute('type') || 'text';
                const placeholder = el.getAttribute('placeholder') || '';
                const name = el.getAttribute('name') || '';
                const val = el.value || '';
                items.push(`[INPUT] type="${type}" name="${name}" placeholder="${placeholder}" current_value="${val}"`);
            } else if (tagName === 'textarea') {
                const placeholder = el.getAttribute('placeholder') || '';
                const val = el.value || '';
                items.push(`[TEXTAREA] placeholder="${placeholder}" current_value="${val}"`);
            } else if (tagName === 'select') {
                const name = el.getAttribute('name') || '';
                const val = el.value || '';
                const options = Array.from(el.options).map(o => o.text).join(', ');
                items.push(`[SELECT] name="${name}" current_value="${val}" options: [${options}]`);
            } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
                if (text) items.push(`[HEADING] "${text}"`);
            } else if (tagName === 'label') {
                if (text) items.push(`[LABEL] "${text}"`);
            }
        });
        
        return items.slice(0, 80).join('\n');
    };

    const executeAgentAction = async (act) => {
        const { type, data } = act;
        try {
            if (type === 'redirect' && data && data.url) {
                navigate(data.url);
                await new Promise(r => setTimeout(r, 2000));
            } else if (type === 'ui_click' && data && data.text) {
                await new Promise(r => setTimeout(r, 1000));
                const selectors = 'button, a, [role="button"], .btn, div, span, label, p';
                const elements = Array.from(document.querySelectorAll(selectors));
                
                let matches = elements.filter(el => {
                    const text = (el.innerText || el.textContent || '').toLowerCase();
                    const id = el.id || '';
                    const cls = el.className || '';
                    if (id === 'root' || id === 'app' || cls.includes('ai-assistant')) return false;
                    if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
                    return text.includes(data.text.toLowerCase());
                });
                
                matches.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);
                const match = matches[0];
                
                if (match) {
                    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    match.classList.add('agent-target-highlight');
                    await new Promise(r => setTimeout(r, 600));
                    match.classList.remove('agent-target-highlight');
                    match.click();
                    await new Promise(r => setTimeout(r, 1000));
                }
            } else if (type === 'ui_fill' && data) {
                await new Promise(r => setTimeout(r, 500));
                const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
                const inputEl = inputs.find(i => 
                    (data.placeholder && i.placeholder && i.placeholder.toLowerCase().includes(data.placeholder.toLowerCase())) ||
                    (data.name && i.name && i.name.toLowerCase().includes(data.name.toLowerCase())) ||
                    (data.id && i.id === data.id)
                );
                if (inputEl) {
                    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputEl.classList.add('agent-target-highlight');
                    inputEl.value = data.value;
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                    await new Promise(r => setTimeout(r, 600));
                    inputEl.classList.remove('agent-target-highlight');
                }
            }
        } catch(e) {
            console.error('Agent action failed', e);
        }
    };

    const runAgentLoop = async (currentGoal) => {
        agentRunningRef.current = true;
        setAgentRunning(true);
        setAgentStatus('running');
        
        let history = [];
        let attempts = 0;
        const maxAttempts = 40; // Increased limit from 15 to 40 to allow complex/longer tasks to complete
        let activeSessionId = currentSessionId;
        
        while (agentRunningRef.current && attempts < maxAttempts) {
            attempts++;
            const domState = captureDOMState();
            const currentUrl = window.location.pathname + window.location.search;
            
            const stepLogId = Date.now() + Math.random();
            setAgentLogs(prev => [...prev, {
                id: stepLogId,
                thought: 'Reasoning...',
                action: `Step ${attempts}: Analyzing screen and deciding next move...`,
                status: 'running'
            }]);
            
            try {
                const res = await api.post('/chat/query', {
                    message: currentGoal,
                    session_id: activeSessionId,
                    isAgent: true,
                    currentUrl,
                    domState,
                    actionHistory: history
                });
                
                if (!agentRunningRef.current) {
                    setAgentLogs(prev => prev.map(l => l.id === stepLogId ? {
                        ...l,
                        action: 'Stopped by user.',
                        thought: 'Execution stopped.',
                        status: 'error'
                    } : l));
                    break;
                }
                
                if (res.data.success) {
                    if (!activeSessionId && res.data.session_id) {
                        activeSessionId = res.data.session_id;
                        setCurrentSessionId(res.data.session_id);
                        fetchSessions();
                    }
                    
                    const thought = res.data.response || 'Analyzing...';
                    const actions = res.data.actions || [];
                    const isComplete = res.data.isComplete || false;
                    
                    const actionDetail = actions.length > 0
                        ? `${actions[0].type.toUpperCase()}: ${JSON.stringify(actions[0].data)}`
                        : (isComplete ? 'Goal Achieved!' : 'No action decided.');
                    
                    setAgentLogs(prev => prev.map(l => l.id === stepLogId ? {
                        ...l,
                        thought,
                        action: actionDetail,
                        status: isComplete ? 'success' : 'success'
                    } : l));
                    
                    history.push(`Step ${attempts}: ${actionDetail} (Thought: ${thought})`);
                    
                    if (res.data.redirect) {
                        navigate(res.data.redirect);
                    }
                    window.dispatchEvent(new Event('refreshData'));

                    if (isComplete) {
                        setAgentStatus('completed');
                        setAgentRunning(false);
                        agentRunningRef.current = false;
                        break;
                    }
                    
                    if (actions.length > 0) {
                        await executeAgentAction(actions[0]);
                    } else {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    throw new Error('API failed to respond.');
                }
            } catch (err) {
                console.error('Agent loop failed', err);
                const errorMsg = err.response?.data?.message || err.message || 'API request failed';
                setAgentLogs(prev => prev.map(l => l.id === stepLogId ? {
                    ...l,
                    action: `Error: ${errorMsg}`,
                    status: 'error'
                } : l));
                setAgentStatus('error');
                setAgentRunning(false);
                agentRunningRef.current = false;
                break;
            }
        }
        
        if (attempts >= maxAttempts && agentRunningRef.current) {
            setAgentLogs(prev => [...prev, {
                id: Date.now(),
                thought: 'Safety timeout reached.',
                action: `Exceeded maximum step limit (${maxAttempts} steps).`,
                status: 'error'
            }]);
            setAgentStatus('error');
            setAgentRunning(false);
            agentRunningRef.current = false;
        }
    };

    const handleStartAgent = () => {
        if (!input.trim() || agentRunning) return;
        const goalText = input.trim();
        setAgentGoal(goalText);
        setInput(''); // clear input for next follow-up query
        setAgentLogs([]);
        runAgentLoop(goalText);
    };

    const saveEditedTitle = async () => {
        setIsEditingTitle(false);
        if (editTitleValue.trim() && editTitleValue !== currentSessionTitle) {
            setCurrentSessionTitle(editTitleValue);
            // Update immediately in the list
            setSessions(sessions.map(s => s.id === currentSessionId ? { ...s, title: editTitleValue } : s));
            try {
                await api.put(`/chat/sessions/${currentSessionId}`, { title: editTitleValue });
            } catch(e) { console.error('Failed to update title'); }
        }
    };

    const handleSend = async (e, textOverride = null) => {
        // Prevent default only on the actual send logic triggered by Enter (without shift)
        if (e && e.type === 'keydown') {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
            } else {
                return; // Let user type newline or regular text
            }
        } else if (e && e.type !== 'keydown') {
            // Probably a form submit or button click
            if (e && e.preventDefault) e.preventDefault();
        }

        const messageToSend = textOverride !== null ? textOverride.trim() : input.trim();
        if (!messageToSend || loading) return;

        const userMsg = messageToSend;
        setInput('');
        setMessages(prev => [...prev, { type: 'user', content: userMsg }]);
        setLoading(true);
        setLoadingLabel('Reasoning...');

        try {
            const res = await api.post('/chat/query', { 
                message: userMsg,
                session_id: currentSessionId 
            });
            
            if (res.data.success) {
                // Update session ID if we started a new one
                if (!currentSessionId && res.data.session_id) {
                    setCurrentSessionId(res.data.session_id);
                    fetchSessions();
                }

                // reset textarea height after send
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }

                setMessages(prev => [...prev, { type: 'ai', content: res.data.response }]);
                
                if (res.data.actions && res.data.actions.length > 0) {
                    const actionCount = res.data.actions.length;
                    setLoadingLabel(`Executing ${actionCount} tasks...`);
                    
                    for (const act of res.data.actions) {
                        try {
                            if (act.type === 'redirect' && act.data && act.data.url) {
                                setLoadingLabel(`Navigating...`);
                                navigate(act.data.url);
                                await new Promise(r => setTimeout(r, 2000)); // wait for DOM
                            } else if (act.type === 'ui_click' && act.data && act.data.text) {
                                await new Promise(r => setTimeout(r, 1000)); // Buffer for React rendering
                                
                                // Find all elements containing the text
                                const selectors = 'button, a, [role="button"], .btn, div, span, label, p';
                                const elements = Array.from(document.querySelectorAll(selectors));
                                
                                // Filter out large containers or AI-specific elements
                                let matches = elements.filter(el => {
                                    const text = (el.innerText || el.textContent || '').toLowerCase();
                                    const id = el.id || '';
                                    const cls = el.className || '';
                                    
                                    // Ignore containers, AI assistant itself, and hidden elements
                                    if (id === 'root' || id === 'app' || cls.includes('ai-assistant')) return false;
                                    if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
                                    
                                    return text.includes(act.data.text.toLowerCase());
                                });

                                // Find the most specific match (the one with the least children or smallest size)
                                matches.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);
                                const match = matches[0];
                                
                                if (match) {
                                    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    await new Promise(r => setTimeout(r, 300));
                                    match.click();
                                    setLoadingLabel(`Clicked: ${act.data.text}`);
                                    await new Promise(r => setTimeout(r, 500));
                                } else {
                                    console.warn('[AI Action] No specific element found for', act.data.text);
                                }
                            } else if (act.type === 'ui_fill' && act.data) {
                                await new Promise(r => setTimeout(r, 500));
                                const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
                                const inputEl = inputs.find(i => 
                                    (act.data.placeholder && i.placeholder && i.placeholder.toLowerCase().includes(act.data.placeholder.toLowerCase())) ||
                                    (act.data.name && i.name && i.name.toLowerCase().includes(act.data.name.toLowerCase())) ||
                                    (act.data.id && i.id === act.data.id)
                                );
                                if (inputEl) {
                                    inputEl.value = act.data.value;
                                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                                    setLoadingLabel(`Filled: ${act.data.placeholder || act.data.name || 'input'}`);
                                    await new Promise(r => setTimeout(r, 500));
                                } else {
                                    console.warn('[AI Action] No input found for', act.data);
                                }
                            }
                        } catch(e) { 
                            console.error('UI Action error:', e); 
                        }
                    }

                    await new Promise(r => setTimeout(r, 1500));

                    if (res.data.redirect) {
                        setLoadingLabel('Redirecting perspective...');
                        setTimeout(() => {
                            navigate(res.data.redirect);
                            setLoading(false);
                        }, 1000);
                        return;
                    }
                }
            } else {
                setMessages(prev => [...prev, { type: 'ai', content: "Network error." }]);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Error connecting to AI service.";
            setMessages(prev => [...prev, { type: 'ai', content: errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
    };

    const handlePaste = async (e) => {
        // Check if pasted content includes images
        const items = (e.clipboardData || window.clipboardData).items;
        let hasImage = false;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                hasImage = true;
                const file = item.getAsFile();
                if (file) {
                    setSelectedFile(file);
                    // Optionally show filename or preview
                    setInput(`${input} [${file.name}] `);
                    break;
                }
            }
        }

        // If no image was pasted, allow normal text paste
        if (!hasImage) {
            // Allow default paste behavior for text
            return true;
        }

        // Prevent default to avoid inserting the image as binary data
        e.preventDefault();
    };

    const toggleVoiceRecording = () => {
        if (!speechRecognition) {
            alert('Voice recognition is not supported in this browser.');
            return;
        }

        if (isListening) {
            speechRecognition.stop();
            setIsListening(false);
        } else {
            setVoiceText('');
            voiceTextRef.current = '';
            speechRecognition.start();
            setIsListening(true);
        }
    };

    return (
        <>
            {!isOpen && (
                <button className="chat-trigger-btn" onClick={() => setIsOpen(true)}>
                    <MessageSquare size={24} />
                </button>
            )}

            <div className={`ai-assistant-container ${isOpen ? 'open' : ''}`}>
                <div className="ai-assistant-content-wrapper">
                    
                    {/* Header (IDE Style) */}
                    <div className="ai-header">
                        {isEditingTitle && currentSessionId ? (
                            <input 
                                className="ai-title-input" 
                                autoFocus 
                                value={editTitleValue} 
                                onChange={e => setEditTitleValue(e.target.value)}
                                onBlur={saveEditedTitle}
                                onKeyDown={e => e.key === 'Enter' && saveEditedTitle()}
                            />
                        ) : (
                            <div 
                                className={`ai-header-title ${currentSessionId ? 'clickable' : ''}`}
                                onClick={() => {
                                    if(currentSessionId) {
                                        setEditTitleValue(currentSessionTitle);
                                        setIsEditingTitle(true);
                                    }
                                }}
                                title="Click to rename chat"
                            >
                                {currentSessionTitle}
                            </div>
                        )}
                        <div className="ai-header-actions">
                            <button className="ai-header-btn" title="New Chat" onClick={handleNewChat}>
                                <Plus size={16} />
                            </button>
                            <button className="ai-header-btn" title="History" onClick={() => setShowHistory(!showHistory)}>
                                <Clock size={16} />
                            </button>
                            <button className="ai-header-btn" title="Menu" onClick={() => setShowMenu(!showMenu)}>
                                <MoreHorizontal size={16} />
                            </button>
                            {showMenu && (
                                <div className="ai-dropdown-menu" style={{ position: 'absolute', top: '40px', right: '40px', background: 'var(--ai-bg)', border: '1px solid var(--ai-panel-border)', borderRadius: '8px', padding: '4px', zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    <button 
                                        onClick={handleExportChat}
                                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', color: 'var(--ai-text-primary)' }}
                                        onMouseOver={e => e.target.style.background = 'var(--ai-hover)'}
                                        onMouseOut={e => e.target.style.background = 'none'}
                                    >
                                        Export Chat (.txt)
                                    </button>
                                </div>
                            )}
                            <button className="ai-header-btn" title="Close" onClick={() => setIsOpen(false)}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Mode Toggle Header */}
                    <div className="agent-mode-header">
                        <div className="agent-toggle-pill-group">
                            <button 
                                className={`agent-toggle-pill ${!isAgentMode ? 'active' : ''}`}
                                onClick={() => setIsAgentMode(false)}
                                disabled={agentRunning}
                            >
                                Standard Chat
                            </button>
                            <button 
                                className={`agent-toggle-pill ${isAgentMode ? 'active' : ''}`}
                                onClick={() => setIsAgentMode(true)}
                                disabled={agentRunning}
                            >
                                Autonomous Agent
                            </button>
                        </div>
                    </div>

                {/* Main Content (Relative for overlays) */}
                <div className="ai-main-area">
                    
                    {/* History Sidebar/Overlay - toggled by clock icon */}
                    <div className={`ai-history-panel ${showHistory ? 'open' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--ai-panel-border)', fontSize: '14px', fontWeight: '500' }}>
                            <span>Recent Sessions</span>
                            {sessions.length > 0 && (
                                <button 
                                    onClick={handleDeleteAllSessions}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                                    title="Delete all chat history"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        <div className="history-list">
                            {sessions.map(s => (
                                <div 
                                    key={s.id} 
                                    className={`history-item ${currentSessionId === s.id ? 'active' : ''}`}
                                    onClick={() => handleSelectSession(s.id)}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                                    <button className="history-delete-btn" onClick={(e) => handleDeleteSession(e, s.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <div style={{ color: 'var(--ai-text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                                    No past sessions.
                                </div>
                            )}
                        </div>
                    </div>

                    {!isAgentMode ? (
                        <>
                            {/* Chat Messages */}
                            <div className="ai-messages-list">
                                {messages.map((m, i) => (
                                    <div key={i} className={`ai-message ${m.type}`}>
                                        <div className="msg-content">
                                            {m.type === 'ai' ? (
                                                <ReactMarkdown
                                                    components={{
                                                        code({ node, inline, className, children, ...props }) {
                                                            const match = /language-(\w+[:\w-]*)/.exec(className || '');
                                                            const lang = match ? match[1].toLowerCase() : '';
                                                            const rawText = String(children).replace(/\n$/, '').trim();

                                                            // 1. Mermaid Diagrams
                                                            if (!inline && (lang === 'mermaid' || lang === 'graph' || lang === 'flowchart' || rawText.startsWith('graph ') || rawText.startsWith('flowchart ') || rawText.startsWith('sequenceDiagram') || rawText.startsWith('mindmap') || rawText.startsWith('classDiagram'))) {
                                                                return <MermaidDiagram code={rawText} />;
                                                            }

                                                            // 2. Chart JSON
                                                            if (!inline && (lang === 'chart' || lang === 'json:chart' || lang === 'chartjs')) {
                                                                try {
                                                                    const chartData = JSON.parse(rawText);
                                                                    return <ChartWidget chartData={chartData} />;
                                                                } catch (e) {
                                                                    return <code className={className} {...props}>{children}</code>;
                                                                }
                                                            }

                                                            // 3. AI Image Generation
                                                            if (!inline && (lang === 'image' || lang === 'json:image')) {
                                                                try {
                                                                    const imgData = JSON.parse(rawText);
                                                                    const promptParam = encodeURIComponent(imgData.prompt || 'educational visual aid');
                                                                    const url = imgData.url || `https://image.pollinations.ai/prompt/${promptParam}?width=800&height=500&nologo=true`;
                                                                    return <ImageWidget url={url} caption={imgData.caption || imgData.prompt} />;
                                                                } catch (e) {
                                                                    return <code className={className} {...props}>{children}</code>;
                                                                }
                                                            }

                                                            // 4. Auto-detect Chart or Image inside standard json block
                                                            if (!inline && (lang === 'json' || !lang) && rawText.startsWith('{') && rawText.endsWith('}')) {
                                                                try {
                                                                    const parsed = JSON.parse(rawText);
                                                                    if (parsed.type && ['bar', 'line', 'pie', 'doughnut', 'radar', 'polararea'].includes(parsed.type.toLowerCase()) && (parsed.data || parsed.datasets || parsed.labels)) {
                                                                        return <ChartWidget chartData={parsed} />;
                                                                    }
                                                                    if (parsed.prompt && (parsed.caption || parsed.type === 'image')) {
                                                                        const promptParam = encodeURIComponent(parsed.prompt);
                                                                        const url = parsed.url || `https://image.pollinations.ai/prompt/${promptParam}?width=800&height=500&nologo=true`;
                                                                        return <ImageWidget url={url} caption={parsed.caption || parsed.prompt} />;
                                                                    }
                                                                } catch (e) {}
                                                            }

                                                            return !inline ? (
                                                                <div className="ai-code-block-wrapper">
                                                                    <pre className="ai-code-block"><code className={className} {...props}>{children}</code></pre>
                                                                </div>
                                                            ) : (
                                                                <code className="ai-inline-code" {...props}>{children}</code>
                                                            );
                                                        },
                                                        table({ children }) {
                                                            return (
                                                                <div className="ai-table-wrapper" style={{ overflowX: 'auto', margin: '10px 0' }}>
                                                                    <table className="ai-markdown-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                        {children}
                                                                    </table>
                                                                </div>
                                                            );
                                                        },
                                                        th({ children }) {
                                                            return (
                                                                <th style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--ai-panel-border)', padding: '6px 10px', textAlign: 'left', fontWeight: '600' }}>
                                                                    {children}
                                                                </th>
                                                            );
                                                        },
                                                        td({ children }) {
                                                            return (
                                                                <td style={{ border: '1px solid var(--ai-panel-border)', padding: '6px 10px' }}>
                                                                    {children}
                                                                </td>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {m.content}
                                                </ReactMarkdown>
                                            ) : (
                                                m.content
                                            )}
                                        </div>
                                        {m.type === 'ai' && (
                                            <div className="ai-message-actions">
                                                <button className="ai-msg-act-btn" onClick={() => handleCopy(m.content)} title="Copy">
                                                    <Copy size={12} /> Copy
                                                </button>
                                                <button className="ai-msg-act-btn" title="Good response">
                                                    <ThumbsUp size={12} />
                                                </button>
                                                <button className="ai-msg-act-btn" title="Bad response">
                                                    <ThumbsDown size={12} />
                                                </button>
                                            </div>
                                        )}
                                        {m.type === 'user' && (
                                            <div style={{ alignSelf: 'flex-end', opacity: 0.5, marginTop: '-5px' }}>
                                                <CornerDownLeft size={12} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                
                                {loading && (
                                    <div className="ai-loading-status flex-between">
                                        <span><div className="spinner"></div> {loadingLabel}</span>
                                        <button className="stop-agent-btn" onClick={handleStopAgent}>stop</button>
                                    </div>
                                )}
                                <div ref={messagesEndRef} style={{ height: '10px' }}></div>
                            </div>
                        </>
                    ) : (
                        <div className="agent-timeline-container">
                            {agentGoal && (
                                <div className="agent-goal-display" style={{ padding: '12px', background: 'var(--ai-input-bg)', border: '1px solid var(--ai-panel-border)', borderRadius: '8px', marginBottom: '8px', fontSize: '13px' }}>
                                    <strong style={{ color: 'var(--ai-text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Active Objective</strong>
                                    <span style={{ color: 'var(--ai-text-primary)' }}>{agentGoal}</span>
                                </div>
                            )}

                            <div className="agent-status-card">
                                <div className={`agent-status-dot ${agentRunning ? 'active' : (agentStatus === 'completed' ? 'completed' : (agentStatus === 'stopped' ? 'error' : ''))}`} />
                                <span>
                                    {agentRunning ? 'Agent is executing task...' : 
                                     (agentStatus === 'completed' ? 'Task completed successfully!' : 
                                     (agentStatus === 'stopped' ? 'Agent execution stopped by user.' :
                                     (agentStatus === 'error' ? 'Execution failed.' : 'Ready to start.')))}
                                </span>
                            </div>

                            {agentLogs.length > 0 && (
                                <div className="agent-steps-list">
                                    {agentLogs.map((log) => (
                                        <div key={log.id} className={`agent-step-item ${log.status}`}>
                                            <div className="agent-step-marker" />
                                            <div className="agent-step-content">
                                                <div className="agent-step-action">{log.action}</div>
                                                <div className="agent-step-thought">{log.thought}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Bottom AI Input (IDE Style) */}
                    <div className="ai-input-container">
                        <div className="ai-input-box">
                            {isListening && (
                                <div className="voice-status">
                                    <Mic size={16} className="animate-pulse" />
                                    <span>{voiceText}</span>
                                </div>
                            )}
                            
                            <textarea
                                ref={textareaRef}
                                placeholder={
                                    isAgentMode 
                                        ? (agentRunning ? "Agent is running... Please wait or stop it." : "E.g., Create a class S6 Math, assign subject, and import lessons.")
                                        : "Ask anything, @ to mention, / for workflows"
                                }
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = (e.target.scrollHeight) + 'px';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (isAgentMode) {
                                            handleStartAgent();
                                        } else {
                                            handleSend(e);
                                        }
                                    }
                                }}
                                onPaste={isAgentMode ? undefined : handlePaste}
                                disabled={isAgentMode ? agentRunning : loading}
                                rows="1"
                                style={{ maxHeight: '150px', overflowY: 'auto' }}
                            />
                            
                            <div className="ai-input-bottom">
                                <div className="ai-bottom-tools-left">
                                    {isAgentMode ? (
                                        <button className="ai-tool-pill">
                                            <Sliders size={12} /> Autonomous Mode
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="ai-tool-pill"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                <Upload size={14} />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSelectedFile(e.target.files[0]);
                                                        setInput(`${input} [${e.target.files[0].name}] `);
                                                    }
                                                }}
                                            />
                                            <button className="ai-tool-pill">
                                                <Sliders size={12} /> 21st Century Agent
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="ai-bottom-tools-right">
                                    {isAgentMode ? (
                                        agentRunning ? (
                                            <button 
                                                className="agent-btn agent-btn-danger"
                                                onClick={handleStopAgent}
                                                style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}
                                            >
                                                <X size={14} /> Stop Agent
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    className="ai-tool-pill"
                                                    onClick={toggleVoiceRecording}
                                                    disabled={loading}
                                                >
                                                    {isListening ? <Mic size={16} className="animate-pulse" /> : <Mic size={16} />}
                                                </button>
                                                <button
                                                    className={`ai-send-btn ${input.trim() ? 'active' : ''}`}
                                                    onClick={handleStartAgent}
                                                    disabled={!input.trim()}
                                                >
                                                    <ArrowRight size={18} />
                                                </button>
                                            </>
                                        )
                                    ) : (
                                        <>
                                            <button
                                                className="ai-tool-pill"
                                                onClick={toggleVoiceRecording}
                                                disabled={loading}
                                            >
                                                {isListening ? <Mic size={16} className="animate-pulse" /> : <Mic size={16} />}
                                            </button>
                                            <button
                                                className={`ai-send-btn ${(input.trim() || selectedFile) && !loading ? 'active' : ''}`}
                                                onClick={handleSend}
                                                disabled={loading}
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default AIAssistant;
