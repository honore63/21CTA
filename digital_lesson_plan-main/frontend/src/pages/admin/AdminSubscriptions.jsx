import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiPhone, FiHash, FiRefreshCw, FiAlertCircle, FiEye, FiZap } from 'react-icons/fi';
import api from '../../services/api';
import { toast } from 'react-toastify';

const PLAN_COLORS = {
  free:     'badge-gray',
  standard: 'badge-blue',
  premium:  'badge-brand',
  pending:  'badge-amber',
  active:   'badge-green',
  expired:  'badge-red',
  cancelled:'badge-red',
};

export default function AdminSubscriptions() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  
  const [promo, setPromo] = useState({ active: false, endDate: '', label: '' });
  const [updatingPromo, setUpdatingPromo] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscription/admin/pending');
      setPending(res.data.subscriptions || []);
    } catch {
      toast.error('Failed to load pending subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPromo = async () => {
    try {
      const res = await api.get('/subscription/promo-status');
      if (res.data?.promo) {
        setPromo({
          active: res.data.promo.active,
          endDate: res.data.promo.endDate ? res.data.promo.endDate.split('T')[0] : '',
          label: res.data.promo.label || ''
        });
      }
    } catch {
      toast.error('Failed to fetch promo status');
    }
  };

  useEffect(() => {
    fetchPending();
    fetchPromo();
  }, []);

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    setUpdatingPromo(true);
    try {
      await api.post('/subscription/admin/promo', {
        active: promo.active,
        endDate: promo.endDate || null,
        label: promo.label || null
      });
      toast.success(promo.active ? 'Promo activated successfully' : 'Promo updated successfully');
      fetchPromo();
    } catch {
      toast.error('Failed to update promo settings');
    } finally {
      setUpdatingPromo(false);
    }
  };

  const activate = async (userId, plan) => {
    setActivating(userId);
    try {
      await api.post('/subscription/admin/activate', { userId, plan, months: 1 });
      toast.success(`Activated ${plan} plan for user ${userId}`);
      fetchPending();
    } catch {
      toast.error('Failed to activate subscription');
    } finally {
      setActivating(null);
    }
  };

  const reject = async (userId) => {
    if (!window.confirm('Reject and revert this user to Free plan?')) return;
    try {
      await api.post('/subscription/admin/activate', { userId, plan: 'free', months: 999 });
      toast.success('User reverted to Free plan');
      fetchPending();
    } catch {
      toast.error('Failed to reject subscription');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Subscription Requests</h1>
          <p className="page-subtitle">Review and activate pending MoMo payment submissions.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchPending}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Promo Mode Management Card */}
      <div className="card animate-fade" style={{ marginBottom: 'var(--sp-6)', borderLeft: promo.active ? '4px solid var(--c-brand)' : '4px solid var(--c-border)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiZap style={{ color: promo.active ? 'var(--c-accent)' : 'var(--c-text-muted)' }} />
              Promotional Access Override
            </h3>
            <p style={{ fontSize: '.8rem', color: 'var(--c-text-muted)', margin: '4px 0 0 0' }}>
              Instantly grant free VIP access to all users across the system. Original subscription statuses are preserved.
            </p>
          </div>
          <span className={`badge ${promo.active ? 'badge-brand' : 'badge-gray'}`}>
            {promo.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="card-body">
          <form onSubmit={handlePromoSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Promo Status</label>
              <div style={{ display: 'flex', gap: '12px', height: '40px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
                  <input
                    type="radio"
                    name="promoActive"
                    checked={promo.active === true}
                    onChange={() => setPromo(prev => ({ ...prev, active: true }))}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--c-brand)' }}
                  />
                  Active (Free VIP)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
                  <input
                    type="radio"
                    name="promoActive"
                    checked={promo.active === false}
                    onChange={() => setPromo(prev => ({ ...prev, active: false }))}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--c-brand)' }}
                  />
                  Inactive
                </label>
              </div>
            </div>

            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label" htmlFor="promoLabel">Promo Label / Name</label>
              <input
                id="promoLabel"
                type="text"
                className="form-input"
                placeholder="e.g. Term 1 Launch"
                value={promo.label}
                onChange={(e) => setPromo(prev => ({ ...prev, label: e.target.value }))}
                style={{ height: '40px' }}
              />
            </div>

            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label" htmlFor="promoEndDate">Expiration Date (Optional)</label>
              <input
                id="promoEndDate"
                type="date"
                className="form-input"
                value={promo.endDate}
                onChange={(e) => setPromo(prev => ({ ...prev, endDate: e.target.value }))}
                style={{ height: '40px' }}
              />
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatingPromo}
                style={{ height: '40px', padding: '0 24px' }}
              >
                {updatingPromo ? (
                  <span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                ) : 'Update Promo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-16)' }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : pending.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">No pending requests</div>
            <div className="empty-state-desc">All payment submissions have been processed.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {pending.map((sub) => (
            <div key={sub.user_id} className="card animate-fade">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
                  {/* User info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flex: 1, minWidth: 200 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--r-md)',
                      background: 'var(--c-brand-light)', color: 'var(--c-brand)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
                    }}>
                      {sub.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{sub.full_name}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--c-text-muted)' }}>{sub.email}</div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${PLAN_COLORS[sub.plan]}`}>{sub.plan}</span>
                        <span className={`badge ${PLAN_COLORS[sub.status]}`}>{sub.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                    {sub.payment_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.83rem', color: 'var(--c-text-secondary)' }}>
                        <FiPhone size={13} />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{sub.payment_phone}</span>
                      </div>
                    )}
                    {sub.transaction_id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.83rem', color: 'var(--c-text-secondary)' }}>
                        <FiHash size={13} />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{sub.transaction_id}</span>
                      </div>
                    )}
                    {sub.proof_screenshot && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', padding: '4px 8px' }}
                        onClick={() => setPreviewImg(`/uploads/payment-proofs/${sub.proof_screenshot}`)}
                      >
                        <FiEye size={13} /> View Screenshot
                      </button>
                    )}
                    <div style={{ fontSize: '.75rem', color: 'var(--c-text-muted)' }}>
                      Submitted: {sub.updated_at ? new Date(sub.updated_at).toLocaleString('en-GB') : '—'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0, alignItems: 'flex-start' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => reject(sub.user_id)}
                      disabled={activating === sub.user_id}
                      title="Reject — revert to Free"
                    >
                      <FiX size={13} /> Reject
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => activate(sub.user_id, sub.plan)}
                      disabled={activating === sub.user_id}
                    >
                      {activating === sub.user_id
                        ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Activating...</>
                        : <><FiCheck size={13} /> Activate {sub.plan}</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {previewImg && (
        <div className="modal-backdrop" onClick={() => setPreviewImg(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
            <img
              src={previewImg}
              alt="Payment proof"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-xl)' }}
            />
            <button
              onClick={() => setPreviewImg(null)}
              style={{
                position: 'absolute', top: -12, right: -12,
                width: 32, height: 32, borderRadius: '50%',
                background: '#fff', color: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--sh-md)',
              }}
            >
              <FiX />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
