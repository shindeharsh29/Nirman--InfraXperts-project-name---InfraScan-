import React from 'react';
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';
import { useNotifications } from './NotificationContext';

const TOAST_STYLES = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D', Icon: CheckCircle },
  danger:  { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', Icon: AlertCircle },
  warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', Icon: AlertTriangle },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', Icon: Info },
};

export default function ToastStack() {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none'
    }}>
      {toasts.map(({ id, message, type }) => {
        const { bg, border, color, Icon } = TOAST_STYLES[type] || TOAST_STYLES.info;
        return (
          <div key={id} style={{
            pointerEvents: 'auto',
            background: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${color}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            maxWidth: 360, fontSize: 13, color: '#111827',
            animation: 'slideInRight 0.3s ease'
          }}>
            <Icon size={16} color={color} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
            <button onClick={() => dismissToast(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9CA3AF', padding: 2, display: 'flex'
            }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
