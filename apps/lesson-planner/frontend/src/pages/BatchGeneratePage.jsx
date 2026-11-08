import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Zap, ArrowLeft, CheckCircle, AlertCircle, 
  Loader2, Play, Download, ExternalLink, GraduationCap
} from 'lucide-react';
import api from '../services/api';
import { useSubscription } from '../context/SubscriptionContext';
import { toast } from 'react-toastify';

export default function BatchGeneratePage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { fetchSubscription } = useSubscription();
  const canBatch = true;
  
  const [unit, setUnit] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [currentProvider, setCurrentProvider] = useState('gemini');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [unitRes, lessonsRes] = await Promise.all([
          api.get(`/units/${unitId}`),
          api.get(`/units/${unitId}/lessons`)
        ]);
        setUnit(unitRes.data.data);
        setLessons(lessonsRes.data.data);
      } catch (err) {
        toast.error('Failed to load unit details');
        navigate('/classes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [unitId, navigate]);

  const handleStartBatch = async () => {
    if (!window.confirm(`This will generate AI lesson plans for all ${lessons.length} lessons in this unit. Continue?`)) {
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.post(`/lesson-plans/units/${unitId}/plans/batch-generate`, {
        provider: currentProvider
      });
      setResults(res.data);
      toast.success('Batch generation completed!');
    } catch (err) {
      const isSubError = err.response?.data?.subscriptionError;
      const message = err.response?.data?.message || 'Batch generation failed';
      toast.error(isSubError ? `🔒 ${message}` : message);
      if (isSubError) fetchSubscription?.();
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Batch AI Generation</h1>
            <p className="page-subtitle">
              {unit?.subject_name} · Unit {unit?.unit_number}: {unit?.unit_title}
            </p>
          </div>
        </div>
      </div>

      <div className="batch-grid">
        {/* Settings & Info */}
        <div className="batch-sidebar">
          <div className="card">
            <div className="card-header">
              <h3>Generation Settings</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>AI Intelligence Provider</label>
                <div className="provider-selector">
                  <button 
                    className={`provider-btn ${currentProvider === 'gemini' ? 'active' : ''}`}
                    onClick={() => setCurrentProvider('gemini')}
                  >
                    DLP AI Pro
                  </button>
                  <button 
                    className={`provider-btn ${currentProvider === 'groq' ? 'active' : ''}`}
                    onClick={() => setCurrentProvider('groq')}
                  >
                    Groq Llama 3 (Fast)
                  </button>
                </div>
              </div>

              <div className="batch-info-box">
                <div className="info-stat">
                  <span className="info-label">Total Lessons</span>
                  <span className="info-value">{lessons.length}</span>
                </div>
                <div className="info-stat">
                  <span className="info-label">Estimated Time</span>
                  <span className="info-value">~{Math.ceil(lessons.length * 0.5)} mins</span>
                </div>
              </div>

              {!canBatch && (
                <div className="vip-notice">
                  <Zap size={20} />
                  <div>
                    <strong>Premium Feature</strong>
                    <p>Unlock batch generation to save hours of prep time.</p>
                  </div>
                </div>
              )}

              <button 
                className={`btn btn-primary btn-lg btn-block ${isGenerating ? 'loading' : ''}`}
                onClick={handleStartBatch}
                disabled={isGenerating || lessons.length === 0}
                style={{ marginTop: 'var(--sp-6)' }}
              >
                {isGenerating ? (
                  <><Loader2 size={20} className="animate-spin" /> Processing...</>
                ) : (
                  <><Play size={18} /> Start Batch Generation</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lessons List / Results */}
        <div className="batch-main">
          {results ? (
            <div className="card results-card animate-scale-up">
              <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={20} color="var(--c-success)" />
                  Batch Complete
                </h3>
              </div>
              <div className="card-body">
                <div className="results-summary">
                  <p>{results.message}</p>
                </div>

                <div className="results-list">
                  {results.data.map((res, i) => {
                    const lesson = lessons.find(l => l.id === res.lessonId);
                    return (
                      <div key={i} className={`result-item ${res.success ? 'success' : 'error'}`}>
                        <div className="result-info">
                          <span className="result-num">Lesson {lesson?.lesson_number}</span>
                          <span className="result-title">{lesson?.lesson_title}</span>
                        </div>
                        <div className="result-actions">
                          {res.success ? (
                            <Link to={`/lessons/${res.lessonId}/plan`} className="btn-icon-sm">
                              <ExternalLink size={14} />
                            </Link>
                          ) : (
                            <AlertCircle size={16} color="var(--c-error)" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 'var(--sp-8)', display: 'flex', gap: 12 }}>
                  <button onClick={() => navigate(`/units/${unitId}/lessons`)} className="btn btn-primary">
                    <GraduationCap size={18} /> View All Lessons
                  </button>
                  <button onClick={() => setResults(null)} className="btn btn-secondary">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h3>Lessons in this Unit</h3>
              </div>
              <div className="card-body no-padding">
                <div className="batch-lesson-list">
                  {lessons.map((l, i) => (
                    <div key={i} className="batch-lesson-item">
                      <div className="lesson-num">L{l.lesson_number}</div>
                      <div className="lesson-info">
                        <div className="lesson-title">{l.lesson_title}</div>
                        <div className="lesson-meta">{l.duration} mins · Term {l.term}</div>
                      </div>
                    </div>
                  ))}
                  {lessons.length === 0 && (
                    <div className="empty-state">
                      <p>No lessons found in this unit.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .batch-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: var(--sp-6);
          align-items: start;
        }

        .provider-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .provider-btn {
          padding: 12px;
          border: 2px solid var(--c-border);
          border-radius: 12px;
          background: var(--c-surface);
          color: var(--c-text-primary);
          font-weight: 700;
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .provider-btn.active {
          border-color: var(--c-brand);
          background: var(--c-brand-light);
          color: var(--c-brand-dark);
        }

        .batch-info-box {
          margin-top: var(--sp-6);
          padding: var(--sp-4);
          background: var(--c-surface-2);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .info-label { font-size: 0.75rem; color: var(--c-text-muted); font-weight: 600; }
        .info-value { font-weight: 800; color: var(--c-text-primary); }

        .vip-notice {
          margin-top: var(--sp-6);
          padding: var(--sp-4);
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border: 1px solid #fde68a;
          border-radius: 12px;
          display: flex;
          gap: 12px;
          color: #92400e;
        }

        .vip-notice strong { display: block; font-size: 0.875rem; }
        .vip-notice p { font-size: 0.75rem; opacity: 0.8; margin-top: 2px; }

        .batch-lesson-list {
          display: flex;
          flex-direction: column;
        }

        .batch-lesson-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--c-border-soft);
        }

        .batch-lesson-item:last-child { border-bottom: none; }

        .lesson-num {
          width: 36px;
          height: 36px;
          background: var(--c-surface-2);
          color: var(--c-text-muted);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .lesson-info { flex: 1; }
        .lesson-title { font-weight: 600; font-size: 0.9375rem; }
        .lesson-meta { font-size: 0.75rem; color: var(--c-text-muted); margin-top: 2px; }

        .results-summary {
          padding: 16px;
          background: var(--c-success-light);
          color: var(--c-success-dark);
          border-radius: 12px;
          margin-bottom: var(--sp-6);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 10px;
          background: var(--c-surface-2);
        }

        .result-item.success { border-left: 4px solid var(--c-success); }
        .result-item.error { border-left: 4px solid var(--c-error); }

        .result-num { font-size: 0.75rem; font-weight: 700; color: var(--c-text-muted); display: block; }
        .result-title { font-size: 0.875rem; font-weight: 600; }

        @media (max-width: 900px) {
          .batch-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
