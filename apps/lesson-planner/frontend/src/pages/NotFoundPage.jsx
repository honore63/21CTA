import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';
import './AuthPages.css';

const NotFoundPage = () => {
    return (
        <div className="auth-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="form-header" style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '6rem', color: 'var(--color-primary)', marginBottom: '1rem', fontWeight: 800 }}>404</h1>
                <h2>Page Not Found</h2>
                <p style={{ marginBottom: '2rem' }}>Oops! The page you are looking for doesn't exist or has been moved.</p>
                <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                    <FiHome style={{ marginRight: '8px' }} /> Return to Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
