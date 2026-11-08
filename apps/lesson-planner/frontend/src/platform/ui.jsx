import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, X
} from 'lucide-react';
import platform from '../services/platformApi';
import './ui.css';

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

export const formatTime = (value) => (value ? String(value).slice(0, 5) : '—');

export const initials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const titleCase = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* ------------------------------------------------------------------ */
/* API hook                                                            */
/* ------------------------------------------------------------------ */

export const useApi = (loader, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(loader)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = () => setTick((n) => n + 1);
  return { data, loading, error, reload, setData };
};

/* ------------------------------------------------------------------ */
/* Primitive components                                                */
/* ------------------------------------------------------------------ */

export const Spinner = ({ label }) => (
  <div className="pf-spinner" role="status">
    <Loader2 size={22} className="pf-spin" />
    {label ? <span>{label}</span> : null}
  </div>
);

export const Alert = ({ tone = 'error', children }) => {
  if (!children) return null;
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle;
  return (
    <div className={`pf-alert pf-alert--${tone}`}>
      <Icon size={17} />
      <span>{children}</span>
    </div>
  );
};

const STATUS_TONE = {
  active: 'success', approved: 'success', present: 'success', completed: 'success',
  published: 'info', submitted: 'info', borrowed: 'info', pending: 'warning',
  draft: 'neutral', late: 'warning', excused: 'warning', overdue: 'danger',
  absent: 'danger', rejected: 'danger', suspended: 'danger', locked: 'neutral',
  inactive: 'neutral', returned: 'neutral', enrolled: 'info', high: 'warning', urgent: 'danger'
};

export const Badge = ({ value, children, tone }) => (
  <span className={`pf-badge pf-badge--${tone || STATUS_TONE[value] || 'neutral'}`}>
    {children ?? titleCase(value)}
  </span>
);

