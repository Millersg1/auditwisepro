import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiSearch, FiEdit3, FiTrash2, FiPlus, FiX, FiCheck
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminOrgs, updateSuperAdminOrg, deleteSuperAdminOrg
} from '../services/api';
import './SuperAdminOrganizations.css';

function SuperAdminOrganizations() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', industry: '' });

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const res = await getSuperAdminOrgs();
      setOrgs(res.data.organizations || res.data || []);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    const oid = editModal.id || editModal._id;
    try {
      await updateSuperAdminOrg(oid, { name: editModal.name, industry: editModal.industry });
      setOrgs((prev) => prev.map((o) => ((o.id || o._id) === oid ? { ...o, ...editModal } : o)));
      setEditModal(null);
      toast.success('Organization updated');
    } catch {
      toast.error('Failed to update organization');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const oid = deleteModal.id || deleteModal._id;
    try {
      await deleteSuperAdminOrg(oid);
      setOrgs((prev) => prev.filter((o) => (o.id || o._id) !== oid));
      setDeleteModal(null);
      toast.success('Organization deleted');
    } catch {
      toast.error('Failed to delete organization');
    }
  };

  const handleCreate = async () => {
    if (!newOrg.name.trim()) {
      toast.error('Organization name is required');
      return;
    }
    try {
      // Use update endpoint with POST semantics - or create via org API
      const res = await updateSuperAdminOrg('create', newOrg);
      setOrgs((prev) => [...prev, res.data.organization || res.data]);
      setCreateModal(false);
      setNewOrg({ name: '', industry: '' });
      toast.success('Organization created');
    } catch {
      toast.error('Failed to create organization');
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="loading-container" style={{ minHeight: '50vh' }}>
        <h2>Access Denied</h2>
      </div>
    );
  }

  const filtered = orgs.filter((o) =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sa-orgs-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Organizations</h1>
        <button className="btn btn-accent" onClick={() => setCreateModal(true)}><FiPlus size={16} /> Create Organization</button>
      </div>

      <div className="sa-orgs-controls">
        <div className="sa-orgs-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <motion.div className="card" style={{ padding: 0, overflow: 'hidden' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="sa-orgs-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Industry</th>
                  <th>Members</th>
                  <th>Audits</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>No organizations found</td></tr>
                ) : (
                  filtered.map((o) => {
                    const oid = o.id || o._id;
                    return (
                      <tr key={oid}>
                        <td><strong>{o.name}</strong></td>
                        <td style={{ color: 'var(--text-light)' }}>{o.industry || '-'}</td>
                        <td>{o.members_count || o.membersCount || 0}</td>
                        <td>{o.audits_count || o.auditsCount || 0}</td>
                        <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(o.created_at || o.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="sa-org-actions">
                            <button className="btn btn-sm btn-outline" title="Edit" onClick={() => setEditModal({ ...o })}>
                              <FiEdit3 />
                            </button>
                            <button className="btn btn-sm btn-danger" title="Delete" onClick={() => setDeleteModal(o)}>
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

      {/* Edit Modal */}
      {editModal && (
        <div className="sa-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Organization</h2>
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" value={editModal.name || ''} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input className="form-input" value={editModal.industry || ''} onChange={(e) => setEditModal({ ...editModal, industry: e.target.value })} />
            </div>
            <div className="sa-modal-actions">
              <button className="btn btn-outline" onClick={() => setEditModal(null)}><FiX size={16} /> Cancel</button>
              <button className="btn btn-accent" onClick={handleEditSave}><FiCheck size={16} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="sa-modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Organization</h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-light)' }}>
              Are you sure you want to delete <strong>{deleteModal.name}</strong>? All associated data will be removed.
            </p>
            <div className="sa-modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 size={16} /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="sa-modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Organization</h2>
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="Organization name" />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input className="form-input" value={newOrg.industry} onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })} placeholder="e.g., Technology, Finance" />
            </div>
            <div className="sa-modal-actions">
              <button className="btn btn-outline" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleCreate}><FiPlus size={16} /> Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminOrganizations;
