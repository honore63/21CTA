import React, { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DEFAULT_PALETTE = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
];

export default function ChartWidget({ chartData, title: propTitle }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !chartData) return;

        // Destroy previous instance if exists
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const isDark = document.body.getAttribute('data-theme') === 'dark' ||
                       window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

        const rawType = (chartData.type || 'bar').toLowerCase();
        const supportedTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polararea'];
        const type = supportedTypes.includes(rawType) ? rawType : 'bar';

        let data = chartData.data || {};
        let labels = data.labels || [];
        let datasets = data.datasets || [];

        // If simple format: values or y provided
        if (datasets.length === 0 && (data.values || data.y || Array.isArray(chartData.data))) {
            const values = data.values || data.y || chartData.data;
            datasets = [{
                label: chartData.title || propTitle || 'Data Metrics',
                data: values,
                backgroundColor: ['pie', 'doughnut', 'polararea'].includes(type)
                    ? DEFAULT_PALETTE.slice(0, (values || []).length)
                    : (type === 'line' ? 'rgba(59, 130, 246, 0.2)' : '#3b82f6'),
                borderColor: '#3b82f6',
                borderWidth: type === 'line' ? 2 : 1,
                fill: type === 'line',
                tension: 0.3
            }];
        } else {
            // Ensure colors are present
            datasets = datasets.map((ds, idx) => {
                const color = DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
                return {
                    ...ds,
                    backgroundColor: ds.backgroundColor || (
                        ['pie', 'doughnut', 'polararea'].includes(type)
                            ? DEFAULT_PALETTE.slice(0, (ds.data || []).length)
                            : (type === 'line' ? 'rgba(59, 130, 246, 0.2)' : color)
                    ),
                    borderColor: ds.borderColor || color,
                    borderWidth: ds.borderWidth || (type === 'line' ? 2 : 1),
                    fill: type === 'line' ? (ds.fill ?? true) : false,
                    tension: ds.tension ?? 0.3
                };
            });
        }

        const isCartesian = ['bar', 'line'].includes(type);

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: ['pie', 'doughnut', 'polararea'].includes(type) || datasets.length > 1,
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: { family: 'Inter, system-ui, sans-serif', size: 12 },
                        padding: 12,
                        boxWidth: 12
                    }
                },
                title: {
                    display: !!(chartData.title || propTitle),
                    text: chartData.title || propTitle || '',
                    color: textColor,
                    font: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '600' },
                    padding: { top: 6, bottom: 12 }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    titleColor: isDark ? '#f8fafc' : '#0f172a',
                    bodyColor: isDark ? '#cbd5e1' : '#334155',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 4,
                    cornerRadius: 8
                }
            },
            scales: isCartesian ? {
                x: {
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { color: gridColor },
                    beginAtZero: true
                }
            } : undefined
        };

        try {
            chartInstanceRef.current = new ChartJS(canvasRef.current, {
                type,
                data: { labels, datasets },
                options
            });
        } catch (err) {
            console.error('Failed to initialize Chart.js canvas:', err);
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [chartData, propTitle]);

    if (!chartData) return null;

    return (
        <div 
            className="ai-chart-widget-card" 
            style={{
                background: 'var(--ai-chart-bg, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--ai-border, rgba(255, 255, 255, 0.1))',
                borderRadius: '12px',
                padding: '14px',
                margin: '12px 0',
                width: '100%',
                maxWidth: '100%',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
            }}
        >
            <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}
