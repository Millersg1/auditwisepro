import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye,
  FiX, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { getClients, createClient, updateClient, deleteClient } from '../services/api';
import './Clients.css';

const INITIAL_FORM = {
  name: '', email: '', phone: '', company: '', industry: '',
  address: '', city: '', state: '', country: '', status: 'active', notes: ''
};

function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await getClients(params);
      const data = res.data;
      setClients(data.clients || data.data || []);
      setTotalPages(data.totalPages || data.total_pages || 1);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openAdd = () => {
    setEditingClient(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (client, e) => {
    e.stopPropagation();
    setEditingClient(client);
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      industry: client.industry || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || '',
      status: client.status || 'active',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id || editingClient._id, form);
        toast.success('Client updated');
      } else {
        await createClient(form);
        toast.success('Client created');
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteClient(showDelete.id || showDelete._id);
      toast.success('Client deleted');
      setShowDelete(null);
      fetchClients();
    } catch {
      toast.error('Failed to delete client');
    }
  };

  const handleRowClick = (client) => {
    navigate(`/clients/${client.id || client._id}`);
  };

  return (
    <div className="clients-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><FiUsers /> Clients</h1>
          <p>Manage your audit clients</p>
        </div>
        <button className="btn btn-accent" onClick={openAdd}>
          <FiPlus /> Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="search-wrap">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {['all', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading clients...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state card">
          <FiUsers size={48} color="var(--text-light)" />
          <h3>No clients found</h3>
          <p>Add your first client to get started.</p>
          <button className="btn btn-accent" onClick={openAdd}>
            <FiPlus /> Add Client
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th>Audits</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const cid = client.id || client._id;
                  return (
                    <tr key={cid} onClick={() => handleRowClick(client)} className="clickable-row">
                      <td className="name-cell">
                        <div className="client-avatar">
                          {(client.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="client-name">{client.name}</span>
                          {client.email && <span className="client-email">{client.email}</span>}
                        </div>
                      </td>
                      <td>{client.company || '-'}</td>
                      <td>{client.industry || '-'}</td>
                      <td>
                        <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
                          {client.status}
                        </span>
                      </td>
                      <td>{client.audits_count ?? client.auditsCount ?? 0}</td>
                      <td className="date-cell">
                        {new Date(client.created_at || client.createdAt).toLocaleDateString()}
                      </td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-outline" title="View" onClick={() => handleRowClick(client)}>
                          <FiEye />
                        </button>
                        <button className="btn btn-sm btn-outline" title="Edit" onClick={(e) => openEdit(client, e)}>
                          <FiEdit2 />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Delete" onClick={() => setShowDelete(client)}>
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm btn-outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <FiChevronLeft /> Prev
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-sm btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingClient ? 'Edit Client' : 'Add Client'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <FiX size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Client name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      placeholder="e.g. Healthcare, Finance"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-input"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : (editingClient ? 'Update Client' : 'Create Client')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDelete(null)}
          >
            <motion.div
              className="modal-card modal-card-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Delete Client</h2>
                <button className="modal-close" onClick={() => setShowDelete(null)}>
                  <FiX size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{showDelete.name}</strong>? This action cannot be undone.</p>
                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={() => setShowDelete(null)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Clients;
