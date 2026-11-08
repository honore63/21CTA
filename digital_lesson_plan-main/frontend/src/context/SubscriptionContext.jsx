import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SubscriptionContext = createContext(null);

// Plan definitions
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    currency: 'RWF',
    period: '12h',
    lessonPlansPerDay: 2,
    totalPlans: 2,
    features: [
      '2 lesson plans / 12h',
      'REB-aligned generation',
      'Basic PDF export',
      'Community support',
    ],
    badge: null,
  },
  basic: {
    id: 'basic',
    name: 'Basic Top-up',
    price: 200,
    currency: 'RWF',
    period: 'one-time',
    lessonPlansPerDay: 5,
    totalPlans: 5,
    features: [
      '5 extra lesson plans',
      'One-time payment',
      'MTN MoMo supported',
      'Immediate activation',
    ],
    badge: 'Cheap & Easy',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 3000,
    currency: 'RWF',
    period: 'month',
    lessonPlansPerDay: 10,
    totalPlans: Infinity,
    features: [
      '10 lesson plans / day',
      'Unlimited subject access',
      'Advanced 5Es formatting',
      'Priority support',
      'Pedagogy assistant',
    ],
    badge: 'Most Popular',
  },
  vip: {
    id: 'vip',
    name: 'VIP Pro',
    price: 5000,
    currency: 'RWF',
    period: 'month',
    lessonPlansPerDay: Infinity,
    totalPlans: Infinity,
    features: [
      'Unlimited lesson plans',
      'Batch AI generation',
      'Edit lesson plans on-site',
      'Dedicated AI Agent',
      'Early access to tools',
    ],
    badge: 'Best for Experts',
    canBatchAI: true,
    canEditOnSite: true,
  },
};

// Payment details
export const PAYMENT_INFO = {
  momo: {
    code: '752264',
    name: 'Honoré',
  },
  contacts: [
    { name: 'Roger', phone: '0780988783', primary: true },
    { name: 'Honoré', phone: '0791684429', primary: false },
  ],
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState({ plan: 'vip', status: 'active', plans_used_today: 0, total_plans_used: 0, promo_override: true });
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchSubscription = useCallback(async () => {
    setSubscription({ plan: 'vip', status: 'active', plans_used_today: 0, total_plans_used: 0, promo_override: true });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const openPaymentModal = (planId) => {
    // Payment disabled/removed, do not open modal
    setPaymentModalOpen(false);
    setSelectedPlan(null);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedPlan(null);
  };

  const submitPaymentProof = async ({ planId, transactionId, phone, screenshot }) => {
    return { success: true };
  };

  // Force VIP plan details and active status globally
  const promoActive = true;
  const promoEndDate = null;
  const promoLabel = 'VIP Unlocked';

  const isPaidActive = true;
  const effectivePlanId = 'vip';
  
  const currentPlan = PLANS.vip;
  const isActive = true;
  const isPending = false;
  const isVIP = true;
  const isStandard = false;
  const isBasic = false;
  const isFree = false;
  const isPaid = true;

  // Always allowed to generate plans under VIP
  const canGeneratePlan = () => {
    return true;
  };

  const hasFeature = (feature) => {
    return true;
  };

  const plansRemainingToday = () => {
    return 'Unlimited';
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      currentPlan,
      loading,
      isActive,
      isPending,
      isVIP,
      isStandard,
      isBasic,
      isFree,
      isPaid,
      promoActive,
      promoEndDate,
      promoLabel,
      canGeneratePlan,
      plansRemainingToday,
      hasFeature,
      paymentModalOpen,
      selectedPlan,
      openPaymentModal,
      closePaymentModal,
      submitPaymentProof,
      fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider');
  return ctx;
};
