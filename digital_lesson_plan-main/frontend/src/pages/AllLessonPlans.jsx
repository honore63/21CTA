import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
    FileText, Download, Eye, Calendar, 
    BookOpen, Layers, Search, Filter,
    ChevronRight, Clock, Trash2, Printer
} from 'lucide-react';
import api, { invalidateCache } from '../services/api';
import { useApiCache } from '../hooks/useApiCache';
import { SkeletonPlanCard } from '../components/Skeleton';
import './AuthPages.css';
import './LessonPlan.css';

const AllLessonPlans = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');

    const { data: rawPlans, loading, refetch } = useApiCache('/lesson-plans/all');
    const plans = Array.isArray(rawPlans) ? rawPlans : [];

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this lesson plan?')) return;
        try {
            await api.delete(`/lesson-plans/${id}`);
            invalidateCache('lesson-plans');
            refetch();
            toast.success('Lesson plan deleted');
        } catch (error) {
            toast.error('Failed to delete lesson plan');
        }
    };

    const filteredPlans = plans.filter(plan => {
        const matchesSearch = plan.lesson_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            plan.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            plan.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = filterSubject === 'all' || plan.subject_name === filterSubject;
        return matchesSearch && matchesSubject;
    });

    const uniqueSubjects = ['all', ...new Set(plans.map(p => p.subject_name))];

    if (loading) {
        return (
            <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', paddingBottom: 'var(--sp-12)' }}>
                <div className="dashboard-container" style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--sp-8)' }}>
                    <div style={{ marginBottom: 'var(--sp-8)' }}>
                        <div className="skeleton-shimmer" style={{ height: 36, width: 280, borderRadius: 10, marginBottom: 8 }} />
                        <div className="skeleton-shimmer" style={{ height: 16, width: 400, borderRadius: 8 }} />
                    </div>
                    <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', marginBottom: 'var(--sp-8)' }}>
                        <div className="skeleton-shimmer" style={{ height: 48, borderRadius: 10 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonPlanCard key={i} />)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen animate-fade" style={{ background: 'var(--c-bg)', paddingBottom: 'var(--sp-12)' }}>
            <div className="dashboard-container" style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--sp-8)' }}>
                
                <div style={{ marginBottom: 'var(--sp-8)' }}>
                    <h1 className="auth-title-large" style={{ fontSize: '2.25rem', marginBottom: 'var(--sp-2)' }}>All Lesson Plans</h1>
                    <p className="auth-subtitle-soft">Manage, view, and download all your generated lesson plans in one place.</p>
                </div>

                {/* Filters Card */}
                <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', marginBottom: 'var(--sp-8)' }}>
                    <div className="lesson-filter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 'var(--sp-4)', alignItems: 'center' }}>
                        <div className="vibrant-input-group has-icon" style={{ position: 'relative' }}>
                            <Search size={18} className="input-icon" />
                            <input 
                                type="text" 
                                className="vibrant-input" 
                                style={{ width: '100%', height: 48, background: 'var(--c-bg)' }}
                                placeholder="Search by title, class, or subject..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="vibrant-input-group has-icon" style={{ position: 'relative' }}>
                            <Filter size={18} className="input-icon" />
                            <select 
                                className="vibrant-input" 
                                style={{ width: '100%', height: 48, background: 'var(--c-bg)' }}
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                            >
                                {uniqueSubjects.map(s => (
                                    <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Plans List */}
                <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                    {filteredPlans.length > 0 ? (
                        filteredPlans.map(plan => (
                            <div key={plan.id} className="auth-centered-card plan-item-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', transition: 'all 0.2s', border: '1.5px solid transparent' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'center' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--c-brand-light)', color: 'var(--c-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FileText size={28} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: 4 }}>{plan.lesson_title}</h3>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                                                    <BookOpen size={14} /> {plan.subject_name}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                                                    <Layers size={14} /> {plan.class_name}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                                                    <Calendar size={14} /> {new Date(plan.teaching_date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="plan-item-actions" style={{ display: 'flex', gap: 12 }}>
                                        <button 
                                            onClick={() => navigate(`/lessons/${plan.lesson_id}/plan`)}
                                            className="vibrant-secondary-btn"
                                            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.875rem', gap: 8 }}
                                        >
                                            <Eye size={16} /> View
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/lessons/${plan.lesson_id}/plan`)}
                                            className="vibrant-submit-btn"
                                            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.875rem', gap: 8 }}
                                        >
                                            <Download size={16} /> Download
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(plan.id)}
                                            className="vibrant-back-link"
                                            style={{ background: '#fef2f2', color: '#dc2626', width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: 'none' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="auth-centered-card" style={{ maxWidth: 'none', padding: 'var(--sp-12)', textAlign: 'center' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-6)' }}>
                                <FileText size={32} style={{ color: 'var(--c-text-muted)' }} />
                            </div>
                            <h3 style={{ color: 'var(--c-text-primary)', marginBottom: 8 }}>No lesson plans found</h3>
                            <p style={{ color: 'var(--c-text-muted)' }}>You haven't generated any lesson plans yet, or they don't match your search.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .plan-item-card:hover {
                    border-color: var(--c-brand) !important;
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }
            `}</style>
        </div>
    );
};

export default AllLessonPlans;
