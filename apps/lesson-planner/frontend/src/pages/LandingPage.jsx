import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, Check, Zap, Book, Users, Star, 
  X, Send, MessageSquare, Layout, GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './LandingPage.css';
import Footer from '../components/Footer';
import PublicNavbar from '../components/PublicNavbar';

const features = [
  { icon: <Zap size={22} />, title: 'AI-Generated Plans', desc: 'Get professional REB-compliant lesson plans in seconds using DLP AI.' },
  { icon: <Book size={22} />, title: '5Es & 3Ps Models', desc: 'Perfectly follows REB pedagogical models — 5Es for Sciences, 3Ps for Languages — every time.' },
  { icon: <Users size={22} />, title: 'Special Needs Ready', desc: 'Generates inclusive scripts for learners with visual, auditory, or cognitive special needs.' },
  { icon: <Star size={22} />, title: 'Kinyarwanda Support', desc: 'Native Kinyarwanda lesson planning with proper academic grammar and curriculum alignment.' },
];

const faqs = [
  {
    q: "Is it fully aligned with the REB CBC curriculum?",
    a: "Yes, 100%. Our AI engine is trained on the official REB curriculum documents and pedagogical models (5Es and 3Ps)."
  },
  {
    q: "Can I download my lesson plans?",
    a: "Absolutely. You can export your generated plans as professional PDF or Microsoft Word documents, ready to print or share."
  },
  {
    q: "Does it support Kinyarwanda?",
    a: "Yes! We have specialized logic for academic Kinyarwanda, making it perfect for primary schools and language teachers."
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [aiInput, setAiInput] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [stats, setStats] = useState([
    { value: '1,200+', label: 'Teachers Using' },
    { value: '15,000+', label: 'Plans Generated' },
    { value: '4.9★', label: 'Average Rating' },
    { value: '24h', label: 'Support Response' },
  ]);
  const [aiMessages, setAiMessages] = useState([
    { text: "Hello! I'm your interactive AI guide. Looking to revolutionize your teaching?", sender: 'ai' }
  ]);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'https://digital-lesson-plan.onrender.com/api'}/visitors/public-stats`);
        if (res.data.success) {
          const { teachers, plans } = res.data.data;
          setStats([
            { value: `${teachers.toLocaleString()}+`, label: 'Teachers Using' },
            { value: `${plans.toLocaleString()}+`, label: 'Plans Generated' },
            { value: '4.9★', label: 'Average Rating' },
            { value: '24h', label: 'Support Response' },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch public stats');
      }
    };
    fetchStats();
  }, []);

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    const msgText = aiInput.trim();
    if (!msgText || isLoadingAI) return;

    const userMsg = { text: msgText, sender: 'user' };
    const newMsgs = [...aiMessages, userMsg];
    setAiMessages(newMsgs);
    setAiInput('');
    setIsLoadingAI(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'https://digital-lesson-plan.onrender.com/api'}/chat/public-query`, {
        message: msgText,
        previousMessages: aiMessages
      });

      setAiMessages([...newMsgs, { 
        text: res.data.response || "I couldn't process that right now. Please try again later.", 
        sender: 'ai',
        action: res.data.action
      }]);
    } catch (error) {
      setAiMessages([...newMsgs, { 
        text: "Ah, it seems my connection dropped for a second! To ensure reliable performance securely, please create a free account.", 
        sender: 'ai',
        action: 'signup'
      }]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="landing-layout">
      <PublicNavbar />

      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero-premium">
          <div className="hero-container animate-fade">
            <span className="hero-badge hero-badge-anim">
              Built for Rwanda Education Board · REB CBC Aligned
            </span>
            <h1 className="hero-title">
              Revolutionize Your <span className="text-gradient">Teaching Experience</span>
            </h1>
            <p className="hero-subtitle">
              The #1 AI-powered lesson plan generator specifically tailored for the Rwandan curriculum. 
              Save hours of prep time with REB-compliant 5Es and 3Ps models.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg pulse-anim">
                <Zap size={20} /> Get Started Free
              </Link>
              <Link to="/about-us" className="btn btn-secondary btn-lg">
                See How It Works
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-avatars">
                <img src="https://i.pravatar.cc/100?u=1" alt="Teacher" />
                <img src="https://i.pravatar.cc/100?u=2" alt="Teacher" />
                <img src="https://i.pravatar.cc/100?u=3" alt="Teacher" />
                <div className="trust-avatar-more">+1k</div>
              </div>
              <p>Trusted by educators across Kigali and beyond</p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-container">
            {stats.map((s, i) => (
              <div key={i} className="stat-box animate-fade stagger-1">
                <h3 className="stat-value">{s.value}</h3>
                <p className="stat-label">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="features-premium">
          <div className="section-header-center">
            <h2 className="section-title">Designed for the <span className="text-gradient">Modern Classroom</span></h2>
            <p className="section-subtitle">Everything you need to deliver high-quality, inclusive education.</p>
          </div>
          
          <div className="features-grid-premium">
            {features.map((f, i) => (
              <div key={i} className={`feature-card-premium animate-fade stagger-${i + 1}`}>
                <div className="feature-icon-wrapper">
                  {f.icon}
                </div>
                <h3 className="feature-card-title">{f.title}</h3>
                <p className="feature-card-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it Works Section */}
        <section className="how-it-works-premium">
           <div className="section-header-center">
              <h2 className="section-title">Simple <span className="text-gradient">3-Step Process</span></h2>
              <p className="section-subtitle">From zero to a professional lesson plan in under a minute.</p>
           </div>
           <div className="steps-grid-premium">
              {[
                { step: '01', title: 'Create your class', desc: 'Add your class, subject, and unit. The system syncs with the REB curriculum automatically.', icon: <Layout size={24} /> },
                { step: '02', title: 'Select a lesson', desc: 'Pick from REB-aligned lessons in your unit. The AI knows exactly what each lesson needs.', icon: <GraduationCap size={24} /> },
                { step: '03', title: 'Generate & export', desc: 'Get a complete lesson plan in seconds. Download as PDF or Word, print, and teach.', icon: <Check size={24} /> },
              ].map((s, i) => (
                <div key={i} className="step-card-premium animate-fade stagger-2">
                  <div className="step-number">{s.step}</div>
                  <div className="step-icon-box">{s.icon}</div>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                </div>
              ))}
           </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-premium">
          <div className="faq-container">
            <div className="faq-header">
              <h2 className="section-title">Common <span className="text-gradient">Questions</span></h2>
              <p className="section-subtitle">Everything you need to know about the 21st Century Lesson Plan system.</p>
              
              <Link to="/faq" className="btn btn-ghost" style={{ marginTop: 'var(--sp-4)' }}>
                View Full FAQ <ArrowRight size={18} />
              </Link>
            </div>

            <div className="faq-list">
              {faqs.map((f, i) => (
                <div 
                  key={i} 
                  className={`faq-item ${activeFaq === i ? 'active' : ''}`}
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                >
                  <div className="faq-question">
                    <span>{f.q}</span>
                    <div className="faq-icon">
                      {activeFaq === i ? <X size={20} /> : <ArrowRight size={20} style={{ transform: 'rotate(90deg)' }} />}
                    </div>
                  </div>
                  {activeFaq === i && (
                    <div className="faq-answer animate-fade">
                      {f.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />

      {/* Floating Chat FAB */}
      <div className="floating-chat-widget">
        <button 
          className={`chat-toggle-fab ${showChat ? 'hidden' : ''}`}
          onClick={() => setShowChat(true)}
        >
          <MessageSquare size={28} />
          <span className="fab-tooltip">Questions? Ask our AI</span>
        </button>

        {showChat && (
          <div className="floating-chat-container animate-scale-up">
            <div className="mock-ai-header">
              <div className="ai-avatar"><Zap size={20} /></div>
              <div className="ai-header-info">
                <span className="ai-name">Teacher Support AI</span>
                <span className="ai-status">Always online</span>
              </div>
              <button className="chat-close-btn" onClick={() => setShowChat(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mock-ai-body">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`ai-message-wrapper ${msg.sender}`}>
                  <div className="ai-bubble">{msg.text}</div>
                </div>
              ))}
              {isLoadingAI && (
                <div className="ai-message-wrapper ai">
                  <div className="ai-bubble">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form className="mock-ai-input" onSubmit={handleAiSubmit}>
              <input 
                type="text" 
                placeholder="Type a question..." 
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="ai-send-btn" disabled={isLoadingAI}>
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
