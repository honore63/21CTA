import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const useVisitorTracker = () => {
    const location = useLocation();

    useEffect(() => {
        const track = async () => {
            try {
                await api.post('/visitors/track', {
                    page_path: location.pathname,
                    referrer: document.referrer || null
                });
            } catch {
                // Silent — tracking should never affect UX
            }
        };
        track();
    }, [location.pathname]);
};

export default useVisitorTracker;
