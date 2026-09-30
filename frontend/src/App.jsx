import React, { useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  DoorOpen,
  FileCheck2,
  FilePlus2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { roleLabel, homeFor } from './utils/roles';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Passes, NewRequest, Approvals } from './pages/Passes';
import { Scanner } from './pages/Security';
import { Visitors, Records, AdminUsers } from './pages/Administration';
import './styles.css';

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor[user.role]} replace />;
  return children;
}

function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor[user.role]} /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? homeFor[user.role] : '/login'} replace />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Shell />
          </Protected>
        }
      />
    </Routes>
  );
}
function Shell() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const is = (path) => loc.pathname === path;
  const common = [
    ['Overview', '/dashboard', LayoutDashboard, ['admin', 'requester']],
    ['My requests', '/passes', FileCheck2, ['requester', 'admin']],
    ['New request', '/new-request', FilePlus2, ['requester', 'admin']],
    ['Approvals', '/approvals', CheckCircle2, ['approver', 'admin']],
    ['QR scanner', '/scan', ShieldCheck, ['security', 'admin']],
    ['Visitors', '/visitors', Users, ['approver', 'security', 'admin']],
    ['Entry & exit', '/records', History, ['security', 'admin']],
    ['Analytics', '/analytics', BarChart3, ['admin']],
    ['User management', '/users', Users, ['admin']],
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <Link to={homeFor[user.role]} className="brand">
          <span className="brand-mark">
            <DoorOpen size={20} />
          </span>
          <span>
            gatepass<span className="brand-period">.</span>
            <small>VISITOR MANAGEMENT</small>
          </span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {common
            .filter((x) => x[3].includes(user.role))
            .map(([label, path, Icon]) => (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={`nav-link ${is(path) ? 'active' : ''}`}
              >
                <Icon size={17} />
                {label}
                {label === 'Approvals' && <span className="nav-note">Review</span>}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">
              <ShieldCheck size={18} />
            </div>
            <b>Secure by design</b>
            <p>Every visit, verified and recorded.</p>
          </div>
          <div className="user-card">
            <div className="avatar">
              {user.name
                .split(' ')
                .map((x) => x[0])
                .join('')}
            </div>
            <div className="user-label">
              <strong>{user.name}</strong>
              <span>{roleLabel[user.role]}</span>
            </div>
            <button
              aria-label="Sign out"
              title="Sign out"
              className="icon-btn logout"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-btn mobile-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-sep">/</span>
            <b>{common.find((x) => x[1] === loc.pathname)?.[0] || 'Gate pass'}</b>
          </div>
          <div className="topbar-right">
            <span className="system-dot"></span>
            <span>System operational</span>
            <div className="mini-avatar">{user.name[0]}</div>
          </div>
        </header>
        <div className="content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/passes" element={<Passes />} />
            <Route path="/new-request" element={<NewRequest />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/scan" element={<Scanner />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/records" element={<Records />} />
            <Route path="/analytics" element={<Dashboard analytics />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="*" element={<Navigate to={homeFor[user.role]} replace />} />
          </Routes>
        </div>
        <footer className="footer">
          <span>
            GatePass <span className="brand-period">·</span> Visitor management
          </span>
          <span>Secure access, made simple.</span>
        </footer>
      </main>
    </div>
  );
}

export function AppRoot() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  );
}
