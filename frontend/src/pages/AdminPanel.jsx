import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiUsers, FiBarChart2, FiActivity, FiSearch,
  FiTrash2, FiEdit3, FiX, FiCheck, FiClipboard,
  FiUserPlus, FiShield
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats, getAdminUsers, updateUserPlan, deleteUser,
  getOrgMembers, updateMemberRole, removeOrgMember, addOrgMember,
  getOrganization
} from '../services/api';
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

  // Org member management
  const [orgMembers, setOrgMembers] = useState([]);
  const [orgInfo, setOrgInfo] = useState(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberRole, setEditMemberRole] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    fetchData();
    fetchOrgData();
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

  const fetchOrgData = async () => {
    try {
      const [orgRes, membersRes] = await Promise.all([
        getOrganization().catch(() => ({ data: null })),
        getOrgMembers().catch(() => ({ data: [] })),
      ]);
      setOrgInfo(orgRes.data?.organization || orgRes.data);
      setOrgMembers(membersRes.data?.members || membersRes.data || []);
    } catch {
      // Org might not exist yet
    } finally {
      setOrgLoading(false);
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

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    try {
      const res = await addOrgMember({ email: newMemberEmail, role: newMemberRole });
      setOrgMembers((prev) => [...prev, res.data.member || res.data]);
      setAddMemberModal(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      toast.success('Member added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleUpdateMemberRole = async (memberId) => {
    try {
      await updateMemberRole(memberId, { role: editMemberRole });
      setOrgMembers((prev) =>
        prev.map((m) => ((m.id || m._id) === memberId ? { ...m, role: editMemberRole } : m))
      );
      setEditingMember(null);
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from organization?`)) return;
    try {
      await removeOrgMember(memberId);
      setOrgMembers((prev) => prev.filter((m) => (m.id || m._id) !== memberId));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
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

  // Org-specific stats
  const orgUserCount = orgMembers.length;
  const orgAuditCount = orgInfo?.audits_count || orgInfo?.auditsCount || 0;

  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>

      {/* Stats */}
      <div className="admin-stats">
        {[
          { label: 'Org Members', value: orgUserCount, icon: <FiUsers size={22} />, color: 'var(--info)' },
          { label: 'Org Audits', value: orgAuditCount, icon: <FiClipboard size={22} />, color: 'var(--accent)' },
          { label: 'Total Scans', value: stats.totalScans || stats.total_scans || 0, icon: <FiBarChart2 size={22} />, color: 'var(--success)' },
          { label: 'Users Today', value: stats.usersToday || stats.users_today || 0, icon: <FiActivity size={22} />, color: 'var(--warning)' },
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

      {/* Organization Members Section */}
      {orgInfo && (
        <div className="admin-users-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              <FiShield size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Organization Members ({orgInfo.name || 'My Organization'})
            </h2>
            <button className="btn btn-sm btn-accent" onClick={() => setAddMemberModal(true)}>
              <FiUserPlus size={14} /> Add Member
            </button>
          </div>

          {orgLoading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgMembers.length === 0 ? (
                    <tr><td colSpan="4" className="admin-empty">No organization members</td></tr>
                  ) : (
                    orgMembers.map((m) => {
                      const mid = m.id || m._id;
                      return (
                        <tr key={mid}>
                          <td>
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar">{m.name?.charAt(0)?.toUpperCase() || '?'}</div>
                              <div>
                                <strong>{m.name}</strong>
                                <small>{m.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {editingMember === mid ? (
                              <div className="admin-edit-plan">
                                <select
                                  className="form-input"
                                  value={editMemberRole}
                                  onChange={(e) => setEditMemberRole(e.target.value)}
                                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="member">Member</option>
                                  <option value="auditor">Auditor</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button className="btn btn-sm btn-accent" onClick={() => handleUpdateMemberRole(mid)}><FiCheck /></button>
                                <button className="btn btn-sm btn-outline" onClick={() => setEditingMember(null)}><FiX /></button>
                              </div>
                            ) : (
                              <span className={`badge ${m.role === 'admin' ? 'badge-warning' : m.role === 'auditor' ? 'badge-info' : 'badge-success'}`} style={{ textTransform: 'capitalize' }}>
                                {m.role || 'member'}
                              </span>
                            )}
                          </td>
                          <td className="scan-date-cell">{new Date(m.joined_at || m.created_at || m.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="scan-actions-cell">
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => { setEditingMember(mid); setEditMemberRole(m.role || 'member'); }}
                                title="Change role"
                              >
                                <FiEdit3 />
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleRemoveMember(mid, m.name)}
                                title="Remove member"
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
      )}

      {/* Users Table */}
      <div className="admin-users-section">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px' }}>All Users</h2>
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

      {/* Add Member Modal */}
      {addMemberModal && (
        <div className="sa-modal-overlay" onClick={() => setAddMemberModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Organization Member</h2>
            <div className="form-group">
              <label>Email Address</label>
              <input
                className="form-input"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-input" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="auditor">Auditor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-outline" onClick={() => setAddMemberModal(false)}><FiX size={16} /> Cancel</button>
              <button className="btn btn-accent" onClick={handleAddMember}><FiUserPlus size={16} /> Add Member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
