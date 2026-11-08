import { useState, useEffect } from 'react';
import { 
    Eye, Users, Monitor, Smartphone, Tablet, 
    TrendingUp, Calendar, Globe, ArrowUpRight,
    MapPin, Clock, Trash2, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import './VisitorsPage.css';

const VisitorsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/visitors');
            setData(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleClearLogs = async () => {
        if (!window.confirm('Are you sure you want to WIPE ALL traffic logs? This action cannot be undone.')) {
            return;
        }

        setClearing(true);
        try {
            const res = await api.delete('/visitors');
            toast.success(res.data.message);
            fetchData();
        } catch (error) {
            toast.error('Failed to clear traffic logs');
        } finally {
            setClearing(false);
        }
    };

    const deviceIcon = (type) => {
        if (type === 'mobile') return <Smartphone size={16} />;
        if (type === 'tablet') return <Tablet size={16} />;
        return <Monitor size={16} />;
    };

    if (loading) return (
        <div className="admin-loading-container animate-fade">
            <div className="spinner" />
        </div>
    );

    const { summary, topPages, deviceStats, dailyVisits, recentVisits, browserStats } = data || {};

    return (
        <div className="visitors-page-container animate-fade">
            <div className="admin-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--sp-8)' }}>
                <div>
                    <h1 className="admin-page-title">Visitor Analytics</h1>
                    <p className="admin-page-subtitle">Real-time insights into platform traffic and user engagement.</p>
                </div>
                <button 
                    onClick={handleClearLogs}
                    disabled={clearing || !data?.summary?.totalVisits}
                    className="vibrant-secondary-btn"
                    style={{ 
                        width: 'auto', 
                        background: '#fef2f2', 
                        color: '#dc2626', 
                        borderColor: '#fee2e2',
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {clearing ? <RefreshCw size={18} className="spinner" /> : <Trash2 size={18} />}
                    {clearing ? 'Wiping Logs...' : 'Wipe All Logs'}
                </button>
            </div>

            {/* Stats Overview */}
            <div className="stats-dashboard-grid">
                <div className="stat-card-premium">
                    <div className="stat-icon-box blue">
                        <Eye size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Views</span>
                        <h2 className="stat-number">{summary?.totalVisits?.toLocaleString() || '0'}</h2>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon-box green">
                        <Calendar size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Today</span>
                        <h2 className="stat-number">{summary?.todayVisits?.toLocaleString() || '0'}</h2>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon-box indigo">
                        <Users size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Unique IPs</span>
                        <h2 className="stat-number">{summary?.uniqueIPs?.toLocaleString() || '0'}</h2>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon-box orange">
                        <TrendingUp size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Pages / User</span>
                        <h2 className="stat-number">
                            {summary?.totalVisits && summary?.uniqueIPs
                                ? (summary.totalVisits / summary.uniqueIPs).toFixed(1)
                                : '0.0'}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Traffic Chart */}
            <div className="card chart-card-premium">
                <div className="card-header-flex">
                    <h3><TrendingUp size={18} /> Daily Traffic Trend</h3>
                    <span className="badge badge-brand">Last 30 Days</span>
                </div>
                <div className="chart-scroll-wrapper">
                    <div className="visitors-bar-chart">
                        {dailyVisits?.length > 0
                            ? (() => {
                                const max = Math.max(...dailyVisits.map(d => d.visits), 1);
                                return dailyVisits.map((d, i) => (
                                    <div key={i} className="bar-column">
                                        <div className="bar-tooltip">{d.visits} views</div>
                                        <div
                                            className="bar-fill"
                                            style={{ height: `${Math.max(6, (d.visits / max) * 140)}px` }}
                                        />
                                        <span className="bar-date">
                                            {new Date(d.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                ));
                            })()
                            : <div className="empty-state">No traffic data recorded yet.</div>
                        }
                    </div>
                </div>
            </div>

            <div className="analysis-split-grid">
                {/* Top Pages */}
                <div className="card">
                    <div className="card-header-flex">
                        <h3><Globe size={18} /> Most Visited Pages</h3>
                    </div>
                    <div className="data-list-premium">
                        {topPages?.map((p, i) => (
                            <div key={i} className="data-list-item">
                                <span className="item-rank">0{i + 1}</span>
                                <span className="item-main-text">{p.page_path}</span>
                                <div className="item-value-box">
                                    <span className="item-count">{p.visits.toLocaleString()}</span>
                                    <ArrowUpRight size={14} className="trend-up" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="device-analysis-group">
                    <div className="card">
                        <div className="card-header-flex">
                            <h3><Monitor size={18} /> Device Share</h3>
                        </div>
                        <div className="data-list-premium">
                            {deviceStats?.map((d, i) => (
                                <div key={i} className="data-list-item">
                                    <div className="item-icon-circle">{deviceIcon(d.device)}</div>
                                    <span className="item-main-text capitalize">{d.device || 'Desktop'}</span>
                                    <span className="item-count">{d.count.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="card">
                        <div className="card-header-flex">
                            <h3><Globe size={18} /> Top Browsers</h3>
                        </div>
                        <div className="data-list-premium">
                            {browserStats?.slice(0, 5).map((b, i) => (
                                <div key={i} className="data-list-item">
                                    <span className="item-rank">#{i + 1}</span>
                                    <span className="item-main-text">{b.browser}</span>
                                    <span className="item-count">{b.count.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="card table-card-premium">
                <div className="card-header-flex">
                    <h3><Clock size={18} /> Recent Visit Log</h3>
                </div>
                <div className="table-responsive-wrapper">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Identity / IP</th>
                                <th>Target Page</th>
                                <th>Environment</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentVisits?.map(v => (
                                <tr key={v.id}>
                                    <td>
                                        <div className="ip-display">
                                            <MapPin size={12} />
                                            <code>{v.ip_address}</code>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="page-link-tag">{v.page_path}</span>
                                    </td>
                                    <td>
                                        <div className="env-info">
                                            {deviceIcon(v.device)}
                                            <span>{v.os} · {v.browser}</span>
                                        </div>
                                    </td>
                                    <td className="time-cell">
                                        {new Date(v.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default VisitorsPage;
