import React, { useState, useEffect } from 'react';
import { ShieldAlert, PlusCircle, Search, Filter, RefreshCw, Eye, AlertTriangle, CheckCircle, Zap, UserPlus, CreditCard, ShieldX, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../api';
import TransactionFormModal from '../components/TransactionFormModal';
import AlertDetailModal from '../components/AlertDetailModal';

export default function DashboardView({ user, alerts, setAlerts, onAlertResolved }) {
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [txnSearch, setTxnSearch] = useState('');
  const [txnRiskFilter, setTxnRiskFilter] = useState('ALL');

  // Modals
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Form states
  const [custFirstName, setCustFirstName] = useState('');
  const [custLastName, setCustLastName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');

  const [accCustomerId, setAccCustomerId] = useState('');
  const [accType, setAccType] = useState('CHECKING');
  const [accBalance, setAccBalance] = useState('25000');

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [txnsData, custsData, accsData, alertsData, analyticsData] = await Promise.all([
        apiFetch('/transactions'),
        apiFetch('/customers'),
        apiFetch('/accounts'),
        apiFetch('/alerts'),
        apiFetch('/analytics/summary')
      ]);
      setTransactions(txnsData);
      setCustomers(custsData);
      setAccounts(accsData);
      setAlerts(alertsData);
      setAnalytics(analyticsData);
      if (custsData.length > 0) setAccCustomerId(custsData[0].id);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCustomer(e) {
    e.preventDefault();
    try {
      const newCust = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          first_name: custFirstName,
          last_name: custLastName,
          email: custEmail,
          phone: custPhone
        })
      });
      setCustomers([newCust, ...customers]);
      setAccCustomerId(newCust.id);
      setShowCustomerModal(false);
      setCustFirstName(''); setCustLastName(''); setCustEmail(''); setCustPhone('');
    } catch (err) {
      alert(err.message || 'Failed to create customer profile');
    }
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    try {
      const newAcc = await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(accCustomerId),
          account_type: accType,
          initial_balance: Number(accBalance),
          currency: 'INR'
        })
      });
      setAccounts([newAcc, ...accounts]);
      setShowAccountModal(false);
    } catch (err) {
      alert(err.message || 'Failed to create bank account');
    }
  }

  // Filtered Alert List
  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === 'ALL') return true;
    return a.status === alertFilter;
  });

  // Filtered Transactions
  const filteredTxns = transactions.filter(t => {
    const matchesRisk = txnRiskFilter === 'ALL' || t.risk_level === txnRiskFilter;
    const matchesSearch = !txnSearch || 
      (t.merchant_name && t.merchant_name.toLowerCase().includes(txnSearch.toLowerCase())) ||
      (t.location && t.location.toLowerCase().includes(txnSearch.toLowerCase())) ||
      (t.device_id && t.device_id.toLowerCase().includes(txnSearch.toLowerCase()));
    return matchesRisk && matchesSearch;
  });

  const openAlertsCount = alerts.filter(a => a.status === 'OPEN').length;
  const confirmedFraudCount = analytics?.confirmed_fraud_count || 0;
  const falsePositiveCount = analytics?.false_positive_count || 0;
  const blockedCount = analytics?.blocked_simulated_count || transactions.filter(t => t.status === 'BLOCKED_SIMULATED' || t.status === 'REJECTED').length;

  return (
    <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 1rem' }}>
      
      {/* Top Dynamic DB KPI Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>OPEN ALERTS</span>
            <AlertTriangle size={18} color="var(--risk-high)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--risk-high)' }} className="mono">
            {openAlertsCount}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Requires Analyst Review</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>SIMULATED BLOCKED</span>
            <ShieldX size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#ef4444' }} className="mono">
            {blockedCount}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High-Risk Intercepted</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>CONFIRMED FRAUD</span>
            <ShieldAlert size={18} color="#c084fc" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#c084fc' }} className="mono">
            {confirmedFraudCount}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Analyst Verified Cases</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>FALSE POSITIVES</span>
            <ShieldCheck size={18} color="var(--risk-low)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--risk-low)' }} className="mono">
            {falsePositiveCount}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Approved Legitimate</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>TOTAL SCREENED</span>
            <Zap size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }} className="mono">
            {transactions.length}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>p95 Latency &lt; 2s</span>
        </div>

      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(28,37,65,0.6)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Real-Time Fraud Operation Control Center (RBI Guidelines Compliant)</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage Customers, Accounts, submit Transactions in ₹ (INR), and investigate Fraud Alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowCustomerModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <UserPlus size={16} /> New Customer
          </button>
          <button onClick={() => setShowAccountModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <CreditCard size={16} /> New Account
          </button>
          <button onClick={() => setShowTxnModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Zap size={16} /> Screen New Transaction
          </button>
        </div>
      </div>

      {/* Main Grid: Live Fraud Alerts (Left) + Transactions Log (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Real-Time Fraud Alerts Panel */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert color="var(--risk-high)" size={20} /> Live Fraud Alerts Stream
            </h3>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {['ALL', 'OPEN', 'ESCALATED', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => setAlertFilter(st)}
                  className={`btn ${alertFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No fraud alerts matching filter criteria.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="glass-card"
                    style={{ padding: '1rem', cursor: 'pointer', borderLeft: `4px solid ${alert.risk_level === 'High' ? 'var(--risk-high)' : 'var(--risk-medium)'}` }}
                    onClick={() => setSelectedAlertId(alert.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }} className="mono">Alert #{alert.id}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          (Txn #{alert.transaction_id})
                        </span>
                      </div>
                      <span className={`badge ${alert.status === 'OPEN' ? 'badge-open' : alert.status === 'ESCALATED' ? 'badge-escalated' : 'badge-resolved'}`}>
                        {alert.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {alert.transaction ? alert.transaction.merchant_name : 'Transaction'} • {alert.transaction ? `₹${Number(alert.transaction.amount).toLocaleString('en-IN')}` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: alert.risk_level === 'High' ? 'var(--risk-high)' : 'var(--risk-medium)' }} className="mono">
                          Score: {alert.risk_score}
                        </span>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                          <Eye size={12} /> Investigate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transaction History & Search Panel */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap color="var(--accent-cyan)" size={20} /> Transaction Log (₹ INR)
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="form-select"
                value={txnRiskFilter}
                onChange={e => setTxnRiskFilter(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="High">High Risk Only</option>
                <option value="Medium">Medium Risk Only</option>
                <option value="Low">Low Risk Only</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search merchant, location, device..."
                value={txnSearch}
                onChange={e => setTxnSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.825rem' }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount (₹)</th>
                  <th>Type / Merchant</th>
                  <th>Risk Score</th>
                  <th>Action Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map(t => (
                  <tr key={t.id}>
                    <td className="mono">#{t.id}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>₹{Number(t.amount).toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.merchant_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.transaction_type}</div>
                    </td>
                    <td>
                      <span className={`badge ${t.risk_level === 'High' ? 'badge-high' : t.risk_level === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                        {t.risk_score} ({t.risk_level})
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: t.status === 'COMPLETED' || t.status === 'APPROVED' ? 'var(--risk-low)' : t.status === 'UNDER_REVIEW' ? 'var(--risk-medium)' : 'var(--risk-high)' }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modals */}
      {showTxnModal && (
        <TransactionFormModal
          customers={customers}
          accounts={accounts}
          onClose={() => setShowTxnModal(false)}
          onTransactionCreated={() => loadAllData()}
          onViewAlert={(id) => setSelectedAlertId(id)}
        />
      )}

      {selectedAlertId && (
        <AlertDetailModal
          alertId={selectedAlertId}
          onClose={() => setSelectedAlertId(null)}
          onAlertResolved={() => loadAllData()}
        />
      )}

      {/* Customer Creation Modal */}
      {showCustomerModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Create Customer Profile</h3>
            <form onSubmit={handleCreateCustomer}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={custFirstName} onChange={e => setCustFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={custLastName} onChange={e => setCustLastName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={custPhone} onChange={e => setCustPhone(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCustomerModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Customer Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Creation Modal */}
      {showAccountModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Create Bank Account</h3>
            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label className="form-label">Customer Profile</label>
                <select className="form-select" value={accCustomerId} onChange={e => setAccCustomerId(e.target.value)} required>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select className="form-select" value={accType} onChange={e => setAccType(e.target.value)}>
                  <option value="CHECKING">Checking</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="PREMIUM_CHECKING">Premium Checking</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Initial Balance (₹ INR)</label>
                <input className="form-input mono" type="number" value={accBalance} onChange={e => setAccBalance(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAccountModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Bank Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
