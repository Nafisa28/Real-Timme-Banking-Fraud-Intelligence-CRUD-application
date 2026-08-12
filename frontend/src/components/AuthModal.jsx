import React, { useState } from 'react';
import { ShieldCheck, Mail, UserPlus, LogIn, CheckCircle } from 'lucide-react';
import { apiFetch, setAuthToken } from '../api';
import { supabase } from '../supabaseClient';

export default function AuthModal({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Bank Staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Register in local backend DB first
      let backendRegistered = false;
      try {
        await apiFetch('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, role })
        });
        backendRegistered = true;
      } catch (backendErr) {
        if (backendErr.message.toLowerCase().includes('already exists')) {
          setError('An account with this email already exists. Switching to Login...');
          setTimeout(() => setIsSignup(false), 1200);
          setLoading(false);
          return;
        }
        console.warn('Backend signup note:', backendErr.message);
      }

      // Step 2: Try Supabase Auth with a 6-second timeout to avoid hanging UI
      let supabaseSuccess = false;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase Auth connection timeout')), 6000)
        );

        const signUpPromise = supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role }
          }
        });

        const { data, error: signUpError } = await Promise.race([signUpPromise, timeoutPromise]);

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already') || signUpError.code === 'user_already_exists') {
            setError('Account already registered! Switching to Login...');
            setTimeout(() => setIsSignup(false), 1200);
            setLoading(false);
            return;
          }
          console.warn('Supabase Auth note:', signUpError.message);
        } else {
          supabaseSuccess = true;
        }
      } catch (sbErr) {
        console.warn('Supabase Auth note:', sbErr.message);
      }

      if (backendRegistered || supabaseSuccess) {
        setVerificationSent(true);
      } else {
        throw new Error('Could not complete signup. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Attempt local backend login directly
      let backendData = null;
      let backendErr = null;

      try {
        backendData = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
      } catch (bErr) {
        backendErr = bErr;
      }

      if (backendData && backendData.token) {
        setAuthToken(backendData.token);
        onLoginSuccess(backendData.user);
        return;
      }

      // Step 2: If backend login fails, check Supabase Auth with a timeout
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase connection timeout')), 6000)
        );

        const signInPromise = supabase.auth.signInWithPassword({ email, password });
        const { data: authData, error: authError } = await Promise.race([signInPromise, timeoutPromise]);

        if (authError) {
          if (authError.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Please verify your email first. Check your inbox for the verification link.');
          }
          throw new Error(authError.message);
        }

        // After Supabase auth succeeds, login to backend
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        setAuthToken(data.token);
        onLoginSuccess(data.user);
        return;
      } catch (sbErr) {
        throw backendErr || sbErr;
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setTimeout(() => {
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: demoPassword })
      }).then(data => {
        setAuthToken(data.token);
        onLoginSuccess(data.user);
      }).catch(err => setError(err.message));
    }, 100);
  }

  // ── Verification email sent screen ───────────────────────────────
  if (verificationSent) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" style={{ maxWidth: '440px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '1rem', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <CheckCircle size={40} color="white" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Verify Your Email
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            A verification link has been sent to <br />
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
            <br /><br />
            Please check your inbox and click the link to activate your account. Once verified, you can log in.
          </p>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#6ee7b7', margin: 0 }}>
              📧 Check your spam folder if you don't see it within 2 minutes.
            </p>
          </div>
          <button
            onClick={() => { setVerificationSent(false); setIsSignup(false); }}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            <LogIn size={16} /> Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '440px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', padding: '0.75rem', borderRadius: '12px', marginBottom: '0.75rem' }}>
            <ShieldCheck size={36} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {isSignup ? 'Create Account' : 'Banking System Login'}
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Real-Time Banking Fraud Intelligence Platform
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={isSignup ? handleSignup : handleLogin}>
          {isSignup && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Work Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="analyst@bank.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label className="form-label">System Role</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="Bank Staff">Bank Staff (Teller / Branch Officer)</option>
                <option value="Fraud Analyst">Fraud Analyst (Alert Investigator)</option>
                <option value="Admin">System Administrator</option>
              </select>
            </div>
          )}

          {isSignup && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              📧 A verification email will be sent to confirm your account.
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading
              ? (isSignup ? 'Creating Account...' : 'Logging in...')
              : isSignup
                ? <><UserPlus size={16} /> Sign Up & Send Verification</>
                : <><LogIn size={16} /> Log In</>
            }
          </button>
        </form>

        {!isSignup && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Quick Demo One-Click Sign In:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <button onClick={() => handleDemoLogin('admin@bank.com', 'Password123!')} className="btn btn-secondary" style={{ fontSize: '0.725rem', padding: '0.4rem 0.2rem' }}>Admin</button>
              <button onClick={() => handleDemoLogin('analyst@bank.com', 'Password123!')} className="btn btn-secondary" style={{ fontSize: '0.725rem', padding: '0.4rem 0.2rem' }}>Analyst</button>
              <button onClick={() => handleDemoLogin('staff@bank.com', 'Password123!')} className="btn btn-secondary" style={{ fontSize: '0.725rem', padding: '0.4rem 0.2rem' }}>Staff</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
