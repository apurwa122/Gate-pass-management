import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clock3,
  FilePlus2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoad } from '../hooks/useLoad';
import { Empty, Field, Loading, Modal, Notice, PageHeader, Status, Toast } from '../components/ui';
import { prettyDate } from '../utils/dates';

export function Passes() {
  const { data, error, busy, reload } = useLoad(() => api('/passes'));
  const [query, setQuery] = useState('');
  const [qr, setQr] = useState(null);
  const [qrError, setQrError] = useState('');
  const { user } = useAuth();
  const filtered = (data || []).filter((p) =>
    `${p.visitor_name} ${p.purpose} ${p.status}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function showQr(pass) {
    setQrError('');
    try {
      setQr(await api('/qr/generate', { method: 'POST', body: { passId: pass.id } }));
    } catch (e) {
      setQrError(e.message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="GATE PASSES"
        title="Passes & requests"
        sub="Track the review status and QR passes for every visit."
        action={
          <Link className="btn btn-primary" to="/new-request">
            <FilePlus2 size={16} /> New request
          </Link>
        }
      />
      {error && <Notice type="error">{error}</Notice>}
      <div className="list-tools">
        <div className="searchbox">
          <Search size={16} />
          <input
            placeholder="Search visitors or purpose…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>
          {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
        </span>
      </div>
      <section className="panel">
        {busy ? (
          <Loading />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>VISITOR</th>
                  <th>PURPOSE</th>
                  <th>VISIT DATE</th>
                  <th>SUBMITTED</th>
                  <th>STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-person">
                        <div className="person-avatar">{p.visitor_name[0]}</div>
                        <span>
                          <b>{p.visitor_name}</b>
                          <small>{p.organization || p.phone}</small>
                        </span>
                      </div>
                    </td>
                    <td>{p.purpose}</td>
                    <td>{prettyDate(p.visit_date)}</td>
                    <td>{prettyDate(p.created_at?.slice(0, 10))}</td>
                    <td>
                      <Status status={p.status} />
                    </td>
                    <td>
                      {['Approved', 'Used'].includes(p.status) &&
                      (user.role === 'requester' || user.role === 'admin') ? (
                        <button className="btn btn-quiet btn-sm" onClick={() => showQr(p)}>
                          <ShieldCheck size={15} /> QR pass
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={query ? 'No matching passes' : 'No gate passes yet'}
            text={
              query
                ? 'Try a different visitor name or search term.'
                : 'Create a request to start a visitor approval.'
            }
            action={
              <Link className="btn btn-primary btn-sm" to="/new-request">
                <FilePlus2 size={15} /> New request
              </Link>
            }
          />
        )}
      </section>
      {qr && (
        <Modal title="Your visitor pass" onClose={() => setQr(null)}>
          <div className="qr-dialog">
            <div className="qr-code-wrap">
              <img src={qr.qrDataUrl} alt="QR code visitor pass" />
            </div>
            <b>Show this code at the entrance</b>
            <p>Security will scan the code and verify your pass.</p>
            <code>{qr.reference}</code>
          </div>
        </Modal>
      )}
      {qrError && <Toast message={qrError} onClose={() => setQrError('')} />}
    </>
  );
}
export function NewRequest() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    organization: '',
    purpose: '',
    visitDate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/passes', { method: 'POST', body: form });
      setOk(true);
      setTimeout(() => nav('/passes'), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="NEW REQUEST"
        title="Plan a visit"
        sub="Share a few details so your host can review the request."
      />
      <div className="form-layout">
        <section className="panel request-panel">
          <div className="panel-head">
            <div>
              <h2>Visitor details</h2>
              <p>All fields with an asterisk are required.</p>
            </div>
            <span className="step-pill">
              01 <span>/</span> 01
            </span>
          </div>
          {error && <Notice type="error">{error}</Notice>}
          {ok && <Notice type="success">Request submitted. Taking you to your passes…</Notice>}
          <form onSubmit={submit} className="request-form">
            <div className="form-grid">
              <Field label="Visitor name *">
                <input
                  name="name"
                  required
                  maxLength="100"
                  value={form.name}
                  onChange={change}
                  placeholder="e.g. Jordan Lee"
                />
              </Field>
              <Field label="Phone number *">
                <input
                  name="phone"
                  required
                  maxLength="30"
                  value={form.phone}
                  onChange={change}
                  placeholder="e.g. +91 98765 43210"
                />
              </Field>
              <Field label="Email address">
                <input
                  type="email"
                  name="email"
                  maxLength="150"
                  value={form.email}
                  onChange={change}
                  placeholder="visitor@company.com"
                />
              </Field>
              <Field label="Organization">
                <input
                  name="organization"
                  maxLength="100"
                  value={form.organization}
                  onChange={change}
                  placeholder="Company or organization"
                />
              </Field>
              <Field label="Visit date *">
                <input
                  type="date"
                  name="visitDate"
                  min={new Date().toISOString().slice(0, 10)}
                  required
                  value={form.visitDate}
                  onChange={change}
                />
              </Field>
              <Field label="Purpose of visit *">
                <input
                  name="purpose"
                  maxLength="250"
                  required
                  value={form.purpose}
                  onChange={change}
                  placeholder="e.g. Product discovery meeting"
                />
              </Field>
            </div>
            <div className="form-divider" />
            <div className="form-foot">
              <span>
                <ShieldCheck size={15} /> Reviewed before a pass is issued
              </span>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit request'} <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </section>
        <aside className="side-note">
          <div className="side-note-icon">
            <Clock3 size={18} />
          </div>
          <b>What happens next?</b>
          <p>
            Your host reviews the request. Once approved, the visitor receives a QR pass to show at
            the entrance.
          </p>
          <div className="mini-flow">
            <div>
              <span className="flow-dot amber-dot" />
              Request submitted
            </div>
            <div className="flow-line" />
            <div>
              <span className="flow-dot green-dot" />
              Host approval
            </div>
            <div className="flow-line" />
            <div>
              <span className="flow-dot blue-dot" />
              QR pass issued
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Approvals() {
  const { data, error, busy, reload } = useLoad(() => api('/approvals/pending'));
  const [remarks, setRemarks] = useState({});
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(null);
  async function decide(p, decision) {
    setWorking(p.id);
    setNotice('');
    try {
      await api(`/approvals/${p.id}/${decision}`, {
        method: 'POST',
        body: { remarks: remarks[p.id] || '' },
      });
      setNotice(`Request ${decision} successfully.`);
      reload();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setWorking(null);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="REVIEW QUEUE"
        title="Approval requests"
        sub="Review the visit details before a QR pass is issued."
        action={
          <button className="btn btn-secondary" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {error && <Notice type="error">{error}</Notice>}
      {notice && (
        <Notice type={notice.includes('successfully') ? 'success' : 'error'}>{notice}</Notice>
      )}
      {busy ? (
        <Loading />
      ) : data?.length ? (
        <div className="approval-list">
          {data.map((p) => (
            <section className="panel approval-card" key={p.id}>
              <div className="approval-top">
                <div className="table-person">
                  <div className="person-avatar large">{p.visitor_name[0]}</div>
                  <span>
                    <b>{p.visitor_name}</b>
                    <small>
                      {p.organization || 'Guest visitor'} · {p.phone}
                    </small>
                  </span>
                </div>
                <Status status={p.status} />
              </div>
              <div className="request-facts">
                <div>
                  <small>Purpose of visit</small>
                  <b>{p.purpose}</b>
                </div>
                <div>
                  <small>Visit date</small>
                  <b>{prettyDate(p.visit_date)}</b>
                </div>
                <div>
                  <small>Requested by</small>
                  <b>{p.requester_name}</b>
                </div>
                <div>
                  <small>Submitted</small>
                  <b>{prettyDate(p.created_at?.slice(0, 10))}</b>
                </div>
              </div>
              <Field label="Review note" hint="Optional. This will be saved with the decision.">
                <input
                  value={remarks[p.id] || ''}
                  maxLength="250"
                  onChange={(e) => setRemarks({ ...remarks, [p.id]: e.target.value })}
                  placeholder="Add a note for the requester…"
                />
              </Field>
              <div className="approval-actions">
                <button
                  className="btn btn-danger-soft"
                  disabled={working === p.id}
                  onClick={() => decide(p, 'reject')}
                >
                  <X size={15} /> Reject
                </button>
                <button
                  className="btn btn-green"
                  disabled={working === p.id}
                  onClick={() => decide(p, 'approve')}
                >
                  <Check size={15} /> Approve & issue pass
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty title="All caught up" text="There are no pending requests to review right now." />
        </section>
      )}
      <ApprovalHistory />
    </>
  );
}
function ApprovalHistory() {
  const { data, busy, error } = useLoad(() => api('/approvals'));
  return (
    <section className="panel history-panel">
      <div className="panel-head">
        <div>
          <h2>Recent decisions</h2>
          <p>Latest completed reviews</p>
        </div>
      </div>
      {busy ? (
        <Loading />
      ) : error ? (
        <Notice type="error">{error}</Notice>
      ) : data?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>VISITOR</th>
                <th>PURPOSE</th>
                <th>DECISION</th>
                <th>REVIEWED BY</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((a) => (
                <tr key={a.id}>
                  <td>{a.visitor_name}</td>
                  <td>{a.purpose}</td>
                  <td>
                    <Status status={a.decision} />
                  </td>
                  <td>{a.approver_name}</td>
                  <td>{prettyDate(a.approved_at?.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No decisions yet" text="Completed approvals will be shown here." />
      )}
    </section>
  );
}
