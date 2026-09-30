import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DoorOpen, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../utils/roles';
import { Field, Notice } from '../components/ui';

export function Login() {
  const pagesPreview = import.meta.env.VITE_PAGES_PREVIEW === 'true';
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('requester@gatepass.local');
  const [password, setPassword] = useState('GatePass123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      const u = JSON.parse(localStorage.getItem('gatepass_user'));
      nav(homeFor[u.role]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-wrap">
      <div className="login-brand">
        <span className="brand-mark">
          <DoorOpen size={21} />
        </span>
        <span>
          gatepass<span className="brand-period">.</span>
        </span>
      </div>
      <section className="login-card">
        <div className="login-eyebrow">
          <ShieldCheck size={15} /> SECURE WORKSPACE
        </div>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to your GatePass workspace.</p>
        {pagesPreview ? (
          <Notice>
            This GitHub Pages preview hosts the frontend only. Sign-in and visitor workflows need
            the Express API, which GitHub Pages cannot run.
          </Notice>
        ) : (
          error && <Notice type="error">{error}</Notice>
        )}
        <form onSubmit={submit} className="form-stack">
          <Field label="Work email">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button className="btn btn-primary btn-full" disabled={busy || pagesPreview}>
            {pagesPreview ? 'API not connected' : busy ? 'Signing in...' : 'Sign in'}{' '}
            <ArrowRight size={16} />
          </button>
        </form>
        {!pagesPreview && (
          <div className="demo-box">
            <b>Demo access</b>
            <p>
              Select a role to try the workflow. Password: <code>GatePass123!</code>
            </p>
            <div className="demo-roles">
              {[
                ['requester', 'Requester'],
                ['approver', 'Approver'],
                ['security', 'Security'],
                ['admin', 'Admin'],
              ].map(([emailpart, label]) => (
                <button
                  type="button"
                  key={emailpart}
                  onClick={() => {
                    setEmail(`${emailpart}@gatepass.local`);
                    setPassword('GatePass123!');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      <span className="login-legal">A simple, secure way to manage every visit.</span>
    </div>
  );
}
