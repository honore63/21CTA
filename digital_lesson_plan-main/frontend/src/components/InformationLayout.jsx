import React from 'react';
import { ChevronRight } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';
import './InformationLayout.css';

const InformationLayout = ({ children, title, breadcrumb }) => {
    return (
        <div className="info-layout-premium">
            <PublicNavbar />
            
            <main className="info-body-premium">
                <div className="info-container">
                    <nav className="info-breadcrumb-nav animate-fade">
                        <span className="breadcrumb-root">{breadcrumb || 'Page'}</span>
                        <ChevronRight size={14} className="breadcrumb-separator" />
                        <span className="breadcrumb-active">{title}</span>
                    </nav>
                    
                    <div className="info-main-content animate-slide-up">
                        {children}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default InformationLayout;
