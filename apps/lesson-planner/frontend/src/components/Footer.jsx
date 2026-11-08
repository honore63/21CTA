import React from 'react';
import { Link } from 'react-router-dom';
import { Code, Share2, Mail, Globe, Heart, Shield, HelpCircle, Layout } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-premium">
      <div className="footer-container">
        <div className="footer-main-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand-link">
              <img src="/images/reallogo.png" alt="Logo" className="footer-logo-img" />
              <span className="footer-brand-name">21st Century LP Generator</span>
            </Link>
            <p className="footer-brand-text">
              The leading AI-powered pedagogical engine for Rwandan educators. Perfectly aligned with REB and CBC standards for a modern classroom.
            </p>
            <div className="footer-social-bar">
              <a href="https://github.com/Rogersho" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Github"><Code size={18} /></a>
              <a href="#" className="social-icon" aria-label="Twitter"><Share2 size={18} /></a>
              <a href="#" className="social-icon" aria-label="Website"><Globe size={18} /></a>
              <a href="mailto:support@lp-generator.rw" className="social-icon" aria-label="Email"><Mail size={18} /></a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-nav-col">
            <h4 className="footer-nav-title"><Layout size={16} /> Platform</h4>
            <ul className="footer-nav-list">
              <li><Link to="/">Home Page</Link></li>
              <li><Link to="/docs">User Guide</Link></li>
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/register">Create Account</Link></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-nav-title"><Shield size={16} /> Company</h4>
            <ul className="footer-nav-list">
              <li><Link to="/about-us">About Our Mission</Link></li>
              <li><Link to="/contact">Contact Support</Link></li>
              <li><Link to="/privacy-policy">Privacy & Data</Link></li>
              <li><Link to="/terms">Terms of Use</Link></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-nav-title"><HelpCircle size={16} /> Support</h4>
            <ul className="footer-nav-list">
              <li><Link to="/faq">Help & FAQ</Link></li>
              <li><Link to="/status">System Status</Link></li>
              <li><Link to="/docs">Tutorials</Link></li>
              <li><Link to="/dashboard">Teacher Login</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            © {new Date().getFullYear()} 21st Century Lesson Plan Generator.
            <span className="footer-country"> Kigali, Rwanda</span>
          </div>
          <div className="footer-credits">
            Made with <Heart size={14} className="heart-icon" /> by
            <a href="https://github.com/Rogersho" target="_blank" rel="noopener noreferrer"> Roger</a> &
            <a href="https://github.com/Honore-T" target="_blank" rel="noopener noreferrer"> Honore</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
