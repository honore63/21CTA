import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Volume2, VolumeX } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import PaymentModal from './components/PaymentModal';
import PostMaintenanceModal from './components/PostMaintenanceModal';
import { initSocketClient } from './services/socketService';


// Lazy Loaded Pages
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const RegisterPage      = lazy(() => import('./pages/RegisterPage'));
const AboutUsPage       = lazy(() => import('./pages/AboutUsPage'));
const FAQPage           = lazy(() => import('./pages/FAQPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));
const ContactUsPage     = lazy(() => import('./pages/ContactUsPage'));
const DocsPage          = lazy(() => import('./pages/DocsPage'));
const TeacherDashboard  = lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard    = lazy(() => import('./pages/AdminDashboard'));
const ManageUsers       = lazy(() => import('./pages/ManageUsers'));
const ManageSubjects    = lazy(() => import('./pages/ManageSubjects'));
const UserDetails       = lazy(() => import('./pages/UserDetails'));
const ClassesPage       = lazy(() => import('./pages/ClassesPage'));
const ClassDetailPage   = lazy(() => import('./pages/ClassDetailPage'));
const UnitsPage         = lazy(() => import('./pages/UnitsPage'));
const LessonsPage       = lazy(() => import('./pages/LessonsPage'));
const LessonPlanPage    = lazy(() => import('./pages/LessonPlanPage'));
const AllLessonPlans     = lazy(() => import('./pages/AllLessonPlans'));
const MaterialsPage     = lazy(() => import('./pages/MaterialsPage'));
const ReferenceMaterialsPage = lazy(() => import('./pages/ReferenceMaterialsPage'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const AuthSuccess       = lazy(() => import('./pages/AuthSuccess'));
const ForgotPasswordPage= lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SyllabusPage      = lazy(() => import('./pages/SyllabusPage'));
const SyllabusStructurePage = lazy(() => import('./pages/SyllabusStructurePage'));
const SchedulePage      = lazy(() => import('./pages/SchedulePage'));
const LandingPage       = lazy(() => import('./pages/LandingPage'));
const PricingPage       = lazy(() => import('./pages/PricingPage'));
const VisitorsPage      = lazy(() => import('./pages/admin/VisitorsPage'));
const AdminNotifications= lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const BatchGeneratePage = lazy(() => import('./pages/BatchGeneratePage'));


import AIAssistant from './components/AIAssistant';
import Footer from './components/Footer';
import PhoneUpdateModal from './components/PhoneUpdateModal';
import DashboardLayout from './components/DashboardLayout';
import useVisitorTracker from './hooks/useVisitorTracker';
import MaintenancePage from './pages/MaintenancePage';

const PageLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--c-bg)' }}>
    <div className="spinner" style={{ width: '1.75rem', height: '1.75rem', marginBottom: 12 }} />
    <p style={{ color: 'var(--c-text-muted)', fontSize: '.875rem', fontWeight: 500 }}>Loading workspace...</p>
  </div>
);

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { isAuthenticated, isAdmin } = useAuth();
  return (
    <BrowserRouter>
      {/* Skip to content link for screen reader and keyboard users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppInner isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
    </BrowserRouter>
  );
}

function AppInner({ isAuthenticated, isAdmin }) {
  const { user } = useAuth();
  useVisitorTracker();

  // --- MAINTENANCE MODE LOGIC ---
  // Set to true to activate maintenance mode. 
  // Bypass by navigating to: yoursite.com/?bypass=roger
  const MAINTENANCE_ACTIVE = false;
  const [bypass, setBypass] = useState(
    localStorage.getItem('admin_bypass_maintenance') === 'true'
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bypassKey = params.get('bypass');
    if (bypassKey === 'roger' || bypassKey === 'hodali') {
      localStorage.setItem('admin_bypass_maintenance', 'true');
      setBypass(true);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Screen Reader Accessibility State
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(() => {
    return localStorage.getItem('screenReaderActive') === 'true';
  });

  // Sync state with local storage and other components (like PublicNavbar)
  useEffect(() => {
    const syncState = () => {
      setIsScreenReaderActive(localStorage.getItem('screenReaderActive') === 'true');
    };
    window.addEventListener('screenReaderToggle', syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('screenReaderToggle', syncState);
      window.removeEventListener('storage', syncState);
    };
  }, []);

  const toggleScreenReader = () => {
    const nextState = !isScreenReaderActive;
    setIsScreenReaderActive(nextState);
    localStorage.setItem('screenReaderActive', String(nextState));
    window.dispatchEvent(new Event('screenReaderToggle'));
    if (!nextState) {
      window.speechSynthesis.cancel();
      document.querySelectorAll('.screen-reader-highlight').forEach(el => {
        el.classList.remove('screen-reader-highlight');
      });
    }
  };

  // Socket.IO real-time sync initialization
  useEffect(() => {
    if (isAuthenticated) {
      initSocketClient(user);
    }
  }, [isAuthenticated, user]);

  // Screen Reader mouse hover TTS loop
  useEffect(() => {
    if (!isScreenReaderActive) return;

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      // Exclude navigation bars, sidebars, accessibility toggles, dropdowns, and chat assistants
      if (
        target.closest('.public-navbar') || 
        target.closest('.navbar-mobile-drawer') ||
        target.closest('.global-accessibility-btn') ||
        target.closest('.ai-assistant-container') ||
        target.closest('.chat-trigger-btn') ||
        target.closest('.dashboard-sidebar') ||
        target.closest('.dashboard-topbar') ||
        target.closest('.notif-dropdown') ||
        target.closest('.notif-bell-wrapper')
      ) return;

      const readableTags = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'li', 'td', 'th', 'label', 'strong', 'em', 'img', 'input', 'textarea'];
      const tagName = target.tagName.toLowerCase();

      if (!readableTags.includes(tagName)) return;

      let text = '';
      if (tagName === 'img') {
        text = target.getAttribute('alt') || 'Image without description';
      } else if (tagName === 'input' || tagName === 'textarea') {
        const placeholder = target.getAttribute('placeholder') || '';
        const value = target.value || '';
        const ariaLabel = target.getAttribute('aria-label') || '';
        const fieldName = target.getAttribute('name') || '';
        
        let labelText = '';
        // If there's an associated label in the form, try to read it
        if (target.id) {
          const associatedLabel = document.querySelector(`label[for="${target.id}"]`);
          if (associatedLabel) labelText = associatedLabel.innerText || associatedLabel.textContent || '';
        }
        if (!labelText) {
          // Look for preceding sibling labels
          let sibling = target.previousElementSibling;
          while (sibling) {
            if (sibling.tagName.toLowerCase() === 'label') {
              labelText = sibling.innerText || sibling.textContent || '';
              break;
            }
            sibling = sibling.previousElementSibling;
          }
        }
        if (!labelText && target.parentElement) {
          // Look for labels in parent container
          const parentLabel = target.parentElement.querySelector('label');
          if (parentLabel) labelText = parentLabel.innerText || parentLabel.textContent || '';
        }

        const nameInfo = labelText || ariaLabel || fieldName || 'input';
        text = `${nameInfo} field. ${placeholder ? 'Placeholder: ' + placeholder + '. ' : ''}${value ? 'Current value: ' + value : ''}`;
      } else {
        text = (target.innerText || target.textContent || '').trim();
      }

      if (!text) return;

      if (text.length > 400) {
        text = text.substring(0, 400) + '...';
      }

      target.classList.add('screen-reader-highlight');

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    const handleMouseOut = (e) => {
      const target = e.target;
      if (!target) return;

      target.classList.remove('screen-reader-highlight');
      window.speechSynthesis.cancel();
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      window.speechSynthesis.cancel();
      document.querySelectorAll('.screen-reader-highlight').forEach(el => {
        el.classList.remove('screen-reader-highlight');
      });
    };
  }, [isScreenReaderActive]);

  if (MAINTENANCE_ACTIVE && !bypass) {
    return <MaintenancePage />;
  }
  // ------------------------------

  return (
    <>
      <ToastContainer position="top-right" autoClose={3500} hideProgressBar newestOnTop closeOnClick pauseOnHover style={{ zIndex: 99999 }} />
      <PhoneUpdateModal />

      <PostMaintenanceModal />

      {/* Global Accessibility Screen Reader Button floating bottom-left */}
      <button 
        onClick={toggleScreenReader}
        className={`global-accessibility-btn ${isScreenReaderActive ? 'active' : ''}`}
        title="Toggle Screen Reader (Hover text to read)"
        aria-label="Toggle Screen Reader"
      >
        {isScreenReaderActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      <Suspense fallback={<PageLoader />}>
        {isAuthenticated && <AIAssistant />}

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <main id="main-content" style={{ flex: '1 0 auto' }}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login"    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
              <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
              <Route path="/about-us" element={<AboutUsPage />} />
              <Route path="/faq"      element={<FAQPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/contact"  element={<ContactUsPage />} />
              <Route path="/pricing"  element={<PricingPage />} />
              <Route path="/docs"     element={<DocsPage />} />
              <Route path="/auth/success"     element={<AuthSuccess />} />
              <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
              <Route path="/reset-password"   element={<ResetPasswordPage />} />

              {/* Protected teacher/admin routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute><DashboardLayout>{isAdmin ? <AdminDashboard /> : <TeacherDashboard />}</DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/classes" element={
                <ProtectedRoute><DashboardLayout><ClassesPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/classes/:classId" element={
                <ProtectedRoute><DashboardLayout><ClassDetailPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/classes/:classId/subjects/:subjectId/units" element={
                <ProtectedRoute><DashboardLayout><UnitsPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/units/:unitId/lessons" element={
                <ProtectedRoute><DashboardLayout><LessonsPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/units/:unitId/batch-generate" element={
                <ProtectedRoute><DashboardLayout><BatchGeneratePage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/lessons/:lessonId/plan" element={
                <ProtectedRoute><DashboardLayout><LessonPlanPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/lesson-plans" element={
                <ProtectedRoute><DashboardLayout><AllLessonPlans /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/materials" element={
                <ProtectedRoute><DashboardLayout><MaterialsPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/reference-materials" element={
                <ProtectedRoute><DashboardLayout><ReferenceMaterialsPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/profile" element={
                <ProtectedRoute><DashboardLayout><ProfilePage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/classes/:classId/subjects/:subjectId/schedule" element={
                <ProtectedRoute><DashboardLayout><SchedulePage /></DashboardLayout></ProtectedRoute>
              }/>

              {/* Admin only routes */}
              <Route path="/admin/users" element={
                <ProtectedRoute adminOnly><DashboardLayout><ManageUsers /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/subjects" element={
                <ProtectedRoute adminOnly><DashboardLayout><ManageSubjects /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/users/:userId" element={
                <ProtectedRoute adminOnly><DashboardLayout><UserDetails /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/syllabuses" element={
                <ProtectedRoute adminOnly><DashboardLayout><SyllabusPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/syllabuses/:id/structure" element={
                <ProtectedRoute adminOnly><DashboardLayout><SyllabusStructurePage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/visitors" element={
                <ProtectedRoute adminOnly><DashboardLayout><VisitorsPage /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/subscriptions" element={
                <ProtectedRoute adminOnly><DashboardLayout><AdminSubscriptions /></DashboardLayout></ProtectedRoute>
              }/>
              <Route path="/admin/notifications" element={
                <ProtectedRoute adminOnly><DashboardLayout><AdminNotifications /></DashboardLayout></ProtectedRoute>
              }/>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </Suspense>
    </>
  );
}

export default App;
