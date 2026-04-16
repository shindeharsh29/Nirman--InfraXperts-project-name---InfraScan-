import React from 'react';
import { Bell, CheckCircle, AlertCircle, Info, X, CheckCheck } from 'lucide-react';
import { useNotifications } from './NotificationContext';

const TYPE_ICON = {
  success: <CheckCircle size={14} color="#16A34A" />,
  danger:  <AlertCircle size={14} color="#DC2626" />,
  warning: <AlertCircle size={14} color="#D97706" />,
  info:    <Info size={14} color="#2563EB" />,
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function NotificationPanel({ open, onClose }) {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <>
      {/* Backdrop */}
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1099 }} />}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 360,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        zIndex: 1100, transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ background: '#EF4444', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Bell size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>No notifications yet</p>
            </div>
          ) : notifications.map(n => (
            <div key={n.id} style={{
              padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
              borderBottom: '1px solid var(--border)',
              background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)'
            }}>
              <div style={{ marginTop: 2 }}>{TYPE_ICON[n.type] || TYPE_ICON.info}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.time)}</p>
              </div>
              {!n.read && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 5 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
