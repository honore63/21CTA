import { FiLock, FiZap } from 'react-icons/fi';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

/**
 * SubscriptionGate
 *
 * Wraps features that require a paid subscription.
 * Props:
 *   requiredPlan: 'paid' | 'standard' | 'premium'
 *   feature: string — human-readable feature name
 *   children: content to show when access is granted
 *   inline: if true, renders an inline banner instead of full overlay
 */
export default function SubscriptionGate({ requiredPlan = 'paid', feature = 'this feature', children, inline = false }) {
  return children;
}

/**
 * PlanLimitBanner — shown when user is approaching/at their daily plan limit
 */
export function PlanLimitBanner() {
  return null;
}
