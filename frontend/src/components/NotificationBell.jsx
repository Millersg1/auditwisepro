import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import api from '../services/api';
import './NotificationBell.css';

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications', { params: { limit: 5 } });
      const data = res.data.notifications || res.data || [];
      setNotifications(data.slice(0, 5));
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // Silent
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // Silent
    }
  };

  const handleClick = async (notification) => {
    const nid = notification.id || notification._id;
    if (!notification.read) {
      try {
        await api.put(`/notifications/${nid}/read`);
        setNotifications((prev) =>
          prev.map((n) => ((n.id || n._id) === nid ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silent
      }
    }
    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silent
    }
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

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="notification-bell-btn" onClick={() => setOpen(!open)}>
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span className="notification-bell-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-bell-dropdown">
          <div className="notification-bell-dropdown-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          <div className="bell-dropdown-list">
            {notifications.length === 0 ? (
              <div className="bell-dropdown-empty">No notifications</div>
            ) : (
              notifications.map((n) => {
                const nid = n.id || n._id;
                return (
                  <div
                    key={nid}
                    className={`bell-dropdown-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => handleClick(n)}
                  >
                    <div className={`bell-item-dot ${n.read ? 'read' : ''}`} />
                    <div className="bell-item-content">
                      <div className="bell-item-title">{n.title}</div>
                      <div className="bell-item-message">{n.message}</div>
                      <div className="bell-item-time">
                        {timeAgo(n.created_at || n.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bell-dropdown-footer">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
