import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiEdit3, FiUserCheck, FiLock, FiTrash2,
  FiClipboard, FiSearch as FiScan, FiCreditCard, FiShield
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminUserDetail, updateSuperAdminUser, deleteSuperAdminUser, impersonateUser
} from '../services/api';
import './SuperAdminUserDetail.css';

function SuperAdminUserDetail() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editModal, setEditModal] = useState(null);

  useEffect(() => {
    if (currentUser?.role !== 'superadmin') return;
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const res = await getSuperAdminUserDetail(id);
      setUserData(res.data.user || res.data);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!window.confirm(`Impersonate ${userData.name}?`)) return;
    try {
      const res = await impersonateUser(id);
      localStorage.setItem('awp_token', res.data.token);
      localStorage.setItem('awp_user', JSON.stringify(res.data.user));
      toast.info(`Impersonating ${userData.name}`);
      window.location.href = '/dashboard';
    } catch {
      toast.error('Failed to impersonate user');
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm(`Send password reset email to ${userData.email}?`)) return;
    try {
      await updateSuperAdminUser(id, { reset_password: true });
      toast.success('Password reset email sent');
    } catch {
      toast.error('Failed to send password reset');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${userData.name}? This cannot be undone.`)) return;
    try {
      await deleteSuperAdminUser(id);
      toast.success('User deleted');
      navigate('/superadmin/users');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    try {
      await updateSuperAdminUser(id, editModal);
      setUserData((prev) => ({ ...prev, ...editModal }));
      setEditModal(null);
      toast.success('User updated');
    } catch {
      toast.error('Failed to update user');
    }
  };

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="loading-container" style={{ minHeight: '50vh' }}>
        <h2>Access Denied</h2>
      </div>
    );
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!userData) return <div className="loading-container"><p>User not found</p></div>;

  const audits = userData.audits || [];
  const scans = userData.scans || [];
  const subscriptionHistory = userData.subscription_history || [];
  const securityLog = userData.security_log || [];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'audits', label: `Audits (${audits.length})` },
    { key: 'scans', label: `Scans (${scans.length})` },
    { key: 'subscription', label: 'Subscription History' },
    { key: 'security', label: 'Security Log' },
  ];

  return (
    <div className="sa-user-detail">
      <button className="sa-back-link" onClick={() => navigate('/superadmin/users')}>
        <FiArrowLeft size={16} /> Back to Users
      </button>

      {/* User header */}
      <motion.div className="sa-user-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="sa-user-header-avatar">{userData.name?.charAt(0)?.toUpperCase() || '?'}</div>
        <div className="sa-user-header-info">
          <h2>{userData.name}</h2>
          <p>{userData.email}</p>
          <div className="sa-user-header-badges">
            <span className={`badge ${userData.role === 'superadmin' ? 'badge-danger' : userData.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
              {userData.role || 'user'}
            </span>
            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{userData.plan || 'free'}</span>
            <span className="badge badge-success">Member since {new Date(userData.created_at || userData.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="sa-user-header-actions">
          <button className="btn btn-sm btn-outline" onClick={() => setEditModal({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            plan: userData.plan,
            scans_limit: userData.scans_limit,
            email_verified: userData.email_verified,
          })}><FiEdit3 size={14} /> Edit</button>
          <button className="btn btn-sm btn-accent" onClick={handleImpersonate}><FiUserCheck size={14} /> Impersonate</button>
          <button className="btn btn-sm btn-primary" onClick={handleResetPassword}><FiLock size={14} /> Reset Password</button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}><FiTrash2 size={14} /> Delete</button>
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="sa-detail-stats">
        {[
          { value: userData.audits_count || audits.length, label: 'Total Audits', icon: <FiClipboard /> },
          { value: userData.scans_count || scans.length, label: 'Total Scans', icon: <FiScan /> },
          { value: userData.findings_count || 0, label: 'Total Findings', icon: <FiShield /> },
          { value: `$${userData.subscription_value || 0}`, label: 'Subscription Value', icon: <FiCreditCard /> },
        ].map((s, i) => (
          <motion.div key={i} className="sa-detail-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="sa-detail-stat-value">{s.value}</div>
            <div className="sa-detail-stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="sa-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`sa-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="sa-tab-content">
        {activeTab === 'overview' && (
          <div className="sa-info-grid">
            <div className="sa-info-item"><label>Name</label><span>{userData.name}</span></div>
            <div className="sa-info-item"><label>Email</label><span>{userData.email}</span></div>
            <div className="sa-info-item"><label>Role</label><span style={{ textTransform: 'capitalize' }}>{userData.role || 'user'}</span></div>
            <div className="sa-info-item"><label>Plan</label><span style={{ textTransform: 'capitalize' }}>{userData.plan || 'free'}</span></div>
            <div className="sa-info-item"><label>Email Verified</label><span>{userData.email_verified ? 'Yes' : 'No'}</span></div>
            <div className="sa-info-item"><label>Scans Limit</label><span>{userData.scans_limit || 'Default'}</span></div>
            <div className="sa-info-item"><label>Organization</label><span>{userData.organization_name || userData.org_name || 'None'}</span></div>
            <div className="sa-info-item"><label>Last Login</label><span>{userData.last_login ? new Date(userData.last_login).toLocaleString() : 'Never'}</span></div>
            <div className="sa-info-item"><label>Created</label><span>{new Date(userData.created_at || userData.createdAt).toLocaleString()}</span></div>
            <div className="sa-info-item"><label>Updated</label><span>{userData.updated_at ? new Date(userData.updated_at).toLocaleString() : '-'}</span></div>
          </div>
        )}

        {activeTab === 'audits' && (
          audits.length === 0 ? <div className="sa-empty">No audits found</div> : (
            <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id || a._id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{a.title || a.name}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{a.status}</span></td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(a.created_at || a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeTab === 'scans' && (
          scans.length === 0 ? <div className="sa-empty">No scans found</div> : (
            <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>URL</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Score</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id || s._id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{s.url}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{s.score ?? '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(s.created_at || s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeTab === 'subscription' && (
          subscriptionHistory.length === 0 ? <div className="sa-empty">No subscription history</div> : (
            <div className="sa-timeline">
              {subscriptionHistory.map((e, i) => (
                <div key={i} className="sa-timeline-item">
                  <div className="sa-timeline-date">{new Date(e.date || e.created_at).toLocaleString()}</div>
                  <div className="sa-timeline-text">{e.description || e.event || `${e.type}: ${e.plan || ''}`}</div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'security' && (
          securityLog.length === 0 ? <div className="sa-empty">No security events</div> : (
            <div className="sa-timeline">
              {securityLog.map((e, i) => (
                <div key={i} className="sa-timeline-item">
                  <div className="sa-timeline-date">{new Date(e.date || e.created_at).toLocaleString()}</div>
                  <div className="sa-timeline-text">{e.description || e.event || e.action}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="sa-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit User</h2>
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" value={editModal.name || ''} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" value={editModal.email || ''} onChange={(e) => setEditModal({ ...editModal, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-input" value={editModal.role || 'user'} onChange={(e) => setEditModal({ ...editModal, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Plan</label>
              <select className="form-input" value={editModal.plan || 'free'} onChange={(e) => setEditModal({ ...editModal, plan: e.target.value })}>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="agency">Agency</option>
              </select>
            </div>
            <div className="form-group">
              <label>Scans Limit</label>
              <input className="form-input" type="number" value={editModal.scans_limit || ''} onChange={(e) => setEditModal({ ...editModal, scans_limit: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="sa-toggle-row">
              <label>Email Verified</label>
              <button className={`sa-toggle ${editModal.email_verified ? 'active' : ''}`} onClick={() => setEditModal({ ...editModal, email_verified: !editModal.email_verified })} />
            </div>
            <div className="sa-modal-actions">
              <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleEditSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminUserDetail;
