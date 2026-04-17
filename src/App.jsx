import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { NotificationProvider, useNotifications } from './components/NotificationContext';
import NotificationPanel from './components/NotificationPanel';
import ToastStack from './components/Toast';
import Home from './pages/Home';
import Auth from './pages/Auth';
import SubmitComplaint from './pages/SubmitComplaint';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import SettingsPage from './pages/Settings';
import AreaScan from './pages/AreaScan';
import {
  LayoutDashboard, FileText, Send, Map, BarChart2,
  Bell, Settings, LogOut, ShieldCheck, AlertCircle, Scan
} from 'lucide-react';
import './index.css';

/* ===== SIDEBAR ===== */
function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const adminNav = [
    { to: '/admin', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/admin/reports', icon: <FileText size={17} />, label: 'All Reports' },
    { to: '/report', icon: <Send size={17} />, label: 'New Report' },
  ];

  const citizenNav = [
    { to: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'My Reports' },
    { to: '/report', icon: <Send size={17} />, label: 'Submit Damage' },
    { to: '/area-scan', icon: <Scan size={17} />, label: 'Area Scan' },
    { to: '/settings', icon: <Settings size={17} />, label: 'Settings' },
  ];

  const navItems = user?.is_admin ? adminNav : citizenNav;
  const initial = user?.username?.charAt(0)?.toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <AlertCircle size={18} color="white" />
        </div>
        <span>InfraScan</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Menu</div>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}

        {user?.is_admin && (
          <>
            <div className="sidebar-section-title">Admin</div>
            <NavLink to="/admin/map" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Map size={17} /><span>Incident Map</span>
            </NavLink>
            <NavLink to="/admin/analytics" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <BarChart2 size={17} /><span>Analytics</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Settings size={17} /><span>Settings</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => logout()}>
          <div className="sidebar-avatar">{initial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username}</div>
            <div className="sidebar-user-role">{user?.is_admin ? 'Administrator' : 'Citizen'}</div>
          </div>
          <LogOut size={15} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
}

/* ===== TOPBAR ===== */
function Topbar({ title }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">{title}</div>
        <div className="topbar-actions">
          {user?.is_admin && (
            <span className="badge" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
              <ShieldCheck size={11} style={{ marginRight: 4 }} /> Admin
            </span>
          )}
          <button className="topbar-icon-btn" onClick={() => setPanelOpen(true)} style={{ position: 'relative' }}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#EF4444', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NavLink to="/settings" className="topbar-icon-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={16} />
          </NavLink>
        </div>
      </div>
      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}

/* ===== APP SHELL (authenticated layout) ===== */
function AppShell({ children, title }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar title={title} />
        <div className="page-content animate-in">{children}</div>
      </div>
    </div>
  );
}

/* ===== ROUTE GUARDS ===== */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
};

/* ===== ROUTE TITLE MAP ===== */
function AppRoutes() {
  const location = useLocation();
  const { user } = useAuth();

  const TITLES = {
    '/admin': 'Dashboard Overview',
    '/admin/reports': 'All Incident Reports',
    '/admin/map': 'Incident Map',
    '/admin/analytics': 'Analytics',
    '/dashboard': 'My Reports',
    '/report': 'Submit New Report',
    '/area-scan': 'Area Scan Simulator',
  };
  const title = TITLES[location.pathname] || 'InfraScan';

  const authRoutes = ['/login', '/register', '/'].includes(location.pathname);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Navigate to="/login?mode=signup" replace />} />

      <Route path="/report" element={
        <ProtectedRoute>
          <AppShell title={title}>
            <SubmitComplaint />
          </AppShell>
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppShell title={title}>
            <UserDashboard />
          </AppShell>
        </ProtectedRoute>
      } />

      <Route path="/area-scan" element={
        <ProtectedRoute>
          <AppShell title={title}>
            <AreaScan />
          </AppShell>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <AdminRoute>
          <AppShell title={title}>
            <AdminDashboard view="overview" />
          </AppShell>
        </AdminRoute>
      } />
      <Route path="/admin/reports" element={
        <AdminRoute>
          <AppShell title={title}>
            <AdminDashboard view="reports" />
          </AppShell>
        </AdminRoute>
      } />
      <Route path="/admin/map" element={
        <AdminRoute>
          <AppShell title={title}>
            <AdminDashboard view="map" />
          </AppShell>
        </AdminRoute>
      } />
      <Route path="/admin/analytics" element={
        <AdminRoute>
          <AppShell title={title}>
            <AdminDashboard view="analytics" />
          </AppShell>
        </AdminRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <AppShell title="Settings">
            <SettingsPage />
          </AppShell>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <ToastStack />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}
