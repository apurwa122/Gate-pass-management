import React from 'react';
import { Activity, CheckCircle2, FileCheck2, X, XCircle } from 'lucide-react';

export function PageHeader({ eyebrow, title, sub, action }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="muted">{sub}</p>
      </div>
      {action}
    </div>
  );
}
export function Notice({ type = 'info', children }) {
  const Icon = type === 'error' ? XCircle : type === 'success' ? CheckCircle2 : Activity;
  return (
    <div className={`notice ${type}`}>
      <Icon size={17} />
      <span>{children}</span>
    </div>
  );
}
export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}

export function Status({ status }) {
  return (
    <span className={`status status-${(status || '').toLowerCase()}`}>
      <i />
      {status}
    </span>
  );
}
export function StatCard({ label, value, icon: Icon, tone = 'blue', note }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <strong>{value ?? '—'}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FileCheck2 size={20} />
      </span>
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-card">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Toast({ message, onClose }) {
  return (
    <div className="toast">
      <XCircle size={17} />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
