import React from 'react';
import { Wrench, Clock, RefreshCw, Phone } from 'lucide-react';
import './MaintenancePage.css';

const MaintenancePage = () => {
    return (
        <div className="maintenance-container animate-fade">
            <div className="maintenance-card">
                <div className="maintenance-icon-box">
                    <Wrench size={40} className="spin-slow" />
                </div>
                <h1 className="maintenance-title">Scheduled Maintenance</h1>
                <p className="maintenance-subtitle">
                    The 21st Century LP Generator is currently undergoing scheduled upgrades to bring you an even better experience. 
                </p>
                <div className="maintenance-info-box">
                    <div className="info-item">
                        <Clock size={18} />
                        <span>Schedule: 20:15 - 01:15 AM</span>
                    </div>
                    <div className="info-item">
                        <RefreshCw size={18} />
                        <span>Expected completion: Shortly after 01:15 AM</span>
                    </div>
                    <div className="info-item emergency-contact">
                        <Phone size={18} />
                        <span>Emergency: <a href="tel:0788768148">0788768148 (Roger)</a></span>
                    </div>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }}
                >
                    Refresh Page
                </button>
            </div>
        </div>
    );
};

export default MaintenancePage;
