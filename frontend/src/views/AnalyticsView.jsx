import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Shield, Cpu, Activity, PieChart as PieIcon, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { apiFetch } from '../api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await apiFetch('/analytics/summary');
      setData(res);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetrainML() {
    setRetraining(true);
    setRetrainMsg('');
    try {
      const res = await apiFetch('/analytics/retrain-ml', { method: 'POST' });
      setRetrainMsg(res.message || 'ML Model Retrained Successfully!');
      if (res.metrics && data) {
        setData({
          ...data,
          ml_model_metrics: res.metrics
        });
      }
    } catch (err) {
      setRetrainMsg('ML retraining failed: ' + err.message);
    } finally {
      setRetraining(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading executive RBI analytics...</div>;
  }

  if (!data) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--risk-high)' }}>Error loading analytics data.</div>;
  }

  const pieData = [
    { name: 'Low Risk', value: data.risk_distribution.Low },
    { name: 'Medium Risk', value: data.risk_distribution.Medium },
    { name: 'High Risk', value: data.risk_distribution.High }
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 1rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <BarChart3 color="var(--accent-cyan)" size={24} /> Executive Analytics & ML Intelligence (₹ INR)
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Comprehensive overview of transaction volume in ₹ (INR), fraud rate %, and RBI cybersecurity benchmark metrics</p>
        </div>
        <button onClick={fetchAnalytics} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Refresh Metrics
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        
        <div className="glass-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL TRANSACTION VOLUME (₹)</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem' }} className="mono">
            ₹{Number(data.total_volume_usd || 0).toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.total_transactions} Transactions Screened</span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>FRAUD RATE %</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--risk-high)' }} className="mono">
            {data.fraud_rate_percentage}%
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.flagged_transactions} Flagged Suspicious</span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ML MODEL F1-SCORE</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: '#c084fc' }} className="mono">
            {data.ml_model_metrics?.f1_score}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Harmonic Mean (Precision & Recall)</span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ML MODEL ACCURACY</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--risk-low)' }} className="mono">
            {(data.ml_model_metrics?.accuracy * 100).toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trained on Synthetic Datasets</span>
        </div>

      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Hourly Volume Trend Area Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--accent-cyan)" size={18} /> Transaction Volume (₹) & Fraud Trend
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourly_trends}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00b4d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ background: '#1c2541', borderColor: '#2b3a67', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="volume" stroke="#00b4d8" fillOpacity={1} fill="url(#colorVolume)" name="Volume (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Distribution Pie Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieIcon color="#f59e0b" size={18} /> Risk Level Distribution
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1c2541', borderColor: '#2b3a67', borderRadius: '8px', color: '#fff' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Section: ML Model Precision / Recall Tuning & Retrain Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu color="#c084fc" size={20} /> Machine Learning Model Evaluation & Precision/Recall Benchmark
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Evaluates Scikit-Learn / XGBoost fraud scoring accuracy under RBI compliance frameworks
            </p>
          </div>

          <button
            onClick={handleRetrainML}
            className="btn btn-primary"
            disabled={retraining}
          >
            <RefreshCw size={16} className={retraining ? 'spin' : ''} /> {retraining ? 'Retraining ML Model...' : 'Retrain ML Model on Synthetic Data'}
          </button>
        </div>

        {retrainMsg && (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--risk-low)', color: '#34d399', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {retrainMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          
          <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRECISION</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }} className="mono">
              {(data.ml_model_metrics?.precision * 100).toFixed(1)}%
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Low False Positive Rate</p>
          </div>

          <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RECALL</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c084fc' }} className="mono">
              {(data.ml_model_metrics?.recall * 100).toFixed(1)}%
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High Fraud Detection Coverage</p>
          </div>

          <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>F1-SCORE</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--risk-low)' }} className="mono">
              {data.ml_model_metrics?.f1_score}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Harmonic Balance</p>
          </div>

          <div style={{ background: 'rgba(11,19,43,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACCURACY</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }} className="mono">
              {(data.ml_model_metrics?.accuracy * 100).toFixed(1)}%
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall Classification</p>
          </div>

        </div>

      </div>

    </div>
  );
}
