import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNotifications } from '../components/NotificationContext';
import { User, Bell, Moon, Sun, Shield, LogOut, Check, AlertCircle, Mail, Sliders } from 'lucide-react';

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20
    }}>
      <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: '0 22px' }}>{children}</div>
    </div>
  );
}

function SettingRow({ iconBg, iconColor, icon, title, description, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-sm)'
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: iconBg || 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor || 'var(--text-muted)', flexShrink: 0
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{title}</div>
          {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
        </div>
      </div>
      <div style={{ marginLeft: 24, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', padding: 0,
      background: value ? '#111827' : '#D1D5DB',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0
    }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
      }} />
    </button>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { addNotification } = useNotifications();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const [browserNotifs, setBrowserNotifs] = useState(Notification.permission === 'granted');
  const [saved, setSaved] = useState(false);

  const handleDarkMode = (val) => {
    setDarkMode(val);
    document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
    localStorage.setItem('theme', val ? 'dark' : 'light');
  };

  const handleBrowserNotifs = async (val) => {
    if (val) {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      setBrowserNotifs(granted);
      if (granted) addNotification('✅ Browser notifications enabled!', 'success');
    } else {
      setBrowserNotifs(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    addNotification('⚙️ Settings saved', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  const priorityThresholds = [
    { level: 'Critical', emoji: '🔴', threshold: '≥ 80', color: '#EF4444', bg: '#FEF2F2' },
    { level: 'High',     emoji: '🟠', threshold: '≥ 55', color: '#F97316', bg: '#FFF7ED' },
    { level: 'Medium',   emoji: '🟡', threshold: '≥ 35', color: '#EAB308', bg: '#FEFCE8' },
    { level: 'Low',      emoji: '🟢', threshold: '< 35',  color: '#22C55E', bg: '#F0FDF4' },
  ];

  return (
    <div className="animate-in" style={{ maxWidth: 600, margin: '0 auto' }}>

      {/* Profile Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
        borderRadius: 14, padding: '24px 28px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0
        }}>
          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 3 }}>{user?.username}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{user?.email || 'No email'}</span>
            <span style={{
              background: user?.is_admin ? '#065F46' : '#1E3A5F',
              color: user?.is_admin ? '#6EE7B7' : '#93C5FD',
              borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: '2px 8px'
            }}>
              {user?.is_admin ? '🛡️ Admin' : '👤 Citizen'}
            </span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <SettingRow
          iconBg={darkMode ? '#1E2035' : '#FFFBEB'} iconColor={darkMode ? '#818CF8' : '#D97706'}
          icon={darkMode ? <Moon size={18} /> : <Sun size={18} />}
          title="Dark mode" description="Switch between light and dark theme" last
        >
          <Toggle value={darkMode} onChange={handleDarkMode} />
        </SettingRow>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications">
        <SettingRow
          iconBg="#EFF6FF" iconColor="#2563EB"
          icon={<Bell size={18} />}
          title="Browser notifications" description="Get desktop alerts when report status changes"
        >
          <Toggle value={browserNotifs} onChange={handleBrowserNotifs} />
        </SettingRow>
        <SettingRow
          iconBg="#F0FDF4" iconColor="#16A34A"
          icon={<Bell size={18} />}
          title="In-app notifications" description="Real-time toasts and notification panel" last
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9999, padding: '3px 10px' }}>Always On</span>
        </SettingRow>
      </SectionCard>

      {/* Priority Thresholds (admin only) */}
      {user?.is_admin && (
        <SectionCard title="AI Priority Thresholds">
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {priorityThresholds.map(({ level, emoji, threshold, color, bg }) => (
                <div key={level} style={{
                  background: bg, borderRadius: 10, padding: '12px 16px',
                  borderLeft: `4px solid ${color}`
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color }}>{emoji} {level}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Score {threshold} / 100</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
              Configured in <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>backend/ai_model.py</code>
            </p>
          </div>
        </SectionCard>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={handleSave} className="btn btn-dark" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 24px' }}>
          {saved ? <><Check size={15} /> Saved!</> : 'Save Settings'}
        </button>
        <button onClick={logout} style={{
          display: 'flex', gap: 7, alignItems: 'center',
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
          borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
}
