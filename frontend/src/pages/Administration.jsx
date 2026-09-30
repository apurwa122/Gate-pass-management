import React, { useState } from 'react';
import { ArrowRight, History, RefreshCw, Search, Users } from 'lucide-react';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { Empty, Field, Loading, Modal, Notice, PageHeader, Status } from '../components/ui';
import { prettyDate, prettyTime } from '../utils/dates';
import { roleLabel } from '../utils/roles';

export function Visitors() {
  const { data, error, busy } = useLoad(() => api('/visitors'));
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const filtered = (data || []).filter((v) =>
    `${v.name} ${v.phone} ${v.organization || ''} ${v.email || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function open(v) {
    setDetailError('');
    try {
      setDetail(await api(`/visitors/${v.id}`));
    } catch (e) {
      setDetailError(e.message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="DIRECTORY"
        title="Visitors"
        sub="A searchable directory with each visitor’s request history."
      />
      <div className="list-tools">
        <div className="searchbox">
          <Search size={16} />
          <input
            placeholder="Search by name, company or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>{filtered.length} visitors</span>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      <section className="panel">
        {busy ? (
          <Loading />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>VISITOR</th>
                  <th>ORGANIZATION</th>
                  <th>CONTACT</th>
                  <th>VISIT HISTORY</th>
                  <th>LAST VISIT REQUEST</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="table-person">
                        <div className="person-avatar">{v.name[0]}</div>
                        <span>
                          <b>{v.name}</b>
                          <small>Added {prettyDate(v.created_at?.slice(0, 10))}</small>
                        </span>
                      </div>
                    </td>
                    <td>{v.organization || '—'}</td>
                    <td>
                      <span>{v.phone}</span>
                      <small className="cell-sub">{v.email || ''}</small>
                    </td>
                    <td>
                      <span className="count-chip">
                        {v.pass_count} {v.pass_count === 1 ? 'visit' : 'visits'}
                      </span>
                    </td>
                    <td>{prettyDate(v.last_visit?.slice(0, 10))}</td>
                    <td>
                      <button className="btn btn-quiet btn-sm" onClick={() => open(v)}>
                        History <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No visitors found" text="Try another search term." />
        )}
      </section>
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="visitor-detail">
            <div className="detail-summary">
              <span className="person-avatar large">{detail.name[0]}</span>
              <div>
                <b>{detail.organization || 'Guest visitor'}</b>
                <span>
                  {detail.phone}
                  {detail.email ? ` · ${detail.email}` : ''}
                </span>
              </div>
            </div>
            <h3>Visit history</h3>
            {detail.passes?.length ? (
              <div className="detail-history">
                {detail.passes.map((p) => (
                  <div key={p.id} className="detail-history-row">
                    <div>
                      <b>{p.purpose}</b>
                      <span>{prettyDate(p.visit_date)}</span>
                    </div>
                    <Status status={p.status} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No visit requests" text="There is no visit history for this visitor." />
            )}
          </div>
        </Modal>
      )}
      {detailError && <Toast message={detailError} onClose={() => setDetailError('')} />}
    </>
  );
}
export function Records() {
  const { data, error, busy, reload } = useLoad(() => api('/entry-exit'));
  const [query, setQuery] = useState('');
  const filtered = (data || []).filter((r) =>
    `${r.visitor_name} ${r.organization || ''} ${r.purpose}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="GATE ACTIVITY"
        title="Entry & exit records"
        sub="A chronological record of verified visits and departures."
        action={
          <button className="btn btn-secondary" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      <div className="list-tools">
        <div className="searchbox">
          <Search size={16} />
          <input
            placeholder="Search visitor or purpose…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>{filtered.filter((r) => !r.exit_time).length} active inside</span>
      </div>
      {error && <Notice type="error">{error}</Notice>}
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
                  <th>ENTRY TIME</th>
                  <th>EXIT TIME</th>
                  <th>VERIFIED BY</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="table-person">
                        <div className="person-avatar">{r.visitor_name[0]}</div>
                        <span>
                          <b>{r.visitor_name}</b>
                          <small>{r.organization || 'Guest visitor'}</small>
                        </span>
                      </div>
                    </td>
                    <td>{r.purpose}</td>
                    <td>{prettyTime(r.entry_time)}</td>
                    <td>
                      {r.exit_time ? (
                        prettyTime(r.exit_time)
                      ) : (
                        <span className="inside-label">
                          <i />
                          Inside
                        </span>
                      )}
                    </td>
                    <td>{r.verified_by_name}</td>
                    <td>
                      {r.exit_time ? (
                        <span className="status status-used">
                          <i />
                          Complete
                        </span>
                      ) : (
                        <span className="status status-approved">
                          <i />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No entry records yet" text="Verified visitor entries will show up here." />
        )}
      </section>
    </>
  );
}
export function AdminUsers() {
  const { data, error, busy, reload } = useLoad(() => api('/users'));
  const [edit, setEdit] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'requester', password: '' });
  const [working, setWorking] = useState(false);
  const [query, setQuery] = useState('');
  const roles = ['requester', 'approver', 'security', 'admin'];
  function start(user) {
    setMessage('');
    setEdit(user?.id || 'new');
    setForm(
      user
        ? { name: user.name, email: user.email, role: user.role, password: '' }
        : { name: '', email: '', role: 'requester', password: '' },
    );
  }
  async function save(e) {
    e.preventDefault();
    setWorking(true);
    setMessage('');
    try {
      await api(edit === 'new' ? '/users' : `/users/${edit}`, {
        method: edit === 'new' ? 'POST' : 'PUT',
        body: form,
      });
      setEdit(null);
      setMessage('User saved successfully.');
      reload();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setWorking(false);
    }
  }
  const rows = (data || []).filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="User management"
        sub="Create accounts and assign workspace roles."
        action={
          <button className="btn btn-primary" onClick={() => start(null)}>
            <Users size={15} /> Add user
          </button>
        }
      />
      {message && (
        <Notice type={message.includes('successfully') ? 'success' : 'error'}>{message}</Notice>
      )}
      {error && <Notice type="error">{error}</Notice>}
      <div className="list-tools">
        <div className="searchbox">
          <Search size={16} />
          <input
            placeholder="Search name, email or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>{rows.length} users</span>
      </div>
      <section className="panel">
        {busy ? (
          <Loading />
        ) : rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>ADDED</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-person">
                        <div className="person-avatar">{u.name[0]}</div>
                        <span>
                          <b>{u.name}</b>
                        </span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="count-chip">{roleLabel[u.role]}</span>
                    </td>
                    <td>{prettyDate(u.created_at?.slice(0, 10))}</td>
                    <td>
                      <button className="btn btn-quiet btn-sm" onClick={() => start(u)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No users found" text="Try a different search term." />
        )}
      </section>
      {edit && (
        <Modal
          title={edit === 'new' ? 'Add workspace user' : 'Edit workspace user'}
          onClose={() => setEdit(null)}
        >
          <form className="user-form" onSubmit={save}>
            <Field label="Full name">
              <input
                required
                maxLength="100"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email address">
              <input
                required
                type="email"
                maxLength="150"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Workspace role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={edit === 'new' ? 'Temporary password' : 'New password'}
              hint={
                edit === 'new'
                  ? 'At least 8 characters.'
                  : 'Leave blank to keep the current password.'
              }
            >
              <input
                type="password"
                minLength={edit === 'new' ? 8 : undefined}
                required={edit === 'new'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            {message && <Notice type="error">{message}</Notice>}
            <div className="approval-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={working}>
                {working ? 'Saving…' : 'Save user'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
