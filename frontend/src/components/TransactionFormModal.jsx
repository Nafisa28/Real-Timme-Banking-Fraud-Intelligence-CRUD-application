import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, CheckCircle, Zap, Shield, Cpu, User, CreditCard, ArrowRight, Activity } from 'lucide-react';
import { apiFetch } from '../api';

export default function TransactionFormModal({ customers = [], accounts = [], onClose, onTransactionCreated, onViewAlert }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [amount, setAmount] = useState('85000');
  const [currency, setCurrency] = useState('INR');
  const [txnType, setTxnType] = useState('WIRE_TRANSFER');
  const [merchant, setMerchant] = useState('Offshore Crypto Exchange');
  const [location, setLocation] = useState('Mumbai, IN');
  const [deviceId, setDeviceId] = useState('DEV999');
  const [isNewDevice, setIsNewDevice] = useState(true);

  // Step-by-step loading animation state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    'Validating RBI transaction parameters & security signatures...',
    'Fetching Customer Behavior Baseline (Avg Amount in ₹, Devices, Locations)...',
    'Executing RBI Real-Time Digital Payment Security Rules...',
    'Running Scikit-Learn / XGBoost ML Model inference...',
    'Calculating Unified Risk Score & Action Status...'
  ];

  const [result, setResult] = useState(null);

  // Auto-filter accounts when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      const custAccs = accounts.filter(a => Number(a.customer_id) === Number(selectedCustomerId));
      setFilteredAccounts(custAccs);
      if (custAccs.length > 0) {
        setSelectedAccountId(custAccs[0].id);
      } else {
        setSelectedAccountId('');
      }
    } else {
      setFilteredAccounts(accounts);
      if (accounts.length > 0) setSelectedAccountId(accounts[0].id);
    }
  }, [selectedCustomerId, accounts]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAccountId) {
      alert('Please select an account associated with this customer.');
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    // Simulate realistic step-by-step progress
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < loadingMessages.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 280);

    try {
      const data = await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          account_id: Number(selectedAccountId),
          amount: Number(amount),
          currency: currency,
          transaction_type: txnType,
          merchant_name: merchant,
          location: location,
          device_id: deviceId,
          is_new_device: isNewDevice
        })
      });

      clearInterval(interval);
      setLoadingStep(loadingMessages.length - 1);
      setTimeout(() => {
        setResult(data);
        setLoading(false);
        if (onTransactionCreated) onTransactionCreated(data.transaction);
      }, 300);
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      alert(err.message || 'Transaction processing failed');
    }
  }

  const selectedCustObj = customers.find(c => Number(c.id) === Number(selectedCustomerId));
  const selectedAccObj = accounts.find(a => Number(a.id) === Number(selectedAccountId));

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={22} color="var(--accent-cyan)" /> Submit Transaction for RBI Fraud Screening
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Animated Loading State overlay */}
        {loading ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Activity size={44} color="var(--accent-cyan)" className="spin" style={{ margin: '0 auto 1.25rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Analyzing Transaction...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }} className="mono">
              {loadingMessages[loadingStep]}
            </p>
            <div style={{ width: '100%', height: '6px', background: 'rgba(11,19,43,0.8)', borderRadius: '3px', marginTop: '1.5rem', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((loadingStep + 1) / loadingMessages.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00b4d8, #10b981)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        ) : !result ? (
          /* Transaction Creation Form */
          <form onSubmit={handleSubmit}>
            
            {/* Connected Customer -> Account Dropdown selection */}
            <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={16} /> 1. Select Customer & Associated Account
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Customer Profile</label>
                  <select
                    className="form-select"
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Associated Bank Account</label>
                  <select
                    className="form-select"
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    required
                  >
                    {filteredAccounts.length === 0 ? (
                      <option value="">No Accounts Found for Customer</option>
                    ) : (
                      filteredAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} ({acc.account_type} - ₹{Number(acc.balance).toLocaleString('en-IN')})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {selectedAccObj && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Connected: <strong style={{ color: 'var(--text-main)' }}>{selectedCustObj?.first_name} {selectedCustObj?.last_name}</strong></span>
                  <span>Balance: <strong className="mono" style={{ color: 'var(--risk-low)' }}>₹{Number(selectedAccObj.balance).toLocaleString('en-IN')} {selectedAccObj.currency || 'INR'}</strong></span>
                </div>
              )}
            </div>

            {/* Transaction Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Transaction Amount (₹ INR)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input mono"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Type</label>
                <select className="form-select" value={txnType} onChange={e => setTxnType(e.target.value)}>
                  <option value="WIRE_TRANSFER">NEFT / RTGS Wire Transfer</option>
                  <option value="ONLINE_TRANSFER">IMPS / UPI Online Transfer</option>
                  <option value="DEBIT_CARD">Debit Card POS Purchase</option>
                  <option value="ATM_WITHDRAWAL">ATM Cash Withdrawal</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Merchant Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Originating Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai, IN or Bengaluru"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Device Identifier / IMEI</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginTop: '1.25rem' }}>
                  <input
                    type="checkbox"
                    checked={isNewDevice}
                    onChange={e => setIsNewDevice(e.target.checked)}
                  />
                  Unregistered / New Device Connection
                </label>
              </div>
            </div>

            {/* Simulation Presets */}
            <div style={{ marginBottom: '1.25rem', background: 'rgba(11,19,43,0.4)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                RBI DEMO SIMULATION PRESETS:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setAmount('2500.00'); setTxnType('DEBIT_CARD'); setMerchant('Grocery Supermarket'); setLocation('Mumbai, IN'); setDeviceId('DEV-IN-SAMSUNG-S23'); setIsNewDevice(false); }}
                  className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Normal Shopping (₹2,500)
                </button>
                <button
                  type="button"
                  onClick={() => { setAmount('49500.00'); setTxnType('ONLINE_TRANSFER'); setMerchant('Jewellery Merchant'); setLocation('Delhi, IN'); setDeviceId('DEV-IN-SAMSUNG-S23'); setIsNewDevice(false); }}
                  className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  RBI Structuring (₹49,500)
                </button>
                <button
                  type="button"
                  onClick={() => { setAmount('650000.00'); setTxnType('WIRE_TRANSFER'); setMerchant('Offshore Crypto Exchange'); setLocation('Cayman Islands (Foreign IP)'); setDeviceId('DEV999'); setIsNewDevice(true); }}
                  className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  High Risk RBI Fraud (₹6,50,000)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">
                <Zap size={16} /> Screen & Execute Transaction
              </button>
            </div>
          </form>
        ) : (
          /* Transaction Analysis Result Screen */
          <div>
            <div style={{ textAlign: 'center', padding: '1.25rem', background: result.fraud_analysis.risk_level === 'High' ? 'var(--risk-high-bg)' : result.fraud_analysis.risk_level === 'Medium' ? 'var(--risk-medium-bg)' : 'var(--risk-low-bg)', borderRadius: '10px', marginBottom: '1.25rem', border: `1px solid ${result.fraud_analysis.risk_level === 'High' ? 'var(--risk-high)' : result.fraud_analysis.risk_level === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)'}` }}>
              
              {result.fraud_analysis.risk_level === 'High' ? (
                <AlertTriangle size={48} color="var(--risk-high)" style={{ margin: '0 auto 0.5rem' }} />
              ) : result.fraud_analysis.risk_level === 'Medium' ? (
                <AlertTriangle size={48} color="var(--risk-medium)" style={{ margin: '0 auto 0.5rem' }} />
              ) : (
                <CheckCircle size={48} color="var(--risk-low)" style={{ margin: '0 auto 0.5rem' }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className={`badge ${result.fraud_analysis.risk_level === 'High' ? 'badge-high' : result.fraud_analysis.risk_level === 'Medium' ? 'badge-medium' : 'badge-low'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                  {result.fraud_analysis.risk_level} RISK DETECTED
                </span>

                <span style={{ background: result.fraud_analysis.action_status === 'BLOCKED_SIMULATED' ? '#ef4444' : result.fraud_analysis.action_status === 'UNDER_REVIEW' ? '#f59e0b' : '#10b981', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
                  ACTION: {result.fraud_analysis.action_status}
                </span>
              </div>

              <h3 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0.4rem 0 0.2rem' }} className="mono">
                {result.fraud_analysis.risk_score} / 100
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Unified Fraud Risk Score (Screening Latency: {result.fraud_analysis.execution_time_ms} ms)
              </p>
            </div>

            {/* Score Components Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <Shield size={16} /> Transparent RBI Rule Score
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="mono">
                  {result.fraud_analysis.rule_score} / 100
                </div>
              </div>

              <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <Cpu size={16} /> ML Predicted Fraud Risk
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="mono">
                  {result.fraud_analysis.ml_probability}%
                </div>
              </div>
            </div>

            {/* Behavioral Deviation Warnings */}
            {result.fraud_analysis.behavioral_deviations && result.fraud_analysis.behavioral_deviations.length > 0 && (
              <div style={{ marginBottom: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.85rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.8rem', color: '#fca5a5', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Behavioral & RBI Guidelines Anomaly Warnings:
                </h4>
                {result.fraud_analysis.behavioral_deviations.map((dev, idx) => (
                  <p key={idx} style={{ fontSize: '0.825rem', color: '#fca5a5', fontWeight: 600, marginBottom: '0.2rem' }}>
                    {dev}
                  </p>
                ))}
              </div>
            )}

            {/* Triggered Rules */}
            {result.fraud_analysis.triggered_rules.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Triggered Detection Rules ({result.fraud_analysis.triggered_rules.length}):
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {result.fraud_analysis.triggered_rules.map((tr, idx) => (
                    <div key={idx} style={{ background: 'rgba(11,19,43,0.5)', border: '1px solid var(--border-color)', padding: '0.6rem 0.85rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{tr.rule_code}: {tr.rule_name}</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tr.description}</p>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} className="mono">+{tr.contribution} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alert Generated Action Notice */}
            {result.alert_generated && result.alert && (
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--risk-medium)', color: '#fcd34d', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  🚨 <strong>Fraud Alert Created!</strong> Alert #{result.alert.id} pushed live via WebSocket.
                </div>
                {onViewAlert && (
                  <button
                    onClick={() => { onClose(); onViewAlert(result.alert.id); }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    View Alert <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={onClose} className="btn btn-primary">Done</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