export const Card = ({ children, className = '', title, subtitle, action, padded = true }) => (
  <section className={`pf-card ${padded ? 'pf-card--padded' : ''} ${className}`}>
    {(title || action) ? (
      <header className="pf-card__head">
        <div>
          {title ? <h3 className="pf-card__title">{title}</h3> : null}
          {subtitle ? <p className="pf-card__subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </header>
    ) : null}
    {children}
  </section>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <header className="pf-page-head">
    <div>
      <h1 className="pf-page-title">{title}</h1>
      {subtitle ? <p className="pf-page-subtitle">{subtitle}</p> : null}
    </div>
    {actions ? <div className="pf-page-actions">{actions}</div> : null}
  </header>
);

export const StatCard = ({ label, value, hint, icon: Icon, tone = 'brand' }) => (
  <div className={`pf-stat pf-stat--${tone}`}>
    <div className="pf-stat__body">
      <span className="pf-stat__label">{label}</span>
      <span className="pf-stat__value">{value ?? '—'}</span>
      {hint ? <span className="pf-stat__hint">{hint}</span> : null}
    </div>
    {Icon ? <span className="pf-stat__icon"><Icon size={20} /></span> : null}
  </div>
);

export const EmptyState = ({ title, hint, action }) => (
  <div className="pf-empty">
    <div className="pf-empty__dot" />
    <p className="pf-empty__title">{title}</p>
    {hint ? <p className="pf-empty__hint">{hint}</p> : null}
    {action}
  </div>
);

export const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, ...props }) => (
  <button className={`pf-btn pf-btn--${variant} pf-btn--${size}`} {...props}>
    {Icon ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
    {children}
  </button>
);

export const IconButton = ({ label, icon: Icon, ...props }) => (
  <button className="pf-icon-btn" title={label} aria-label={label} {...props}>
    <Icon size={16} />
  </button>
);

export const Field = ({ label, hint, required, children, span = 1 }) => (
  <label className="pf-field" style={{ gridColumn: `span ${span}` }}>
    <span className="pf-field__label">
      {label}{required ? <em> *</em> : null}
    </span>
    {children}
    {hint ? <span className="pf-field__hint">{hint}</span> : null}
  </label>
);

export const Input = (props) => <input className="pf-input" {...props} />;
export const Select = ({ children, ...props }) => <select className="pf-input" {...props}>{children}</select>;
export const Textarea = (props) => <textarea className="pf-input pf-textarea" rows={3} {...props} />;

export const Modal = ({ open, title, onClose, children, footer, wide = false }) => {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`pf-modal ${wide ? 'pf-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="pf-modal__head">
          <h2>{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </header>
        <div className="pf-modal__body">{children}</div>
        {footer ? <footer className="pf-modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
};

export const DataTable = ({ columns, rows, loading, emptyTitle, emptyHint, rowKey = 'id', onRowClick }) => {
  if (loading) return <Spinner label="Loading…" />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle || 'No records found'} hint={emptyHint} />;
  return (
    <div className="pf-table-wrap">
      <table className="pf-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}
                  className={col.align ? `pf-align-${col.align}` : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[rowKey] ?? index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'pf-table__row--clickable' : undefined}>
              {columns.map((col) => (
                <td key={col.key} className={col.align ? `pf-align-${col.align}` : undefined}>
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Pagination = ({ page, pages, total, onPage, t }) => {
  if (!pages || pages <= 1) {
    return total !== undefined ? (
      <p className="pf-pagination__total">{total} {(t && t('common.rows')) || 'rows'}</p>
    ) : null;
  }
  return (
    <div className="pf-pagination">
      <span className="pf-pagination__total">
        {t ? t('common.page') : 'Page'} {page} {t ? t('common.of') : 'of'} {pages}
        {total !== undefined ? ` · ${total} ${t ? t('common.rows') : 'rows'}` : ''}
      </span>
      <div className="pf-pagination__buttons">
        <Button variant="ghost" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {t ? t('common.previous') : 'Previous'}
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {t ? t('common.next') : 'Next'}
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Charts (dependency-free, accessible)                                */
/* ------------------------------------------------------------------ */

export const BarList = ({ items, valueFormatter = (v) => v, max, tone = 'brand', emptyLabel }) => {
  const top = max || Math.max(1, ...(items || []).map((i) => Number(i.value) || 0));
  if (!items || items.length === 0) {
    return <p className="pf-muted">{emptyLabel || 'No data available yet.'}</p>;
  }
  return (
    <ul className="pf-bars">
      {items.map((item, index) => {
        const value = Number(item.value) || 0;
        return (
          <li key={`${item.label}-${index}`} className="pf-bars__item">
            <div className="pf-bars__meta">
              <span className="pf-bars__label">{item.label}</span>
              <span className="pf-bars__value">{valueFormatter(value)}</span>
            </div>
            <div className="pf-bars__track">
              <div className={`pf-bars__fill pf-bars__fill--${tone}`}
                   style={{ width: `${Math.min(100, Math.round((value / top) * 100))}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export const Donut = ({ items, total }) => {
  const sum = total || items?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0;
  if (!items || items.length === 0 || sum === 0) {
    return <p className="pf-muted">No data available yet.</p>;
  }
  const palette = ['#1a6b5a', '#2a8a73', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#0891b2', '#65a30d'];
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = (cursor / sum) * 100;
    cursor += Number(item.value) || 0;
    const end = (cursor / sum) * 100;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });
  return (
    <div className="pf-donut-wrap">
      <div className="pf-donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
        <div className="pf-donut__hole">
          <strong>{sum}</strong>
          <span>total</span>
        </div>
      </div>
      <ul className="pf-legend">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <span className="pf-legend__dot" style={{ background: palette[index % palette.length] }} />
            <span className="pf-legend__label">{item.label}</span>
            <span className="pf-legend__value">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const Progress = ({ value, tone = 'brand' }) => (
  <div className="pf-progress" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} role="progressbar">
    <div className={`pf-progress__fill pf-progress__fill--${tone}`}
         style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} />
  </div>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="pf-tabs" role="tablist">
    {tabs.map((tab) => (
      <button key={tab.value} role="tab" aria-selected={value === tab.value}
              className={`pf-tab ${value === tab.value ? 'is-active' : ''}`}
              onClick={() => onChange(tab.value)}>
        {tab.icon ? <tab.icon size={15} /> : null}
        {tab.label}
        {tab.count !== undefined ? <span className="pf-tab__count">{tab.count}</span> : null}
      </button>
    ))}
  </div>
);

export const SectionGrid = ({ children, cols = 2 }) => (
  <div className="pf-grid" style={{ '--pf-cols': cols }}>{children}</div>
);

export const useDebounced = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const StatusFilter = ({ value, onChange, options, allLabel }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Status filter">
    <option value="">{allLabel || 'All statuses'}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </Select>
);

export const useLookup = (resource, params = { limit: 200 }) => {
  const key = JSON.stringify(params);
  const { data } = useApi(() => platform.list(resource, params), [resource, key]);
  return data?.data || [];
};

export const SummaryRow = ({ label, value }) => (
  <div className="pf-summary-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = (message, tone = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };
  const node = toast ? <div className={`pf-toast pf-toast--${toast.tone}`}>{toast.message}</div> : null;
  return { show, node };
};
