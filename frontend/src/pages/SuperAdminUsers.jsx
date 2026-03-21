import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiEdit3, FiTrash2, FiUserCheck, FiX, FiCheck,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminUsers, updateSuperAdminUser, deleteSuperAdminUser, impersonateUser
} from '../services/api';
import './SuperAdminUsers.css';

function SuperAdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPlan, setBulkPlan] = useState('');

  const limit = 20;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (planFilter !== 'all') params.plan = planFilter;
      const res = await getSuperAdminUsers(params);
      setUsers(res.data.users || res.data || []);
      setTotalPages(res.data.totalPages || res.data.total_pages || 1);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, planFilter]);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    fetchUsers();
  }, [fetchUsers, user]);

  // Debounced search
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, planFilter]);

  const handleImpersonate = async (u) => {
    if (!window.confirm(`Impersonate ${u.name}?`)) return;
    try {
      const res = await impersonateUser(u.id || u._id);
      localStorage.setItem('awp_token', res.data.token);
      localStorage.setItem('awp_user', JSON.stringify(res.data.user));
      toast.info(`Impersonating ${u.name}`);
      window.location.href = '/dashboard';
    } catch {
      toast.error('Failed to impersonate user');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteSuperAdminUser(deleteModal.id || deleteModal._id);
      setUsers((prev) => prev.filter((u) => (u.id || u._id) !== (deleteModal.id || deleteModal._id)));
      setDeleteModal(null);
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    try {
      const uid = editModal.id || editModal._id;
      await updateSuperAdminUser(uid, {
        name: editModal.name,
        email: editModal.email,
        role: editModal.role,
        plan: editModal.plan,
        scans_limit: editModal.scans_limit,
        email_verified: editModal.email_verified,
        organization_id: editModal.organization_id,
      });
      setUsers((prev) => prev.map((u) => ((u.id || u._id) === uid ? { ...u, ...editModal } : u)));
      setEditModal(null);
      toast.success('User updated');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id || u._id));
    }
  };

  const handleBulkChangePlan = async () => {
    if (!bulkPlan || selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => updateSuperAdminUser(id, { plan: bulkPlan })));
      setUsers((prev) => prev.map((u) =>
        selectedIds.includes(u.id || u._id) ? { ...u, plan: bulkPlan } : u
      ));
      setSelectedIds([]);
      setBulkPlan('');
      toast.success(`Plan updated for ${selectedIds.length} users`);
    } catch {
      toast.error('Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} users?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteSuperAdminUser(id)));
      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id || u._id)));
      setSelectedIds([]);
      toast.success('Users deleted');
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="loading-container" style={{ minHeight: '50vh' }}>
        <h2>Access Denied</h2>
        <p>SuperAdmin access required.</p>
      </div>
    );
  }

  return (
    <div className="sa-users-page">
      <h1>All Users</h1>

      {/* Controls */}
      <div className="sa-users-controls">
        <div className="sa-users-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input sa-users-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="superadmin">SuperAdmin</option>
        </select>
        <select className="form-input sa-users-filter" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="sa-bulk-bar">
          <span>{selectedIds.length} selected</span>
          <select value={bulkPlan} onChange={(e) => setBulkPlan(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '0.85rem' }}>
            <option value="">Change plan...</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
          </select>
          {bulkPlan && <button onClick={handleBulkChangePlan}>Apply Plan</button>}
          <button className="btn-danger" onClick={handleBulkDelete}>Delete Selected</button>
          <button onClick={() => setSelectedIds([])}>Clear</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <motion.div className="card" style={{ padding: 0, overflow: 'hidden' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="sa-users-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll} /></th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Organization</th>
                  <th>Last Login</th>
                  <th>Scans</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>No users found</td></tr>
                ) : (
                  users.map((u) => {
                    const uid = u.id || u._id;
                    return (
                      <tr key={uid} className="clickable" onClick={(e) => {
                        if (e.target.closest('.sa-actions-cell') || e.target.closest('input[type=checkbox]')) return;
                        navigate(`/superadmin/users/${uid}`);
                      }}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.includes(uid)} onChange={() => toggleSelect(uid)} />
                        </td>
                        <td>
                          <div className="sa-user-cell">
                            <div className="sa-user-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                            <div>
                              <span className="sa-user-name">{u.name}</span>
                              <span className="sa-user-email">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'superadmin' ? 'badge-danger' : u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{u.plan || 'free'}</span>
                        </td>
                        <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{u.organization_name || u.org_name || '-'}</td>
                        <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                        <td>{u.scans_count || u.scansCount || 0}</td>
                        <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(u.created_at || u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="sa-actions-cell">
                            <button className="btn btn-sm btn-outline" title="Edit" onClick={(e) => { e.stopPropagation(); setEditModal({ ...u, id: uid }); }}>
                              <FiEdit3 />
                            </button>
                            <button className="btn btn-sm btn-accent" title="Impersonate" onClick={(e) => { e.stopPropagation(); handleImpersonate(u); }}>
                              <FiUserCheck />
                            </button>
                            <button className="btn btn-sm btn-danger" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteModal(u); }}>
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
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sa-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronLeft /></button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
          })}
          {totalPages > 7 && <span>...</span>}
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}><FiChevronRight /></button>
        </div>
      )}

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
            <div className="form-group">
              <label>Organization ID</label>
              <input className="form-input" value={editModal.organization_id || ''} onChange={(e) => setEditModal({ ...editModal, organization_id: e.target.value })} />
            </div>
            <div className="sa-toggle-row">
              <label>Email Verified</label>
              <button
                className={`sa-toggle ${editModal.email_verified ? 'active' : ''}`}
                onClick={() => setEditModal({ ...editModal, email_verified: !editModal.email_verified })}
              />
            </div>
            <div className="sa-modal-actions">
              <button className="btn btn-outline" onClick={() => setEditModal(null)}><FiX size={16} /> Cancel</button>
              <button className="btn btn-accent" onClick={handleEditSave}><FiCheck size={16} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="sa-modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete User</h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-light)' }}>
              Are you sure you want to permanently delete <strong>{deleteModal.name}</strong> ({deleteModal.email})?
              This action cannot be undone.
            </p>
            <div className="sa-modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 size={16} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminUsers;
