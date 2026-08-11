import React from 'react';
import { ShieldAlert, LogOut, BarChart3, Sliders, FileText, LayoutDashboard, Users, CreditCard } from 'lucide-react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab, wsConnected }) {
  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '0.85rem 2rem', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
            <ShieldAlert size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff, #8d99ae)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AEGIS FRAUD INTELLIGENCE
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              REAL-TIME HYBRID FRAUD DETECTION ENGINE
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
          >
            <LayoutDashboard size={16} /> Dashboard & Alerts
          </button>

          {user && (user.role === 'Admin' || user.role === 'Bank Staff') && (
            <button
              onClick={() => setActiveTab('customers')}
              className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
            >
              <Users size={16} /> Customers
            </button>
          )}

          {user && (user.role === 'Admin' || user.role === 'Bank Staff') && (
            <button
              onClick={() => setActiveTab('accounts')}
              className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
            >
              <CreditCard size={16} /> Accounts
            </button>
          )}

          <button
            onClick={() => setActiveTab('analytics')}
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
          >
            <BarChart3 size={16} /> Analytics
          </button>

          {user && (user.role === 'Admin' || user.role === 'Fraud Analyst') && (
            <button
              onClick={() => setActiveTab('rules')}
              className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
            >
              <Sliders size={16} /> Fraud Rules
            </button>
          )}

          {user && user.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
            >
              <FileText size={16} /> Audit Logs
            </button>
          )}
        </nav>

        {/* Status & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          
          {/* WebSocket Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', background: 'rgba(11,19,43,0.6)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <div className={wsConnected ? "pulse-dot" : ""} style={{ backgroundColor: wsConnected ? 'var(--risk-low)' : 'var(--risk-high)', width: 8, height: 8, borderRadius: '50%' }} />
            <span style={{ color: wsConnected ? 'var(--risk-low)' : 'var(--risk-high)', fontWeight: 600 }}>
              {wsConnected ? 'LIVE STREAM' : 'DISCONNECTED'}
            </span>
          </div>



          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</span>
                <span className={`badge ${user.role === 'Admin' ? 'badge-high' : user.role === 'Fraud Analyst' ? 'badge-medium' : 'badge-low'}`} style={{ fontSize: '0.65rem' }}>
                  {user.role}
                </span>
              </div>
              <button onClick={onLogout} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '8px' }} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : null}

        </div>

      </div>
    </header>
  );
}
