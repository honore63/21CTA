import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X, Rocket, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './PublicNavbar.css';

const PublicNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(() => {
    return localStorage.getItem('screenReaderActive') === 'true';
  });

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Sync state with local storage and other components (like App.jsx)
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
      // Remove any leftover highlights immediately
      document.querySelectorAll('.screen-reader-highlight').forEach(el => {
        el.classList.remove('screen-reader-highlight');
      });
    }
  };

  return (
    <nav className="public-navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <img src="/images/reallogo.png" alt="Logo" className="navbar-logo-img" />
          <span className="navbar-brand-name">21st Century LP Generator</span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-desktop-links">
          <Link to="/schools" className="nav-link">Schools</Link>
          <Link to="/library" className="nav-link">Library</Link>
          <Link to="/docs" className="nav-link">Docs</Link>
          <Link to="/about-us" className="nav-link">About</Link>
          <Link to="/contact" className="nav-link">Contact</Link>

          <div className="nav-divider"></div>

          {/* Screen Reader Toggle */}
          <button 
            onClick={toggleScreenReader} 
            className={`nav-accessibility-toggle ${isScreenReaderActive ? 'active' : ''}`}
            aria-label="Toggle Screen Reader"
            title="Toggle Screen Reader (Hover text to read)"
            style={{ marginRight: '8px' }}
          >
            {isScreenReaderActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button onClick={toggleTheme} className="nav-theme-toggle" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              Dashboard
            </Link>
          ) : (
            <div className="navbar-auth-buttons">
              <Link to="/login" className="nav-link login-link">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="navbar-mobile-controls">
          <button 
            onClick={toggleScreenReader} 
            className={`nav-accessibility-toggle ${isScreenReaderActive ? 'active' : ''}`}
            aria-label="Toggle Screen Reader"
            title="Toggle Screen Reader (Hover text to read)"
          >
            {isScreenReaderActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          
          <button onClick={toggleTheme} className="nav-theme-toggle" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button className="navbar-mobile-toggle" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`navbar-mobile-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="drawer-links">
          <Link to="/schools" onClick={toggleMenu} className="drawer-link">School Directory</Link>
          <Link to="/library" onClick={toggleMenu} className="drawer-link">Digital Library</Link>
          <Link to="/docs" onClick={toggleMenu} className="drawer-link">Documentation</Link>
          <Link to="/about-us" onClick={toggleMenu} className="drawer-link">About Us</Link>
          <Link to="/contact" onClick={toggleMenu} className="drawer-link">Contact Support</Link>

          <div className="drawer-divider"></div>

          {isAuthenticated ? (
            <Link to="/dashboard" onClick={toggleMenu} className="btn btn-primary btn-full">
              Go to Dashboard
            </Link>
          ) : (
            <div className="drawer-auth">
              <Link to="/login" onClick={toggleMenu} className="drawer-link login">Sign In</Link>
              <Link to="/register" onClick={toggleMenu} className="btn btn-primary btn-full">
                Get Started for Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
