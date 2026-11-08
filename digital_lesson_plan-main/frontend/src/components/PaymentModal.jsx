import { useState, useRef } from 'react';
import { FiX, FiPhone, FiHash, FiUpload, FiCheck, FiAlertCircle, FiCopy, FiSmartphone } from 'react-icons/fi';
import { useSubscription, PLANS, PAYMENT_INFO } from '../context/SubscriptionContext';
import { toast } from 'react-toastify';

const steps = ['Select Plan', 'Send Payment', 'Confirm'];

export default function PaymentModal() {
  const { paymentModalOpen, closePaymentModal, selectedPlan, openPaymentModal, submitPaymentProof } = useSubscription();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(selectedPlan || 'standard');
  const [txId, setTxId] = useState('');
  const [phone, setPhone] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  if (!paymentModalOpen) return null;

  const selectedPlanInfo = PLANS[plan];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!', { autoClose: 1500 });
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setScreenshot(f);
  };

  const handleSubmit = async () => {
    if (!txId.trim() || !phone.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    const result = await submitPaymentProof({ planId: plan, transactionId: txId, phone, screenshot });
    setSubmitting(false);
    if (result.success) {
      setDone(true);
    }
  };

  const reset = () => {
    setStep(0); setTxId(''); setPhone(''); setScreenshot(null); setDone(false); setPlan('standard');
    closePaymentModal();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && reset()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Upgrade Your Plan</div>
            <div style={{ fontSize: '.8rem', color: 'var(--c-text-muted)', marginTop: 2 }}>
              Pay via MoMo — verification within 24h
            </div>
          </div>
          <button className="modal-close" onClick={reset}><FiX /></button>
        </div>

        <div className="modal-body">
          {done ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: 'var(--sp-8) 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--c-success-bg)', color: 'var(--c-success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--sp-5)',
                fontSize: '1.8rem',
              }}>
                <FiCheck />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--sp-3)' }}>
                Payment Proof Received!
              </h3>
              <p style={{ color: 'var(--c-text-secondary)', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 'var(--sp-6)' }}>
                Your <strong>{selectedPlanInfo?.name}</strong> subscription request is under review.
                You'll be notified within 5 to 8 minutes once confirmed.
              </p>
              <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: 'var(--sp-5)' }}>
                <FiAlertCircle />
                <span>Contact Roger (<strong>0780988783</strong>) or Honoré (<strong>0791684429</strong>) for faster activation.</span>
              </div>
              <button className="btn btn-primary btn-full" onClick={reset}>Got it</button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-6)' }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? '1' : undefined }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i <= step ? 'var(--c-brand)' : 'var(--c-surface-2)',
                      color: i <= step ? '#fff' : 'var(--c-text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.75rem', fontWeight: 700, flexShrink: 0,
                      transition: 'all var(--t-base)',
                    }}>
                      {i < step ? <FiCheck size={13} /> : i + 1}
                    </div>
                    <span style={{ fontSize: '.78rem', marginLeft: 6, color: i === step ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontWeight: i === step ? 600 : 400 }}>
                      {s}
                    </span>
                    {i < 2 && <div style={{ flex: 1, height: 1, background: i < step ? 'var(--c-brand)' : 'var(--c-border)', marginLeft: 8, marginRight: 4, transition: 'background var(--t-slow)' }} />}
                  </div>
                ))}
              </div>

              {/* Step 0: Select Plan */}
              {step === 0 && (
                <div>
                  <p style={{ fontSize: '.875rem', color: 'var(--c-text-secondary)', marginBottom: 'var(--sp-4)' }}>
                    Choose the plan that fits your teaching needs.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    {Object.values(PLANS).filter(p => p.id !== 'free').map(p => (
                      <label key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
                        padding: 'var(--sp-4)',
                        border: `2px solid ${plan === p.id ? 'var(--c-brand)' : 'var(--c-border)'}`,
                        borderRadius: 'var(--r-lg)',
                        cursor: 'pointer',
                        background: plan === p.id ? 'var(--c-brand-light)' : 'var(--c-surface)',
                        transition: 'all var(--t-base)',
                      }}>
                        <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} style={{ accentColor: 'var(--c-brand)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <strong style={{ fontSize: '.95rem' }}>{p.name}</strong>
                            {p.badge && <span className="badge badge-brand">{p.badge}</span>}
                          </div>
                          <div style={{ fontSize: '.8rem', color: 'var(--c-text-secondary)' }}>
                            {p.features.slice(0, 3).join(' · ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.price.toLocaleString()} RWF</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--c-text-muted)' }}>/{p.period}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-full" style={{ marginTop: 'var(--sp-5)' }} onClick={() => setStep(1)}>
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 1: Send payment */}
              {step === 1 && (
                <div>
                  <div className="alert alert-info" style={{ marginBottom: 'var(--sp-5)' }}>
                    <FiSmartphone />
                    <span>Send <strong>{selectedPlanInfo?.price?.toLocaleString()} RWF</strong> via MTN Mobile Money to any number below, then come back here to confirm.</span>
                  </div>

                  {/* MoMo code */}
                  <div style={{
                    background: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 'var(--r-lg)',
                    padding: 'var(--sp-5)',
                    marginBottom: 'var(--sp-4)',
                  }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 'var(--sp-3)' }}>
                      MoMo Code (Recommended)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '.1em', color: 'var(--c-brand)' }}>
                          *182*8*1*{PAYMENT_INFO.momo.code}#
                        </div>
                        <div style={{ fontSize: '.8rem', color: 'var(--c-text-secondary)', marginTop: 4 }}>
                          {PAYMENT_INFO.momo.name} — Code <strong>{PAYMENT_INFO.momo.code}</strong>
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(`*182*8*1*${PAYMENT_INFO.momo.code}#`)}>
                        <FiCopy size={13} /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Phone numbers */}
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 'var(--sp-2)' }}>
                    Assistance & Inquiry
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
                    {PAYMENT_INFO.contacts.map(c => (
                      <div key={c.phone} style={{
                        background: 'var(--c-surface-2)',
                        border: '1px solid var(--c-border)',
                        borderRadius: 'var(--r-md)',
                        padding: 'var(--sp-4)',
                        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--c-brand-light)', color: 'var(--c-brand)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontWeight: 700,
                        }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{c.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.8rem', color: 'var(--c-text-secondary)' }}>{c.phone}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                    <button className="btn btn-secondary" onClick={() => setStep(0)} style={{ flex: 1 }}>← Back</button>
                    <button className="btn btn-primary" onClick={() => setStep(2)} style={{ flex: 2 }}>I've Sent Payment →</button>
                  </div>
                </div>
              )}

              {/* Step 2: Confirm */}
              {step === 2 && (
                <div>
                  <p style={{ fontSize: '.875rem', color: 'var(--c-text-secondary)', marginBottom: 'var(--sp-5)' }}>
                    Provide your payment details so we can verify and activate your subscription.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <FiPhone size={12} style={{ marginRight: 4 }} />
                        Your Phone Number *
                      </label>
                      <input className="form-input" placeholder="e.g. 0780000000" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <FiHash size={12} style={{ marginRight: 4 }} />
                        MoMo Transaction ID *
                      </label>
                      <input className="form-input" placeholder="e.g. 1234567890" value={txId} onChange={e => setTxId(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
                      <span style={{ fontSize: '.75rem', color: 'var(--c-text-muted)' }}>Found in your MoMo confirmation SMS</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <FiUpload size={12} style={{ marginRight: 4 }} />
                        Screenshot (Optional)
                      </label>
                      <div
                        onClick={() => fileRef.current?.click()}
                        style={{
                          border: `2px dashed ${screenshot ? 'var(--c-brand)' : 'var(--c-border)'}`,
                          borderRadius: 'var(--r-md)',
                          padding: 'var(--sp-5)',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: screenshot ? 'var(--c-brand-light)' : 'var(--c-surface-2)',
                          transition: 'all var(--t-base)',
                        }}
                      >
                        <FiUpload style={{ marginBottom: 6, color: screenshot ? 'var(--c-brand)' : 'var(--c-text-muted)' }} />
                        <div style={{ fontSize: '.8rem', color: screenshot ? 'var(--c-brand)' : 'var(--c-text-muted)' }}>
                          {screenshot ? screenshot.name : 'Click to upload payment screenshot'}
                        </div>
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-6)' }}>
                    <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 2 }}>
                      {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting...</> : 'Submit Proof ✓'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
