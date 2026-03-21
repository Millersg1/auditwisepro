import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiBell, FiCheckCircle, FiAlertTriangle, FiInfo,
  FiAlertCircle, FiTrash2, FiCheck
} from 'react-icons/fi';
import api from '../services/api';
import './Notifications.css';

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [preferences, setPreferences] = useState({
    audit_complete: true,
    new_finding: true,
    compliance_alert: true,
    team_mention: true,
    report_ready: true,
    system_update: true,
  });

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || res.data || []);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/notifications/preferences');
      if (res.data.preferences) {
        setPreferences(res.data.preferences);
      }
    } catch {
      // Use defaults
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id) === id ? { ...n, read: true } : n))
      );
    } catch {
      // Silent fail
    }
  };

  const handleClick = (notification) => {
    const nid = notification.id || notification._id;
    if (!notification.read) {
      markAsRead(nid);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => (n.id || n._id) !== id));
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const togglePreference = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await api.put('/notifications/preferences', updated);
    } catch {
      setPreferences(preferences);
      toast.error('Failed to update preference');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle size={18} />;
      case 'warning':
        return <FiAlertTriangle size={18} />;
      case 'danger':
      case 'error':
        return <FiAlertCircle size={18} />;
      default:
        return <FiInfo size={18} />;
    }
  };

  const getIconType = (type) => {
    if (type === 'error') return 'danger';
    if (['success', 'warning', 'danger', 'info'].includes(type)) return type;
    return 'info';
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered =
    tab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const prefLabels = {
    audit_complete: 'Audit Completed',
    new_finding: 'New Finding',
    compliance_alert: 'Compliance Alerts',
    team_mention: 'Team Mentions',
    report_ready: 'Report Ready',
    system_update: 'System Updates',
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            <FiCheck /> Mark All Read
          </button>
        )}
      </div>

      <div className="notifications-tabs">
        <button
          className={tab === 'all' ? 'active' : ''}
          onClick={() => setTab('all')}
        >
          All
        </button>
        <button
          className={tab === 'unread' ? 'active' : ''}
          onClick={() => setTab('unread')}
        >
          Unread
          {unreadCount > 0 && <span className="tab-count">{unreadCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-notifications">
          <FiBell size={48} />
          <h3>No notifications</h3>
          <p>{tab === 'unread' ? 'You\'re all caught up!' : 'No notifications yet.'}</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filtered.map((n, i) => {
            const nid = n.id || n._id;
            return (
              <motion.div
                key={nid}
                className={`notification-item ${!n.read ? 'unread' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleClick(n)}
              >
                <div className={`notification-icon-wrap ${getIconType(n.type)}`}>
                  {getIcon(n.type)}
                </div>
                <div className="notification-body">
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-time">
                    {timeAgo(n.created_at || n.createdAt)}
                  </div>
                </div>
                <div className="notification-actions">
                  {!n.read && <div className="unread-dot" />}
                  <button
                    className="notification-delete"
                    onClick={(e) => handleDelete(e, nid)}
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="notification-preferences">
        <h2>Notification Preferences</h2>
        <div className="pref-list">
          {Object.entries(prefLabels).map(([key, label]) => (
            <div key={key} className="pref-item">
              <span>{label}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences[key] ?? true}
                  onChange={() => togglePreference(key)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
