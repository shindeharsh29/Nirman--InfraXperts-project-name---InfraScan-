import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevComplaints = useRef([]);
  const idCounter = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++idCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    const id = ++idCounter.current;
    const note = { id, message, type, time: new Date(), read: false };
    setNotifications(prev => [note, ...prev].slice(0, 50));
    setUnreadCount(c => c + 1);
    addToast(message, type);

    // Browser native notification
    if (Notification.permission === 'granted') {
      new Notification('InfraScan', { body: message, icon: '/favicon.ico' });
    }
  }, [addToast]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if (user && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  // Poll for status changes every 30 seconds
  useEffect(() => {
    if (!user || !token) return;

    const poll = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const endpoint = user.is_admin
          ? 'http://localhost:8000/api/complaints'
          : 'http://localhost:8000/api/users/my-complaints';
        const { data } = await axios.get(endpoint, { headers });

        // Check for new / status-changed items
        const prev = prevComplaints.current;
        if (prev.length > 0) {
          data.forEach(c => {
            const old = prev.find(p => p.id === c.id);
            if (!old) {
              // New report appeared (admin view)
              if (user.is_admin) {
                const type = (c.priority_level === 'Critical' || c.priority_level === 'High') ? 'danger' : 'info';
                addNotification(`🆕 New ${c.priority_level} priority report #${c.id} submitted`, type);
              }
            } else if (old.status !== c.status) {
              addNotification(`📋 Report #${c.id} status changed: ${old.status} → ${c.status}`, 'success');
            }
          });
        }
        prevComplaints.current = data;
      } catch (_) {}
    };

    poll(); // immediate first run
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [user, token, addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, toasts, unreadCount, addToast, addNotification, markAllRead, dismissToast }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
