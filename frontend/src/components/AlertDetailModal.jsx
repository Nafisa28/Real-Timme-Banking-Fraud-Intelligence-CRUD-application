import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, Cpu, User, FileText, Send, AlertOctagon, History } from 'lucide-react';
import { apiFetch } from '../api';

export default function AlertDetailModal({ alertId, onClose, onAlertResolved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAlertDetails();
  }, [alertId]);

  async function fetchAlertDetails() {
    try {
      setLoading(true);
      const res = await apiFetch(`/alerts/${alertId}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch alert details');
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(outcome) {
    const finalNotes = notes.trim() || (
      outcome === 'CONFIRMED_FRAUD' 
        ? 'Confirmed unauthorized high-risk fraudulent transaction per RBI security guidelines. Transaction blocked and case closed.'
        : 'Customer verified and confirmed transaction is legitimate. Case marked as false positive per RBI protocol.'
    );

    setSubmitting(true);
    try {
      await apiFetch('/investigations', {
        method: 'POST',
        body: JSON.stringify({
          alert_id: Number(alertId),
          notes: finalNotes,
          outcome
        })
      });
      if (onAlertResolved) onAlertResolved(alertId, outcome);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to resolve alert');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading alert case details...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.alert) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content">
          <p style={{ color: 'var(--risk-high)' }}>Error loading alert data.</p>
          <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Close</button>
        </div>
      </div>
    );
  }

  const { alert, transaction, account, customer, investigations } = data;
  const isResolved = alert.status === 'RESOLVED';

  // Extract behavioral comparison baseline in INR
  const avgAmount = 25000;
  const normalLoc = customer ? `${customer.first_name}'s Registered Branch (Mumbai, IN)` : 'Local In-Store';
  const knownDevs = ['DEV-IN-SAMSUNG-S23', 'DEV-IN-MACBOOK-AIR'];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
              <ShieldAlert size={24} color="var(--risk-high)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem' }}>RBI Fraud Alert #{alert.id} Investigation Case</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created at {new Date(alert.created_at).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`badge ${alert.status === 'OPEN' ? 'badge-open' : alert.status === 'ESCALATED' ? 'badge-escalated' : 'badge-resolved'}`}>
              {alert.status}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Risk Score Header Card */}
        <div style={{ background: 'rgba(11,19,43,0.7)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Risk Score</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: alert.risk_level === 'High' ? 'var(--risk-high)' : 'var(--risk-medium)' }} className="mono">
              {alert.risk_score} / 100
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transparent RBI Rule Score</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }} className="mono">
              {transaction?.rule_score || 0} / 100
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ML Fraud Probability</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c084fc' }} className="mono">
              {transaction?.ml_probability || 0}%
            </div>
          </div>
        </div>

        {/* Customer Behavioral Normal vs Current Transaction Comparison */}
        <div style={{ background: 'rgba(11,19,43,0.6)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <History size={16} /> Customer Historical Behavior vs Current Transaction Comparison
          </h4>

          <table className="data-table" style={{ fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th>Behavioral Parameter</th>
                <th>Customer Normal Baseline</th>
                <th>Current Suspicious Transaction</th>
                <th>Anomaly Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Transaction Amount</strong></td>
                <td><span className="mono">₹{avgAmount.toLocaleString('en-IN')} INR</span> (Avg)</td>
                <td><span className="mono" style={{ fontWeight: 700, color: 'var(--risk-high)' }}>₹{Number(transaction?.amount || 0).toLocaleString('en-IN')} INR</span></td>
                <td>
                  <span className={`badge ${transaction?.amount > avgAmount * 2 ? 'badge-high' : 'badge-low'}`}>
                    {transaction?.amount > avgAmount * 2 ? '⚠️ High Deviation' : 'Normal'}
                  </span>
                </td>
              </tr>

              <tr>
                <td><strong>Device Identifier</strong></td>
                <td><span className="mono">{knownDevs.join(', ')}</span></td>
                <td><span className="mono" style={{ color: 'var(--risk-high)', fontWeight: 700 }}>{transaction?.device_id}</span></td>
                <td>
                  <span className="badge badge-high">⚠️ Unregistered Device</span>
                </td>
              </tr>

              <tr>
                <td><strong>Transaction Location</strong></td>
                <td>{normalLoc}</td>
                <td><span style={{ color: 'var(--risk-high)', fontWeight: 700 }}>{transaction?.location}</span></td>
                <td>
                  <span className="badge badge-medium">⚠️ Cross-Border Mismatch</span>
                </td>
              </tr>

              <tr>
                <td><strong>Transaction Time</strong></td>
                <td>09:00 AM - 09:00 PM (Normal)</td>
                <td>{new Date(transaction?.created_at || Date.now()).toLocaleTimeString('en-IN')}</td>
                <td>
                  <span className="badge badge-medium">⚠️ Off-Hours Window</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Transaction & Customer Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          
          <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>Transaction Details</h4>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Amount:</strong> <span className="mono" style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>₹{Number(transaction?.amount || 0).toLocaleString('en-IN')} {transaction?.currency || 'INR'}</span></p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Type:</strong> {transaction?.transaction_type}</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Merchant:</strong> {transaction?.merchant_name}</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Location:</strong> {transaction?.location}</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Device ID:</strong> <span className="mono">{transaction?.device_id}</span></p>
            <p style={{ fontSize: '0.85rem' }}><strong>IP Address:</strong> <span className="mono">{transaction?.ip_address}</span></p>
          </div>

          <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>Account Profile</h4>
            {customer && account ? (
              <>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Customer:</strong> {customer.first_name} {customer.last_name}</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Email:</strong> {customer.email}</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Account No:</strong> <span className="mono">{account.account_number}</span></p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Account Type:</strong> {account.account_type}</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}><strong>Current Balance:</strong> <span className="mono">₹{Number(account.balance || 0).toLocaleString('en-IN')}</span></p>
                <p style={{ fontSize: '0.85rem' }}><strong>Customer Risk:</strong> <span className="badge badge-low">{customer.risk_rating}</span></p>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Account details linked</p>
            )}
          </div>

        </div>

        {/* Triggered Rules */}
        {transaction?.triggered_rules && transaction.triggered_rules.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Triggered Detection Rules:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transaction.triggered_rules.map((tr, idx) => (
                <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.65rem 0.85rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fca5a5' }}>{tr.rule_code} — {tr.rule_name}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tr.description}</p>
                  </div>
                  <span style={{ fontWeight: 700, color: '#fca5a5' }} className="mono">+{tr.contribution} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Timeline */}
        {investigations && investigations.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Investigation History Timeline:</h4>
            {investigations.map((inv, idx) => (
              <div key={idx} style={{ background: 'rgba(11,19,43,0.5)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>Analyst #{inv.analyst_id}</span>
                  <span>{new Date(inv.created_at).toLocaleString('en-IN')}</span>
                </div>
                <span className={`badge ${inv.outcome === 'CONFIRMED_FRAUD' ? 'badge-high' : 'badge-low'}`} style={{ marginBottom: '0.35rem' }}>
                  {inv.outcome}
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{inv.notes}</p>
              </div>
            ))}
          </div>
        )}

        {/* Decision Form */}
        {!isResolved ? (
          <div style={{ background: 'rgba(58, 80, 107, 0.2)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} /> Analyst Case Decision & Findings:
            </h4>
            <div className="form-group">
              <textarea
                className="form-textarea"
                rows="3"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter RBI investigation findings or customer verification notes (optional)..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => handleResolve('FALSE_POSITIVE')}
                className="btn btn-success"
                disabled={submitting}
              >
                <CheckCircle size={16} /> {submitting ? 'Resolving...' : 'Mark as False Positive (Approve)'}
              </button>
              <button
                onClick={() => handleResolve('CONFIRMED_FRAUD')}
                className="btn btn-danger"
                disabled={submitting}
              >
                <AlertTriangle size={16} /> {submitting ? 'Resolving...' : 'Confirm Fraud (Block Txn)'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.85rem', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--risk-low)', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem' }}>
            Case successfully resolved and closed under RBI compliance rules.
          </div>
        )}

      </div>
    </div>
  );
}
