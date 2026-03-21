import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiClipboard, FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye,
  FiX, FiChevronLeft, FiChevronRight, FiList, FiColumns,
  FiCalendar, FiUser
} from 'react-icons/fi';
import {
  getAudits, createAudit, updateAudit, deleteAudit,
  getClients, getTemplates, getUsers
} from '../services/api';
import './Audits.css';

const STATUSES = ['draft', 'in_progress', 'review', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUS_COLORS = {
  draft: 'info', in_progress: 'info', review: 'warning', completed: 'success'
};
const PRIORITY_COLORS = {
  low: 'info', medium: 'warning', high: 'danger', critical: 'danger'
};

const INITIAL_FORM = {
  title: '', description: '', client_id: '', template_id: '', priority: 'medium',
  assigned_to: '', start_date: '', end_date: '', due_date: ''
};

function Audits() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [draggedAudit, setDraggedAudit] = useState(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (clientFilter !== 'all') params.client_id = clientFilter;
      const res = await getAudits(params);
      const data = res.data;
      setAudits(data.audits || data.data || []);
      setTotalPages(data.totalPages || data.total_pages || 1);
    } catch {
      toast.error('Failed to load audits');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, clientFilter]);

  useEffect(() => { fetchAudits(); }, [fetchAudits]);
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, clientFilter]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cRes, tRes, uRes] = await Promise.allSettled([
          getClients({ limit: 100 }),
          getTemplates({ limit: 100 }),
          getUsers()
        ]);
        if (cRes.status === 'fulfilled') setClients(cRes.value.data.clients || cRes.value.data.data || []);
        if (tRes.status === 'fulfilled') setTemplates(tRes.value.data.templates || tRes.value.data.data || []);
        if (uRes.status === 'fulfilled') setUsers(uRes.value.data.users || uRes.value.data.data || []);
      } catch { /* silent */ }
    };
    loadDropdowns();
  }, []);

  const openCreate = () => {
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSubmitting(true);
    try {
      await createAudit(form);
      toast.success('Audit created');
      setShowModal(false);
      fetchAudits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create audit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteAudit(showDelete.id || showDelete._id);
      toast.success('Audit deleted');
      setShowDelete(null);
      fetchAudits();
    } catch {
      toast.error('Failed to delete audit');
    }
  };

  const handleDragStart = (audit) => setDraggedAudit(audit);

  const handleDrop = async (newStatus) => {
    if (!draggedAudit || draggedAudit.status === newStatus) {
      setDraggedAudit(null);
      return;
    }
    try {
      await updateAudit(draggedAudit.id || draggedAudit._id, { ...draggedAudit, status: newStatus });
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
      fetchAudits();
    } catch {
      toast.error('Failed to update status');
    }
    setDraggedAudit(null);
  };

  const getClientName = (clientId) => {
    const c = clients.find((cl) => (cl.id || cl._id) === clientId);
    return c ? c.name : '-';
  };

  return (
    <div className="audits-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><FiClipboard /> Audits</h1>
          <p>Manage your audit engagements</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <FiList size={18} />
            </button>
            <button
              className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
            >
              <FiColumns size={18} />
            </button>
          </div>
          <button className="btn btn-accent" onClick={openCreate}>
            <FiPlus /> New Audit
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="search-wrap">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search audits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="form-input filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-input filter-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading audits...</p>
        </div>
      ) : audits.length === 0 ? (
        <div className="empty-state card">
          <FiClipboard size={48} color="var(--text-light)" />
          <h3>No audits found</h3>
          <p>Create your first audit to get started.</p>
          <button className="btn btn-accent" onClick={openCreate}>
            <FiPlus /> New Audit
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <>
          <div className="table-wrap card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const aid = audit.id || audit._id;
                  return (
                    <tr key={aid} className="clickable-row" onClick={() => navigate(`/audits/${aid}`)}>
                      <td className="fw-600">{audit.title}</td>
                      <td>{audit.client_name || getClientName(audit.client_id)}</td>
                      <td>
                        <span className={`badge badge-${STATUS_COLORS[audit.status] || 'info'}`}>
                          {audit.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${PRIORITY_COLORS[audit.priority] || 'info'}`}>
                          {audit.priority}
                        </span>
                      </td>
                      <td>{audit.assigned_to_name || audit.assigned_to || '-'}</td>
                      <td className="date-cell">{audit.due_date ? new Date(audit.due_date).toLocaleDateString() : '-'}</td>
                      <td>{audit.score != null ? audit.score : '-'}</td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-outline" title="View" onClick={() => navigate(`/audits/${aid}`)}>
                          <FiEye />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Delete" onClick={() => setShowDelete(audit)}>
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <FiChevronLeft /> Prev
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </>
      ) : (
        /* KANBAN VIEW */
        <div className="kanban-board">
          {STATUSES.map((status) => {
            const columnAudits = audits.filter((a) => a.status === status);
            return (
              <div
                key={status}
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(status)}
              >
                <div className="kanban-column-header">
                  <span className={`badge badge-${STATUS_COLORS[status]}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <span className="kanban-count">{columnAudits.length}</span>
                </div>
                <div className="kanban-cards">
                  {columnAudits.map((audit) => {
                    const aid = audit.id || audit._id;
                    return (
                      <motion.div
                        key={aid}
                        className="kanban-card card"
                        draggable
                        onDragStart={() => handleDragStart(audit)}
                        onClick={() => navigate(`/audits/${aid}`)}
                        whileHover={{ scale: 1.02 }}
                        layout
                      >
                        <div className="kanban-card-header">
                          <span className="kanban-card-title">{audit.title}</span>
                          <span className={`badge badge-${PRIORITY_COLORS[audit.priority] || 'info'}`}>
                            {audit.priority}
                          </span>
                        </div>
                        <div className="kanban-card-meta">
                          {audit.client_name || getClientName(audit.client_id) !== '-' ? (
                            <span><FiUser size={12} /> {audit.client_name || getClientName(audit.client_id)}</span>
                          ) : null}
                          {audit.due_date && (
                            <span><FiCalendar size={12} /> {new Date(audit.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                        {audit.score != null && (
                          <div className="kanban-card-score">
                            Score: <strong>{audit.score}</strong>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  {columnAudits.length === 0 && (
                    <div className="kanban-empty">No audits</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
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
                <h2>New Audit</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Audit title" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the audit scope..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Client</label>
                    <select className="form-input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                      <option value="">Select client</option>
                      {clients.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Template</label>
                    <select className="form-input" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}>
                      <option value="">Select template</option>
                      {templates.map((t) => <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <select className="form-input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                      <option value="">Select assignee</option>
                      {users.map((u) => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" className="form-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" className="form-input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : 'Create Audit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
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
                <h2>Delete Audit</h2>
                <button className="modal-close" onClick={() => setShowDelete(null)}><FiX size={20} /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{showDelete.title}</strong>? This will also remove all findings and related data.</p>
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

export default Audits;
