/**
 * Skeleton / Ghost loading system
 * Provides shimmer placeholders that match the real UI layout exactly.
 */

import './Skeleton.css';

// ── Primitive shimmer block ─────────────────────────────────────────
export function SkeletonBox({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

// ── Stat card skeleton (matches stat-card-premium) ──────────────────
export function SkeletonStatCard() {
  return (
    <div className="stat-card-premium skeleton-card">
      <div className="skeleton-shimmer" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBox height={12} width="60%" />
        <SkeletonBox height={22} width="40%" />
      </div>
    </div>
  );
}

// ── Generic card skeleton ───────────────────────────────────────────
export function SkeletonCard({ lines = 3, showAvatar = false }) {
  return (
    <div className="auth-centered-card skeleton-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)' }}>
      {showAvatar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <SkeletonBox width={40} height={40} radius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBox height={13} width="50%" />
            <SkeletonBox height={11} width="30%" />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBox key={i} height={13} width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </div>
    </div>
  );
}

// ── List row skeleton (for table / plan list rows) ──────────────────
export function SkeletonRow() {
  return (
    <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--c-border-soft)' }}>
      <SkeletonBox width={44} height={44} radius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <SkeletonBox height={14} width="55%" />
        <SkeletonBox height={11} width="35%" />
      </div>
      <SkeletonBox width={80} height={30} radius={8} />
    </div>
  );
}

// ── Plan item skeleton (for AllLessonPlans page) ────────────────────
export function SkeletonPlanCard() {
  return (
    <div className="auth-centered-card skeleton-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <SkeletonBox width={56} height={56} radius={16} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBox height={16} width={220} />
            <div style={{ display: 'flex', gap: 12 }}>
              <SkeletonBox height={11} width={90} />
              <SkeletonBox height={11} width={80} />
              <SkeletonBox height={11} width={80} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SkeletonBox width={80} height={40} radius={10} />
          <SkeletonBox width={100} height={40} radius={10} />
          <SkeletonBox width={44} height={44} radius={12} />
        </div>
      </div>
    </div>
  );
}

// ── Admin stat card skeleton ────────────────────────────────────────
export function SkeletonAdminStat() {
  return (
    <div className="auth-centered-card skeleton-card" style={{ maxWidth: 'none', padding: 'var(--sp-6)', display: 'flex', alignItems: 'center', gap: 20 }}>
      <SkeletonBox width={56} height={56} radius={16} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBox height={12} width={120} />
        <SkeletonBox height={24} width={60} />
      </div>
    </div>
  );
}

// ── User directory row ──────────────────────────────────────────────
export function SkeletonUserRow() {
  return (
    <tr>
      <td><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkeletonBox width={36} height={36} radius={8} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <SkeletonBox height={12} width={120} />
          <SkeletonBox height={10} width={160} />
        </div>
      </div></td>
      <td><SkeletonBox height={22} width={60} radius={20} /></td>
      <td><SkeletonBox height={22} width={70} radius={20} /></td>
      <td><SkeletonBox height={22} width={80} radius={20} /></td>
      <td><div style={{ display: 'flex', gap: 6 }}>
        <SkeletonBox width={32} height={32} radius={8} />
        <SkeletonBox width={32} height={32} radius={8} />
        <SkeletonBox width={32} height={32} radius={8} />
      </div></td>
    </tr>
  );
}

// ── Modern Class card skeleton ──────────────────────────────────────
export function SkeletonClassCard() {
  return (
    <div className="skeleton-card" style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border-soft)',
      borderRadius: 'var(--r-2xl)',
      padding: 'var(--sp-4) var(--sp-5)',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkeletonBox width={36} height={36} radius={10} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBox height={16} width="60%" />
          <SkeletonBox height={10} width="30%" />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <SkeletonBox width={26} height={26} radius={6} />
          <SkeletonBox width={26} height={26} radius={6} />
        </div>
      </div>
      <SkeletonBox height={40} width="100%" radius={12} />
      <SkeletonBox height={38} width="100%" radius={10} style={{ marginTop: 'auto' }} />
    </div>
  );
}

// ── Modern Unit/Lesson card skeleton ────────────────────────────────
export function SkeletonUnitCard() {
  return (
    <div className="skeleton-card" style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border-soft)',
      borderRadius: 'var(--r-2xl)',
      padding: 'var(--sp-6)',
      minHeight: '240px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonBox width={80} height={24} radius={20} />
        <div style={{ display: 'flex', gap: 8 }}>
          <SkeletonBox width={34} height={34} radius={12} />
          <SkeletonBox width={34} height={34} radius={12} />
        </div>
      </div>
      <SkeletonBox height={24} width="85%" radius={4} />
      <div style={{ background: 'var(--c-surface-2)', padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBox height={8} width="30%" />
        <SkeletonBox height={12} width="100%" />
        <SkeletonBox height={12} width="100%" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <SkeletonBox height={32} width="30%" radius={8} />
        <SkeletonBox height={32} width="20%" radius={8} />
        <SkeletonBox height={32} width="20%" radius={8} />
      </div>
    </div>
  );
}

// ── Dashboard activity row (admin recent plans) ─────────────────────
export function SkeletonActivityRow() {
  return (
    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--c-border-soft)', borderRadius: 16, background: 'var(--c-bg)' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <SkeletonBox width={40} height={40} radius={12} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBox height={14} width={160} />
          <SkeletonBox height={11} width={100} />
        </div>
      </div>
      <SkeletonBox width={70} height={26} radius={8} />
    </div>
  );
}

// ── Convenience: grid of N skeletons ────────────────────────────────
export function SkeletonGrid({ count = 4, component: Component = SkeletonCard, gridStyle = {} }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-4)', ...gridStyle }}>
      {Array.from({ length: count }).map((_, i) => <Component key={i} />)}
    </div>
  );
}

export default SkeletonBox;
