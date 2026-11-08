import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        setUser(response.data.user);
        return response;
    };

    const handleOAuthSuccess = async (token) => {
        authService.setToken(token);
        const response = await authService.getProfile();
        if (response.success) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
            return response.data;
        }
        throw new Error('Failed to fetch user profile');
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        setUser(response.data.user);
        return response;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const updateProfile = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value = {
        user,
        loading,
        login,
        handleOAuthSuccess,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isTeacher: user?.role === 'teacher'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
