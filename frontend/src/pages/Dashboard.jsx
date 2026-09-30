import React from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { Empty, Loading, Notice, PageHeader, StatCard, Status } from '../components/ui';
import { prettyDate } from '../utils/dates';

export function Dashboard({ analytics = false }) {
  const { data, error, busy, reload } = useLoad(() => api('/dashboard/stats'));
  const title = analytics ? 'Operational analytics' : 'Your overview';
  return (
    <>
      <PageHeader
        eyebrow={analytics ? 'REPORTING' : 'WORKSPACE'}
        title={title}
        sub={
          analytics
            ? 'A clear picture of visits and gate activity.'
            : 'A live snapshot of your gate-pass activity.'
        }
        action={
          <button className="btn btn-secondary" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {error && <Notice type="error">{error}</Notice>}
      {busy ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard label="Total passes" value={data.total} icon={FileCheck2} />
            <StatCard
              label="Pending review"
              value={data.pending}
              icon={Clock3}
              tone="amber"
              note="Needs approval"
            />
            <StatCard label="Approved" value={data.approved} icon={CheckCircle2} tone="green" />
            <StatCard label="Rejected" value={data.rejected} icon={XCircle} tone="red" />
            <StatCard
              label="Currently inside"
              value={data.currentVisitors}
              icon={Users}
              tone="violet"
            />
            <StatCard label="Total entries" value={data.totalEntries} icon={ArrowDownToLine} />
            <StatCard
              label="Total exits"
              value={data.totalExits}
              icon={ArrowUpRight}
              tone="green"
            />
          </div>
          <ActivityPanel />
          <div className="callout">
            <div className="callout-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <b>Every visit has a clear record.</b>
              <p>Approvals, gate scans, and visit history stay connected in one place.</p>
            </div>
            <span className="callout-live">
              <i />
              Live
            </span>
          </div>
        </>
      )}
    </>
  );
}
function ActivityPanel() {
  const { data, error, busy } = useLoad(() => api('/passes'));
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Recent gate passes</h2>
          <p>Latest requests across your workspace</p>
        </div>
        <Link className="text-link" to="/passes">
          View all <ArrowRight size={15} />
        </Link>
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
                <th>VISIT DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-person">
                      <div className="person-avatar">{p.visitor_name[0]}</div>
                      <span>
                        <b>{p.visitor_name}</b>
                        <small>{p.organization || 'Guest visitor'}</small>
                      </span>
                    </div>
                  </td>
                  <td>{p.purpose}</td>
                  <td>{prettyDate(p.visit_date)}</td>
                  <td>
                    <Status status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No activity yet" text="Your latest gate passes will appear here." />
      )}
    </section>
  );
}
