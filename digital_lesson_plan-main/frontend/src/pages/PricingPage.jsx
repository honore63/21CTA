import React from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Check, Zap, Star, Phone, Crown, CreditCard, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSubscription, PLANS, PAYMENT_INFO } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import './PricingPage.css';

const PricingPage = () => {
  const navigate = useNavigate();
  const { openPaymentModal, currentPlan, isActive } = useSubscription();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    const planId = searchParams.get('plan');
    if (planId && isAuthenticated) {
      openPaymentModal(planId);
    }
  }, [searchParams, isAuthenticated, openPaymentModal]);

  const icons = { 
    free: <Zap size={20} />, 
    basic: <CreditCard size={20} />,
    standard: <Star size={20} />, 
    vip: <Crown size={20} /> 
  };

  const handleSelect = (planId) => {
    if (planId === 'free') {
      navigate(isAuthenticated ? '/dashboard' : '/register');
      return;
    }
    if (!isAuthenticated) {
      // User must log in first, then come back here to finish payment
      navigate(`/register?redirectTo=/pricing&plan=${planId}`);
      return;
    }
    openPaymentModal(planId);
  };

  const isCurrentPlan = (planId) => isActive && currentPlan?.id === planId;

  return (
    <div className="pricing-page-root">
      <PublicNavbar />
      
      <main className="pricing-container animate-fade">
        {/* Header Section */}
        <header className="pricing-header">
          <span className="badge badge-brand-soft animate-slide-up">
            Certified REB CBC Curriculum Aligned
          </span>
          <h1 className="pricing-title animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Elevate Your <span className="text-gradient">Teaching Quality</span>
          </h1>
          <p className="pricing-subtitle animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Join 1,200+ Rwandan educators saving 10+ hours every week. 
            Select the plan that powers your professional growth.
          </p>
        </header>

        {/* Pricing Grid */}
        <div className="pricing-grid">
          {Object.values(PLANS).map((plan, idx) => {
            const active = isCurrentPlan(plan.id);
            const highlighted = plan.id === 'vip';
            const isStandard = plan.id === 'standard';
            
            return (
              <div
                key={plan.id}
                className={`pricing-card ${highlighted ? 'highlighted' : ''} ${isStandard ? 'standard' : ''} animate-slide-up`}
                style={{ animationDelay: `${0.1 * (idx + 3)}s` }}
              >
                {plan.badge && (
                  <div className="plan-badge">{plan.badge}</div>
                )}

                <div className="card-top">
                  <div className="plan-icon-box" style={{ background: highlighted ? 'var(--c-brand)' : 'var(--c-surface-2)', color: highlighted ? '#fff' : 'var(--c-brand)' }}>
                    {icons[plan.id]}
                  </div>
                  <div className="plan-meta">
                    <h3 className="plan-name">{plan.name}</h3>
                    {active && <span className="active-tag">Current Plan</span>}
                  </div>
                </div>

                <div className="plan-pricing">
                  {plan.price === 0 ? (
                    <div className="price-amount">Free</div>
                  ) : (
                    <div className="price-display">
                      <span className="currency">RWF</span>
                      <span className="amount">{plan.price.toLocaleString()}</span>
                      {plan.period !== 'one-time' && <span className="period">/{plan.period}</span>}
                    </div>
                  )}
                </div>

                <ul className="plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="feature-item">
                      <Check size={16} className="check-icon" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`btn btn-lg ${highlighted ? 'btn-primary' : 'btn-outline-brand'} plan-cta`}
                  onClick={() => handleSelect(plan.id)}
                  disabled={active}
                >
                  {active ? 'Current active plan' : plan.price === 0 ? 'Start for Free' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* MoMo Payment Section */}
        <section className="momo-section animate-slide-up">
          <div className="momo-card">
            <div className="momo-card-header">
              <div className="momo-icon-wrapper">
                <Phone size={24} />
              </div>
              <div className="momo-header-text">
                <h3>Instant MoMo Activation</h3>
                <p>Simple, secure, and made for Rwandan educators.</p>
              </div>
              <div className="secure-badge">
                <ShieldCheck size={16} /> 100% Secure
              </div>
            </div>

            <div className="momo-details-grid">
              <div className="momo-step-box">
                <span className="step-label">USSD Quick Pay</span>
                <code className="momo-ussd">*182*8*1*{PAYMENT_INFO.momo.code}#</code>
                <span className="momo-entity">{PAYMENT_INFO.momo.name}</span>
              </div>

              <div className="momo-support-box">
                <span className="step-label">Need assistance?</span>
                <div className="contact-links">
                  {PAYMENT_INFO.contacts.map(c => (
                    <a key={c.phone} href={`tel:${c.phone}`} className="contact-link">
                      <span className="contact-name">{c.name}:</span>
                      <span className="contact-phone">{c.phone}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="momo-footer">
              <p>Activation usually takes 5-15 minutes. Contact us via WhatsApp for instant confirmation.</p>
              <button className="btn btn-primary btn-momo-cta" onClick={() => openPaymentModal('standard')}>
                Proceed to Payment <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* School Inquiry */}
        <footer className="pricing-page-footer">
          <p>Looking for a multi-teacher school license?</p>
          <Link to="/contact" className="contact-trigger">Contact our Institutional Sales team</Link>
        </footer>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
