import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Users, Phone, Mail, ShieldCheck, Trash2, Eye, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api';

export default function CustomersView() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [kycStatus, setKycStatus] = useState('VERIFIED');
  const [riskRating, setRiskRating] = useState('LOW');

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await apiFetch('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newCust = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, phone, kyc_status: kycStatus, risk_rating: riskRating })
      });
      setCustomers(prev => [newCust, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('');
    setKycStatus('VERIFIED'); setRiskRating('LOW');
  }

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`.toLowerCase().includes(q);
  });

  const riskColor = r => r === 'HIGH' ? 'var(--risk-high)' : r === 'MEDIUM' ? 'var(--risk-medium)' : 'var(--risk-low)';

  return (
    <div style={{ maxWidth: '1300px', margin: '1.5rem auto', padding: '0 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={22} color="var(--accent-cyan)" /> Customer Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {customers.length} total customers stored • Create, view, and manage customer profiles
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadCustomers} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <UserPlus size={15} /> New Customer
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: '2.4rem' }}
        />
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'LOW RISK', count: customers.filter(c=>c.risk_rating==='LOW').length, color: 'var(--risk-low)' },
          { label: 'MEDIUM RISK', count: customers.filter(c=>c.risk_rating==='MEDIUM').length, color: 'var(--risk-medium)' },
          { label: 'HIGH RISK', count: customers.filter(c=>c.risk_rating==='HIGH').length, color: 'var(--risk-high)' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kpi.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: kpi.color }} className="mono">{kpi.count}</div>
          </div>
        ))}
      </div>

      {/* Customers Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading customers...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Users size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <p>{search ? 'No customers match your search.' : 'No customers yet. Create your first customer profile.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Phone</th>
                  <th>KYC Status</th>
                  <th>Risk Rating</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>#{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Mail size={13} color="var(--text-muted)" /> {c.email}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Phone size={13} color="var(--text-muted)" /> {c.phone || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--risk-low)', fontWeight: 600 }}>
                        <ShieldCheck size={14} /> {c.kyc_status || 'VERIFIED'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: riskColor(c.risk_rating), background: `${riskColor(c.risk_rating)}18`, padding: '0.25rem 0.65rem', borderRadius: '9999px', border: `1px solid ${riskColor(c.risk_rating)}44` }}>
                        {c.risk_rating}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} color="var(--accent-cyan)" /> Create New Customer Profile
            </h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="e.g. Rahul" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="e.g. Kumar" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="rahul@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91-98765-43210" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">KYC Status</label>
                  <select className="form-select" value={kycStatus} onChange={e => setKycStatus(e.target.value)}>
                    <option value="VERIFIED">Verified</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Rating</label>
                  <select className="form-select" value={riskRating} onChange={e => setRiskRating(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <UserPlus size={15} /> {submitting ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
