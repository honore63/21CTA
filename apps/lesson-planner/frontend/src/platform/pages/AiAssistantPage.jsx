import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { usePlatform } from '../PlatformContext';
import platform from '../../services/platformApi';
import { Alert, Button, Card, Input, PageHeader, initials } from '../ui';
import './pages.css';

const SUGGESTION_KEYS = ['ai.suggestion1', 'ai.suggestion2', 'ai.suggestion3'];

const AiAssistantPage = () => {
  const { t, user } = usePlatform();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (text) => {
    const message = String(text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    try {
      const response = await platform.askAi({ message, session_id: sessionId || undefined });
      if (response.session_id) setSessionId(response.session_id);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: response.response || t('ai.error'),
        actions: response.actions || []
      }]);
    } catch (err) {
      setError(err.message || t('ai.error'));
      setMessages((prev) => [...prev, { role: 'assistant', text: t('ai.error'), isError: true }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <>
      <PageHeader
        title={t('ai.title')}
        subtitle={t('ai.subtitle')}
        actions={<span className="pf-badge pf-badge--info"><Sparkles size={13} /> {t('nav.aiAssistant')}</span>}
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="pf-chat">
        <div className="pf-chat__body" ref={bodyRef}>
          {messages.length === 0 ? (
            <div className="pf-center">
              <div style={{ textAlign: 'center', maxWidth: 480 }}>
                <p className="pf-text-strong" style={{ marginBottom: 6 }}>{t('ai.welcome')}</p>
                <p className="pf-text-small">{t('ai.suggestions')}</p>
                <div className="pf-suggestions" style={{ justifyContent: 'center' }}>
                  {SUGGESTION_KEYS.map((key) => (
                    <button key={key} type="button" className="pf-suggestion" onClick={() => send(t(key))}>
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`pf-chat__msg ${message.role === 'user' ? 'pf-chat__msg--user' : ''}`}>
                <span className="pf-chat__avatar">
                  {message.role === 'user' ? initials(user?.full_name) : 'AI'}
                </span>
                <div className="pf-chat__bubble">
                  {message.text}
                  {Array.isArray(message.actions) && message.actions.length > 0 ? (
                    <div className="pf-text-small" style={{ marginTop: 8 }}>
                      {t('common.actions')}: {message.actions.map((action) => action.type).join(', ')}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {sending ? (
            <div className="pf-chat__msg">
              <span className="pf-chat__avatar">AI</span>
              <div className="pf-chat__bubble">{t('ai.thinking')}</div>
            </div>
          ) : null}
        </div>
        <div className="pf-chat__composer">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
                 placeholder={t('ai.placeholder')} aria-label={t('ai.placeholder')} />
          <Button icon={Send} onClick={() => send()} disabled={sending || !input.trim()}>
            {t('ai.send')}
          </Button>
        </div>
      </div>

      {messages.length > 0 ? (
        <Card>
          <div className="pf-inline">
            <span className="pf-text-small">
              {sessionId ? `Session #${sessionId}` : ''}
            </span>
            <span className="pf-spacer" />
            <Button variant="secondary" size="sm"
                    onClick={() => { setMessages([]); setSessionId(null); setError(null); }}>
              {t('common.create')} · {t('nav.aiAssistant')}
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
};

export default AiAssistantPage;
