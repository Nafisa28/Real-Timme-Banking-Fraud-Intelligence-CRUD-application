import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle, Edit3, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../api';

export default function RulesView({ user }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [weight, setWeight] = useState(1.0);
  const [threshold, setThreshold] = useState(50000.0);
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      setLoading(true);
      const data = await apiFetch('/rules');
      setRules(data);
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(rule) {
    setEditingRule(rule);
    setWeight(rule.weight);
    setThreshold(rule.threshold);
    setIsActive(Boolean(rule.is_active));
    setMsg('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editingRule) return;
    try {
      const updated = await apiFetch(`/rules/${editingRule.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          weight: Number(weight),
          threshold: Number(threshold),
          is_active: isActive ? 1 : 0
        })
      });

      setRules(rules.map(r => r.id === updated.id ? updated : r));
      setMsg(`RBI Fraud Rule '${updated.rule_name}' updated live without server restart!`);
      setEditingRule(null);
    } catch (err) {
      alert(err.message || 'Failed to update rule');
    }
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading RBI fraud rule configurations...</div>;
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '1.5rem auto', padding: '0 1rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
          <Sliders color="var(--accent-cyan)" size={24} /> Reserve Bank of India (RBI) Cyber & Fraud Rules Engine
        </h2>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Configurable rule thresholds & weights complying with official RBI Digital Payment Security Controls & Cyber Security Framework for Banks
        </p>
      </div>

      {msg && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--risk-low)', color: '#34d399', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {msg}
        </div>
      )}

      {/* Rules Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>RBI Code</th>
              <th>Rule Name & Category</th>
              <th>RBI Compliance Mandate & Description</th>
              <th>Weight Multiplier</th>
              <th>Threshold Value (₹)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{r.rule_code}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.rule_name}</div>
                  <span className="badge badge-medium" style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>{r.category}</span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.description}</td>
                <td className="mono" style={{ fontWeight: 700 }}>x{r.weight}</td>
                <td className="mono">₹{Number(r.threshold).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`badge ${r.is_active ? 'badge-low' : 'badge-high'}`}>
                    {r.is_active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </td>
                <td>
                  {user && user.role === 'Admin' ? (
                    <button onClick={() => handleEdit(r)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
                      <Edit3 size={14} /> Edit
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Edit RBI Fraud Rule: {editingRule.rule_code}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{editingRule.rule_name}</p>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Weight Multiplier (0.1 - 5.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  className="form-input mono"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Threshold Cutoff Value (₹ INR)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input mono"
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  Enable / Active RBI Rule Status
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setEditingRule(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Rule Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
