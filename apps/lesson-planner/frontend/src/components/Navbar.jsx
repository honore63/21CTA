import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiHome, FiBook, FiFileText, FiUser, FiLogOut, FiBookOpen, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-brand" onClick={closeMenu}>
                    <img src="/images/reallogo.png" alt="Logo" className="brand-icon" style={{ objectFit: 'contain' }} />
                    <span className="brand-text">21st Century Lesson Plan Generator</span>
                </Link>

                <div className="navbar-actions">
                    <NotificationBell />
                    <button 
                        onClick={toggleTheme} 
                        className="theme-toggle" 
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <FiMoon /> : <FiSun />}
                    </button>

                    <button className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu} aria-label="Toggle Menu">
                        {isMenuOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>

                {isMenuOpen && <div className="navbar-backdrop" onClick={closeMenu}></div>}

                <div className={`navbar-content ${isMenuOpen ? 'active' : ''}`}>
                    <div className="navbar-menu">
                        <Link to="/" className="nav-link" onClick={closeMenu}>
                            <FiHome /> Home
                        </Link>

                        <Link to="/dashboard" className="nav-link" onClick={closeMenu}>
                            <FiBook /> Dashboard
                        </Link>

                        {!isAdmin && (
                            <>
                                <Link to="/classes" className="nav-link" onClick={closeMenu}>
                                    <FiBook /> My Classes
                                </Link>
                                <Link to="/reference-materials" className="nav-link" onClick={closeMenu}>
                                    <FiBookOpen /> Reference Books
                                </Link>
                            </>
                        )}

                        {isAdmin && (
                            <Link to="/materials" className="nav-link" onClick={closeMenu}>
                                <FiFileText /> Materials
                            </Link>
                        )}

                        <Link to="/profile" className="nav-link" onClick={closeMenu}>
                            <FiUser /> Profile
                        </Link>
                    </div>

                    <div className="navbar-user">
                        <div className="user-info">
                            <span className="user-name">{user?.full_name}</span>
                            <span className="user-role">{user?.role}</span>
                            <span 
                                onClick={() => { closeMenu(); logout(); }} 
                                style={{ display: 'block', fontSize: '11px', color: 'var(--error-500)', cursor: 'pointer', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
                            >
                                <FiLogOut style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }}/> Logout
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
