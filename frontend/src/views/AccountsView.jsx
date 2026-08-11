import React, { useState, useEffect } from 'react';
import { CreditCard, Search, PlusCircle, RefreshCw, Banknote, CheckCircle } from 'lucide-react';
import { apiFetch } from '../api';

export default function AccountsView() {
  const [accounts, setAccounts]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [customerId, setCustomerId]   = useState('');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [balance, setBalance]         = useState('25000');
  const [currency, setCurrency]       = useState('INR');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [accs, custs] = await Promise.all([
        apiFetch('/accounts'),
        apiFetch('/customers')
      ]);
      setAccounts(accs);
      setCustomers(custs);
      if (custs.length > 0) setCustomerId(String(custs[0].id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!customerId) { alert('Please select a customer first.'); return; }
    setSubmitting(true);
    try {
      const newAcc = await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(customerId),
          account_type: accountType,
          initial_balance: Number(balance),
          currency
        })
      });
      setAccounts(prev => [newAcc, ...prev]);
      setShowModal(false);
      setBalance('25000');
    } catch (err) {
      alert(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  // Enrich account rows with customer name
  const enriched = accounts.map(a => {
    const cust = customers.find(c => Number(c.id) === Number(a.customer_id));
    return { ...a, customer_name: cust ? `${cust.first_name} ${cust.last_name}` : `Customer #${a.customer_id}` };
  });

  const filtered = enriched.filter(a => {
    const q = search.toLowerCase();
    return !q ||
      a.account_number?.toLowerCase().includes(q) ||
      a.customer_name?.toLowerCase().includes(q) ||
      a.account_type?.toLowerCase().includes(q);
  });

  const typeColor = t => {
    if (t === 'SAVINGS') return '#60a5fa';
    if (t === 'CHECKING') return '#34d399';
    if (t === 'PREMIUM_CHECKING') return '#c084fc';
    if (t === 'BUSINESS') return '#f59e0b';
    return 'var(--text-muted)';
  };

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <div style={{ maxWidth: '1300px', margin: '1.5rem auto', padding: '0 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={22} color="var(--accent-cyan)" /> Bank Account Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {accounts.length} total accounts • Total balance: <strong className="mono">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadAll} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }} disabled={customers.length === 0}>
            <PlusCircle size={15} /> New Account
          </button>
        </div>
      </div>

      {customers.length === 0 && (
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#fcd34d' }}>
          ⚠️ No customers found. Please create a Customer Profile first before creating an account.
        </div>
      )}

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by account number, customer name or account type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: '2.4rem' }}
        />
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {['SAVINGS','CHECKING','PREMIUM_CHECKING','BUSINESS'].map(t => (
          <div key={t} className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: typeColor(t), fontWeight: 700, letterSpacing: '0.05em' }}>{t.replace('_',' ')}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: typeColor(t) }} className="mono">
              {accounts.filter(a => a.account_type === t).length}
            </div>
          </div>
        ))}
      </div>

      {/* Accounts Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading accounts...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <CreditCard size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <p>{search ? 'No accounts match your search.' : 'No accounts yet. Create the first account for a customer.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Account Number</th>
                  <th>Customer</th>
                  <th>Account Type</th>
                  <th>Balance (₹)</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>#{a.id}</td>
                    <td className="mono" style={{ fontWeight: 600, letterSpacing: '0.03em' }}>{a.account_number}</td>
                    <td style={{ fontWeight: 600 }}>{a.customer_name}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: typeColor(a.account_type), background: `${typeColor(a.account_type)}18`, padding: '0.22rem 0.6rem', borderRadius: '9999px', border: `1px solid ${typeColor(a.account_type)}44` }}>
                        {a.account_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--risk-low)', fontSize: '0.95rem' }}>
                      ₹{Number(a.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.currency || 'INR'}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--risk-low)', fontWeight: 600 }}>
                        <CheckCircle size={13} /> {a.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} color="var(--accent-cyan)" /> Create New Bank Account
            </h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Customer Profile *</label>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  required
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Account Type *</label>
                <select className="form-select" value={accountType} onChange={e => setAccountType(e.target.value)}>
                  <option value="SAVINGS">Savings</option>
                  <option value="CHECKING">Checking</option>
                  <option value="PREMIUM_CHECKING">Premium Checking</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Initial Balance (₹ INR) *</label>
                  <input
                    className="form-input mono"
                    type="number"
                    min="0"
                    step="0.01"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    required
                    placeholder="25000.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <PlusCircle size={15} /> {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
