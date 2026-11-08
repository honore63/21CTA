import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleOAuthSuccess } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const needsSetup = searchParams.get('needsSetup') === 'true';

        if (token) {
            const processLogin = async () => {
                try {
                    await handleOAuthSuccess(token);
                    if (needsSetup) {
                        toast.info('Please complete your profile by adding your school name.');
                        navigate('/profile', { replace: true });
                    } else {
                        toast.success('Welcome back!');
                        navigate('/dashboard', { replace: true });
                    }
                } catch (err) {
                    toast.error('Session initialization failed.');
                    navigate('/login', { replace: true });
                }
            };
            processLogin();
        } else {
            toast.error('Authentication failed.');
            navigate('/login', { replace: true });
        }
    }, [searchParams, navigate, handleOAuthSuccess]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
            <div className="spinner mb-4" style={{ width: '3rem', height: '3rem' }}></div>
            <p className="text-slate-600 font-medium">Completing secure login...</p>
        </div>
    );
};

export default AuthSuccess;
