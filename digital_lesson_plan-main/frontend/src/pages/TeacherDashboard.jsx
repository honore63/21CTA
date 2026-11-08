import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import api from '../services/api';
import { useApiCache } from '../hooks/useApiCache';
import { SkeletonStatCard, SkeletonRow } from '../components/Skeleton';
import { 
  Layers, FileText, BookOpen, Zap, 
  ArrowRight, Plus, Clock, LayoutGrid, ClipboardList,
  CheckCircle, Trash2, Bot, AlertCircle, Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: statsData, loading: statsLoading } = useApiCache('/dashboard/stats');
  const { data: recentPlansRaw, loading: plansLoading } = useApiCache('/lesson-plans/recent?limit=5');

  const stats = statsData;
  const recentPlans = Array.isArray(recentPlansRaw) ? recentPlansRaw : (recentPlansRaw?.plans || []);
  const loading = statsLoading || plansLoading;


  const firstName = user?.full_name?.split(' ')[0] || 'Teacher';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { icon: <Layers size={20} />, label: 'Your Classes', value: stats?.classes ?? '—', link: '/classes', colorClass: 'indigo' },
    { icon: <FileText size={20} />, label: 'Lesson Plans', value: stats?.lesson_plans ?? '—', link: '/classes', colorClass: 'blue' },
    { icon: <BookOpen size={20} />, label: 'Resources', value: stats?.materials ?? '—', link: '/reference-materials', colorClass: 'orange' },
    { icon: <Zap size={20} />, label: 'Plans Today', value: 'Unlimited', link: null, colorClass: 'green' },
  ];

  // ── AI Agent Tasks ──────────────────────────────────────────────────────────
  const [agentTasks, setAgentTasks] = useState([]);
  const [agentSummary, setAgentSummary] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const [tasksRes, summaryRes] = await Promise.all([
          api.get('/agent/tasks'),
          api.get('/agent/summary')
        ]);
        setAgentTasks(tasksRes.data.data || []);
        setAgentSummary(summaryRes.data.data || null);
      } catch (e) {
        console.warn('Agent data unavailable:', e.message);
      } finally {
        setAgentLoading(false);
      }
    };
    fetchAgentData();

    const handleRefresh = () => fetchAgentData();
    window.addEventListener('refreshData', handleRefresh);
    return () => window.removeEventListener('refreshData', handleRefresh);
  }, []);

  const handleCompleteTask = async (taskId) => {
    try {
      await api.put(`/agent/tasks/${taskId}/complete`);
      setAgentTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
      toast.success('Task marked as complete!');
    } catch (e) {
      toast.error('Failed to complete task');
    }
  };

  const handleDismissTask = async (taskId) => {
    try {
      await api.delete(`/agent/tasks/${taskId}`);
      setAgentTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      toast.error('Failed to dismiss task');
    }
  };


  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header dashboard-header-flex">
        <div>
          <h1 className="page-title">{greeting}, {firstName} 👋</h1>
          <p className="page-subtitle">Here's your workspace overview for today.</p>
        </div>
        <Link to="/classes" className="btn btn-primary btn-sm">
          <Plus size={14} /> New Class
        </Link>
      </div>



      {/* Stat cards */}
      <div className="dashboard-stats-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          : statCards.map((s, i) => (
              <div key={i} className={`stat-card-premium stagger-${i + 1} skeleton-fade-in`} style={{ cursor: s.link ? 'pointer' : 'default' }}
                onClick={() => s.link && (window.location.href = s.link)}>
                <div className={`stat-icon-box ${s.colorClass}`}>
                  {s.icon}
                </div>
                <div className="stat-content">
                  <span className="stat-label">{s.label}</span>
                  <h2 className="stat-number">{s.value}</h2>
                </div>
              </div>
            ))
        }
      </div>

      <div className="dashboard-main-grid">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="card-body actions-list">
            {[
              { label: 'Manage Classes', desc: 'View and add your academic classes', link: '/classes', icon: <Layers size={18} /> },
              { label: 'Teaching Resources', desc: 'Access REB guides and materials', link: '/reference-materials', icon: <BookOpen size={18} /> },
              { label: 'My Profile', desc: 'Update your account settings', link: '/profile', icon: <LayoutGrid size={18} /> },
            ].map((a, i) => (
              <Link key={i} to={a.link} className="action-item">
                <div className="action-icon-box">
                  {a.icon}
                </div>
                <div className="action-content">
                  <div className="action-label">{a.label}</div>
                  <div className="action-desc">{a.desc}</div>
                </div>
                <ArrowRight size={16} className="action-arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Plans */}
        <div className="card">
          <div className="card-header header-between">
            <h3>Recent Lesson Plans</h3>
            <Link to="/classes" className="text-link-sm">View all</Link>
          </div>
          <div className="card-body no-padding">
            {plansLoading ? (
              <div className="skeleton-fade-in">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : recentPlans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-lucide">
                  <ClipboardList size={40} strokeWidth={1.5} />
                </div>
                <p className="empty-title">No plans yet</p>
                <p className="empty-desc">Create a class to generate your first lesson plan.</p>
                <Link to="/classes" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Create Class
                </Link>
              </div>
            ) : (
              <div className="recent-plans-list">
                {recentPlans.slice(0, 5).map((plan, i) => (
                  <div key={i} className="plan-item">
                    <div className="plan-dot" />
                    <div className="plan-info">
                      <div className="plan-title">{plan.lesson_title || plan.title || 'Lesson Plan'}</div>
                      <div className="plan-meta">
                        {plan.subject_name || plan.subject || ''}{plan.class_name ? ` · ${plan.class_name}` : ''}
                      </div>
                    </div>
                    <div className="plan-time">
                      <Clock size={12} />
                      {plan.created_at ? new Date(plan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Agent Tasks Widget */}
      <div className="card agent-tasks-card" style={{ marginTop: 'var(--sp-8)' }}>
        <div className="card-header header-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div className="agent-icon-box">
              <Bot size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>AI Agent Tasks</h3>
              {agentSummary?.stats && (
                <span className="agent-meta">
                  {agentSummary.stats.pending || 0} pending &middot; {agentSummary.stats.overdue || 0} overdue &middot; {agentSummary.stats.completed || 0} done
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Sparkles size={14} className="sparkles-icon" />
            <span style={{ fontSize: '0.7rem', color: 'var(--c-brand)', fontWeight: 700 }}>DLP AI</span>
          </div>
        </div>

        {/* DLP AI Summary */}
        {agentSummary?.summary && (
          <div className="agent-summary-banner">
            <Bot size={16} />
            <p>{agentSummary.summary}</p>
          </div>
        )}

        <div className="card-body no-padding">
          {agentLoading ? (
            <div className="skeleton-fade-in" style={{ padding: 'var(--sp-4)' }}>
              {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : agentTasks.filter(t => t.status !== 'completed').length === 0 ? (
            <div className="empty-state" style={{ minHeight: 'unset', padding: 'var(--sp-8)' }}>
              <CheckCircle size={36} color="#22c55e" strokeWidth={1.5} />
              <p className="empty-title" style={{ color: '#22c55e', fontSize: '1rem' }}>All caught up!</p>
              <p className="empty-desc" style={{ marginBottom: 0 }}>No pending tasks. The AI agent will assign new ones as you work.</p>
            </div>
          ) : (
            <div className="agent-task-list">
              {agentTasks.filter(t => t.status !== 'completed').map((task) => (
                <div key={task.id} className={`agent-task-item ${task.status === 'overdue' ? 'overdue' : ''}`}>
                  <div className={`task-status-dot ${task.status}`} />
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-desc">{task.description}</div>
                    {task.due_date && (
                      <div className="task-due">
                        <Clock size={11} />
                        Due {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {task.status === 'overdue' && <span className="overdue-badge"><AlertCircle size={10} /> Overdue</span>}
                      </div>
                    )}
                  </div>
                  <div className="task-actions">
                    <button className="task-btn complete" title="Mark complete" onClick={() => handleCompleteTask(task.id)}>
                      <CheckCircle size={15} />
                    </button>
                    <button className="task-btn dismiss" title="Dismiss" onClick={() => handleDismissTask(task.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      
      <style>{`
        .dashboard-header-flex { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-4); margin-bottom: var(--sp-6); }
        .dashboard-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--sp-4); margin-bottom: var(--sp-8); }
        
        .stat-card-premium { 
          background: var(--c-surface); 
          border: 1px solid var(--c-border-soft); 
          border-radius: var(--r-xl); 
          padding: var(--sp-5); 
          display: flex; 
          align-items: center; 
          gap: var(--sp-4); 
          transition: all var(--t-fast);
          box-shadow: var(--shadow-sm);
        }
        .stat-card-premium:hover { 
          transform: translateY(-2px); 
          box-shadow: var(--shadow-md); 
          border-color: var(--c-brand-light); 
        }
        
        .stat-icon-box { 
          width: 48px; 
          height: 48px; 
          border-radius: var(--r-lg); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0; 
        }
        .stat-icon-box.indigo { background: #e0e7ff; color: #4f46e5; }
        .stat-icon-box.blue { background: #dbeafe; color: #2563eb; }
        .stat-icon-box.orange { background: #ffedd5; color: #ea580c; }
        .stat-icon-box.green { background: #dcfce7; color: #16a34a; }
        .stat-icon-box.red { background: #fee2e2; color: #dc2626; }
        
        .stat-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .stat-number { font-size: 1.5rem; font-weight: 800; color: var(--c-text-primary); margin: 0; }
        
        .dashboard-main-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--sp-6); }
        .actions-list { display: flex; flex-direction: column; gap: var(--sp-3); padding: var(--sp-2) 0; }
        .action-item { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-3); border-radius: var(--r-md); transition: background var(--t-fast); color: inherit; text-decoration: none; }
        .action-item:hover { background: var(--c-surface-2); }
        .action-icon-box { width: 36px; height: 36px; border-radius: var(--r-md); background: var(--c-brand-light); color: var(--c-brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .action-label { fontWeight: 600; fontSize: 0.875rem; color: var(--c-text-primary); }
        .action-desc { fontSize: 0.75rem; color: var(--c-text-muted); margin-top: 2px; }
        .action-arrow { color: var(--c-text-muted); opacity: 0.5; transition: transform var(--t-fast); }
        .action-item:hover .action-arrow { transform: translateX(4px); opacity: 1; }
        .header-between { display: flex; align-items: center; justify-content: space-between; }
        .text-link-sm { font-size: 0.75rem; color: var(--c-brand); font-weight: 700; text-decoration: none; }
        .no-padding { padding: 0 !important; }
        .recent-plans-list { display: flex; flex-direction: column; }
        .plan-item { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--c-border-soft); }
        .plan-item:last-child { border-bottom: none; }
        .plan-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-brand); flex-shrink: 0; }
        .plan-info { flex: 1; min-width: 0; }
        .plan-title { font-size: 0.875rem; font-weight: 600; color: var(--c-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .plan-meta { font-size: 0.75rem; color: var(--c-text-muted); margin-top: 2px; }
        .plan-time { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--c-text-muted); flex-shrink: 0; }
        .upgrade-cta-card { margin-top: var(--sp-6); border: 2px solid var(--c-brand); background: var(--c-brand-light); }
        .upgrade-flex { display: flex; align-items: center; gap: var(--sp-6); flex-wrap: wrap; }
        .upgrade-content { flex: 1; min-width: 250px; }
        .upgrade-title { font-size: 1.125rem; font-weight: 800; color: var(--c-brand-dark); margin-bottom: 4px; }
        .upgrade-text { font-size: 0.875rem; color: var(--c-brand-dark); opacity: 0.8; }
        .btn-momo { box-shadow: 0 4px 12px rgba(var(--c-brand-rgb), 0.3); }
        .alert-link-btn { background: none; border: none; color: #92400e; font-weight: 700; text-decoration: underline; cursor: pointer; padding: 0; font: inherit; }
        .loading-state { padding: var(--sp-12); display: flex; justify-content: center; }
        .empty-state { padding: var(--sp-12); text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); min-height: 280px; justify-content: center; }
        .empty-icon-lucide { width: 64px; height: 64px; background: var(--c-surface-2); color: var(--c-text-muted); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: var(--sp-4); }
        .empty-title { font-weight: 700; color: var(--c-text-primary); font-size: 1.1rem; }
        .empty-desc { font-size: 0.875rem; color: var(--c-text-muted); margin-bottom: var(--sp-6); max-width: 240px; line-height: 1.5; }
        @media (max-width: 768px) {
          .dashboard-header-flex { flex-direction: column; align-items: stretch; gap: var(--sp-2); }
          .page-title { font-size: 1.5rem; }
          .dashboard-stats-grid { grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
          .stat-card-premium { padding: var(--sp-3); gap: var(--sp-2); flex-direction: column; text-align: center; }
          .stat-icon-box { width: 40px; height: 40px; }
          .stat-number { font-size: 1.25rem; }
          .upgrade-flex { flex-direction: column; text-align: center; }
          .btn-momo { width: 100%; }
        }
        @media (max-width: 480px) {
          .dashboard-stats-grid { grid-template-columns: 1fr; }
          .stat-card-premium { flex-direction: row; text-align: left; padding: var(--sp-4); gap: var(--sp-4); }
        }
        /* Agent tasks styles */
        .agent-tasks-card { overflow: hidden; }
        .agent-icon-box { width: 36px; height: 36px; background: linear-gradient(135deg, var(--c-brand-light), #e0e7ff); border-radius: var(--r-md); display: flex; align-items: center; justify-content: center; color: var(--c-brand); flex-shrink: 0; }
        .agent-meta { font-size: 0.7rem; color: var(--c-text-muted); display: block; margin-top: 1px; }
        .sparkles-icon { color: var(--c-brand); }
        .agent-summary-banner { display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-3) var(--sp-5); background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04)); border-bottom: 1px solid var(--c-border-soft); color: var(--c-brand); }
        .agent-summary-banner p { margin: 0; font-size: 0.8rem; color: var(--c-text-muted); font-style: italic; line-height: 1.5; }
        .agent-task-list { display: flex; flex-direction: column; }
        .agent-task-item { display: flex; align-items: flex-start; gap: var(--sp-4); padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--c-border-soft); transition: background var(--t-fast); }
        .agent-task-item:last-child { border-bottom: none; }
        .agent-task-item:hover { background: var(--c-surface-2); }
        .agent-task-item.overdue { background: rgba(239,68,68,0.03); }
        .task-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
        .task-status-dot.pending { background: #f59e0b; }
        .task-status-dot.in_progress { background: #3b82f6; }
        .task-status-dot.overdue { background: #ef4444; }
        .task-content { flex: 1; min-width: 0; }
        .task-title { font-size: 0.875rem; font-weight: 600; color: var(--c-text-primary); }
        .task-desc { font-size: 0.75rem; color: var(--c-text-muted); margin-top: 2px; line-height: 1.4; }
        .task-due { display: flex; align-items: center; gap: 4px; font-size: 0.68rem; color: var(--c-text-muted); margin-top: 4px; }
        .overdue-badge { display: flex; align-items: center; gap: 2px; background: #fef2f2; color: #ef4444; border-radius: 4px; padding: 1px 5px; font-weight: 700; margin-left: 4px; }
        .task-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .task-btn { border: none; cursor: pointer; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 6px; transition: all var(--t-fast); }
        .task-btn.complete { background: rgba(34,197,94,0.1); color: #22c55e; }
        .task-btn.complete:hover { background: rgba(34,197,94,0.2); transform: scale(1.05); }
        .task-btn.dismiss { background: rgba(239,68,68,0.08); color: #ef4444; }
        .task-btn.dismiss:hover { background: rgba(239,68,68,0.15); transform: scale(1.05); }
      `}</style>
    </div>
  );
}

