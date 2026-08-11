import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import DashboardView from './views/DashboardView';
import AnalyticsView from './views/AnalyticsView';
import RulesView from './views/RulesView';
import AuditView from './views/AuditView';
import CustomersView from './views/CustomersView';
import AccountsView from './views/AccountsView';
import { apiFetch, createWebSocketConnection, setAuthToken, getAuthToken } from './api';
import { ShieldAlert, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wsConnected, setWsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Connect WebSocket stream for real-time alerts
    const cleanupWs = createWebSocketConnection(
      (data) => {
        if (data.type === 'ALERT_CREATED') {
          // Push to alerts list
          setAlerts(prev => [data.alert, ...prev]);

          // Show Toast notification
          const toastId = Date.now();
          const newToast = {
            id: toastId,
            message: `🚨 NEW HIGH RISK FRAUD ALERT! Txn #${data.alert.transaction_id} — Score: ${data.alert.risk_score}`
          };
          setToasts(prev => [newToast, ...prev]);

          // Auto dismiss toast after 6 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 6000);
        } else if (data.type === 'ALERT_ESCALATED') {
          setAlerts(prev => prev.map(a => a.id === data.alert.id ? { ...a, status: 'ESCALATED' } : a));
        } else if (data.type === 'ALERT_RESOLVED') {
          setAlerts(prev => prev.map(a => a.id === data.alert.id ? { ...a, status: 'RESOLVED' } : a));
        }
      },
      (isConnected) => {
        setWsConnected(isConnected);
      }
    );

    return () => cleanupWs();
  }, [user]);

  async function checkCurrentUser() {
    const token = getAuthToken();
    if (!token) {
      setLoadingUser(false);
      return;
    }
    try {
      const res = await apiFetch('/auth/me');
      setUser(res.user);
    } catch (err) {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
  }



  if (loadingUser) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Initialising Real-Time Banking Fraud Platform...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {!user && <AuthModal onLoginSuccess={(u) => setUser(u)} />}

      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            alerts={alerts}
            setAlerts={setAlerts}
            onAlertResolved={(id) => {
              setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
            }}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'customers' && <CustomersView />}
        {activeTab === 'accounts' && <AccountsView />}
        {activeTab === 'rules' && <RulesView user={user} />}
        {activeTab === 'audit' && <AuditView />}
      </main>

      {/* Real-Time WebSocket Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <ShieldAlert size={20} color="var(--risk-high)" />
            <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
              {t.message}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
