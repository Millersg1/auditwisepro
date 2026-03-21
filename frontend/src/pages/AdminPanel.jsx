import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiUsers, FiBarChart2, FiActivity, FiSearch,
  FiTrash2, FiEdit3, FiX, FiCheck
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, getAdminUsers, updateUserPlan, deleteUser } from '../services/api';
import './AdminPanel.css';

function AdminPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalScans: 0, usersToday: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editPlan, setEditPlan] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
      ]);
      setStats(statsRes.data.stats || statsRes.data);
      setUsers(usersRes.data.users || usersRes.data || []);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (userId) => {
    try {
      await updateUserPlan(userId, { plan: editPlan });
      setUsers((prev) =>
        prev.map((u) => ((u.id || u._id) === userId ? { ...u, plan: editPlan } : u))
      );
      setEditingUser(null);
      toast.success('Plan updated');
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => (u.id || u._id) !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="loading-container" style={{ minHeight: '50vh' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>

      {/* Stats */}
      <div className="admin-stats">
        {[
          { label: 'Total Users', value: stats.totalUsers || stats.total_users || 0, icon: <FiUsers size={22} />, color: 'var(--info)' },
          { label: 'Total Scans', value: stats.totalScans || stats.total_scans || 0, icon: <FiBarChart2 size={22} />, color: 'var(--accent)' },
          { label: 'Users Today', value: stats.usersToday || stats.users_today || 0, icon: <FiActivity size={22} />, color: 'var(--success)' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="stat-card card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Users Table */}
      <div className="admin-users-section">
        <div className="admin-users-controls">
          <div className="admin-search">
            <FiSearch className="admin-search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input admin-filter"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Scans</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="admin-empty">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const userId = u.id || u._id;
                    return (
                      <tr key={userId}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                            <div>
                              <strong>{u.name}</strong>
                              <small>{u.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {editingUser === userId ? (
                            <div className="admin-edit-plan">
                              <select
                                className="form-input"
                                value={editPlan}
                                onChange={(e) => setEditPlan(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                              >
                                <option value="free">Free</option>
                                <option value="starter">Starter</option>
                                <option value="pro">Pro</option>
                                <option value="agency">Agency</option>
                              </select>
                              <button className="btn btn-sm btn-accent" onClick={() => handleUpdatePlan(userId)}><FiCheck /></button>
                              <button className="btn btn-sm btn-outline" onClick={() => setEditingUser(null)}><FiX /></button>
                            </div>
                          ) : (
                            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{u.plan || 'free'}</span>
                          )}
                        </td>
                        <td>{u.scans_count || u.scansCount || 0}</td>
                        <td className="scan-date-cell">{new Date(u.created_at || u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="scan-actions-cell">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => { setEditingUser(userId); setEditPlan(u.plan || 'free'); }}
                              title="Edit plan"
                            >
                              <FiEdit3 />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteUser(userId)}
                              title="Delete user"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
