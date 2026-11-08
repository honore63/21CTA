import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import './design-system.css';
import './index.css';
import './responsive-overrides.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <App />
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
