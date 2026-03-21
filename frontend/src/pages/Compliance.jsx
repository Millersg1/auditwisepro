import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {
  FiShield, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX
} from 'react-icons/fi';
import {
  getComplianceRecords, createComplianceRecord, updateComplianceRecord,
  deleteComplianceRecord, getComplianceStats, getClients, getUsers
} from '../services/api';
import './Compliance.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'HIPAA', 'GDPR', 'PCI DSS'];
const COMP_STATUSES = ['compliant', 'non_compliant', 'in_progress', 'not_started'];
const STATUS_BADGES = {
  compliant: 'success', non_compliant: 'danger', in_progress: 'info', not_started: 'warning'
};

const INITIAL_FORM = {
  framework: '', requirement: '', description: '', status: 'not_started',
  client_id: '', assigned_to: '', review_date: '', evidence: '',
  gap_analysis: '', remediation_plan: ''
};

function Compliance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedFramework !== 'all') params.framework = selectedFramework;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter !== 'all') params.client_id = clientFilter;
      const res = await getComplianceRecords(params);
      setRecords(res.data.records || res.data.data || []);
    } catch {
      toast.error('Failed to load compliance records');
    } finally {
      setLoading(false);
    }
  }, [search, selectedFramework, statusFilter, clientFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const params = selectedFramework !== 'all' ? { framework: selectedFramework } : {};
      const res = await getComplianceStats(params);
      setStats(res.data.stats || res.data);
    } catch { /* silent - stats are optional */ }
  }, [selectedFramework]);

  useEffect(() => { fetchRecords(); fetchStats(); }, [fetchRecords, fetchStats]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cRes, uRes] = await Promise.allSettled([
          getClients({ limit: 100 }),
          getUsers()
        ]);
        if (cRes.status === 'fulfilled') setClients(cRes.value.data.clients || cRes.value.data.data || []);
        if (uRes.status === 'fulfilled') setUsers(uRes.value.data.users || uRes.value.data.data || []);
      } catch { /* silent */ }
    };
    loadDropdowns();
  }, []);

  const openCreate = () => {
    setEditingRecord(null);
    setForm({ ...INITIAL_FORM, framework: selectedFramework !== 'all' ? selectedFramework : '' });
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setForm({
      framework: record.framework || '',
      requirement: record.requirement || '',
      description: record.description || '',
      status: record.status || 'not_started',
      client_id: record.client_id || '',
      assigned_to: record.assigned_to || '',
      review_date: record.review_date ? record.review_date.split('T')[0] : '',
      evidence: record.evidence || '',
      gap_analysis: record.gap_analysis || '',
      remediation_plan: record.remediation_plan || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requirement.trim()) return toast.error('Requirement is required');
    if (!form.framework) return toast.error('Framework is required');
    setSubmitting(true);
    try {
      if (editingRecord) {
        await updateComplianceRecord(editingRecord.id || editingRecord._id, form);
        toast.success('Record updated');
      } else {
        await createComplianceRecord(form);
        toast.success('Record created');
      }
      setShowModal(false);
      fetchRecords();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteComplianceRecord(showDelete.id || showDelete._id);
      toast.success('Record deleted');
      setShowDelete(null);
      fetchRecords();
      fetchStats();
    } catch {
      toast.error('Failed to delete record');
    }
  };

  // Compute stats from records if API stats unavailable
  const computedStats = (() => {
    const filtered = selectedFramework !== 'all'
      ? records.filter((r) => r.framework === selectedFramework)
      : records;
    const total = filtered.length;
    const compliant = filtered.filter((r) => r.status === 'compliant').length;
    const nonCompliant = filtered.filter((r) => r.status === 'non_compliant').length;
    const inProgress = filtered.filter((r) => r.status === 'in_progress').length;
    const notStarted = filtered.filter((r) => r.status === 'not_started').length;
    const percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { total, compliant, nonCompliant, inProgress, notStarted, percentage };
  })();

  const s = stats || computedStats;

  const chartData = {
    labels: ['Compliant', 'Non-Compliant', 'In Progress', 'Not Started'],
    datasets: [{
      data: [
        s.compliant || 0,
        s.nonCompliant || s.non_compliant || 0,
        s.inProgress || s.in_progress || 0,
        s.notStarted || s.not_started || 0
      ],
      backgroundColor: ['#38a169', '#e53e3e', '#3182ce', '#a0aec0'],
      borderWidth: 0,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } }
    }
  };

  // Framework summary for "all" view
  const frameworkSummaries = FRAMEWORKS.map((fw) => {
    const fwRecords = records.filter((r) => r.framework === fw);
    const total = fwRecords.length;
    const compliant = fwRecords.filter((r) => r.status === 'compliant').length;
    const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { framework: fw, total, compliant, percentage: pct };
  });

  return (
    <div className="compliance-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><FiShield /> Compliance</h1>
          <p>Track compliance across frameworks and requirements</p>
        </div>
        <button className="btn btn-accent" onClick={openCreate}>
          <FiPlus /> Add Requirement
        </button>
      </div>

      {/* Framework Tabs */}
      <div className="framework-tabs">
        <button
          className={`framework-tab ${selectedFramework === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedFramework('all')}
        >
          All Frameworks
        </button>
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw}
            className={`framework-tab ${selectedFramework === fw ? 'active' : ''}`}
            onClick={() => setSelectedFramework(fw)}
          >
            {fw}
          </button>
        ))}
      </div>

      {/* Dashboard Summary */}
      {selectedFramework === 'all' ? (
        /* Overall Dashboard */
        <div className="compliance-overview">
          <div className="compliance-chart-card card">
            <h3>Overall Compliance</h3>
            <div className="chart-container">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="chart-center-label">
                <span className="chart-pct">{s.percentage || computedStats.percentage}%</span>
                <span className="chart-pct-label">Compliant</span>
              </div>
            </div>
          </div>
          <div className="framework-cards">
            {frameworkSummaries.map((fw) => (
              <div key={fw.framework} className="framework-card card" onClick={() => setSelectedFramework(fw.framework)}>
                <h4>{fw.framework}</h4>
                <div className="fw-progress">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${fw.percentage}%`, background: fw.percentage >= 80 ? 'var(--success)' : fw.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                  </div>
                  <span className="fw-pct">{fw.percentage}%</span>
                </div>
                <div className="fw-counts">
                  <span>{fw.compliant} / {fw.total} requirements</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Per-framework view */
        <div className="compliance-framework-view">
          <div className="compliance-chart-card card">
            <h3>{selectedFramework} Compliance</h3>
            <div className="chart-container">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="chart-center-label">
                <span className="chart-pct">{computedStats.percentage}%</span>
                <span className="chart-pct-label">Compliant</span>
              </div>
            </div>
          </div>
          <div className="compliance-status-cards">
            {[
              { label: 'Compliant', value: computedStats.compliant, color: 'var(--success)' },
              { label: 'Non-Compliant', value: computedStats.nonCompliant, color: 'var(--danger)' },
              { label: 'In Progress', value: computedStats.inProgress, color: 'var(--info)' },
              { label: 'Not Started', value: computedStats.notStarted, color: 'var(--text-light)' },
            ].map((item, i) => (
              <div key={i} className="status-count-card card">
                <div className="status-count-dot" style={{ background: item.color }} />
                <span className="status-count-value">{item.value}</span>
                <span className="status-count-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar card">
        <div className="search-wrap">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {COMP_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="form-input filter-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading compliance records...</p></div>
      ) : records.length === 0 ? (
        <div className="empty-state card">
          <FiShield size={48} color="var(--text-light)" />
          <h3>No compliance records</h3>
          <p>Add your first compliance requirement.</p>
          <button className="btn btn-accent" onClick={openCreate}><FiPlus /> Add Requirement</button>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requirement</th>
                {selectedFramework === 'all' && <th>Framework</th>}
                <th>Status</th>
                <th>Client</th>
                <th>Assigned To</th>
                <th>Review Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const rid = rec.id || rec._id;
                return (
                  <tr key={rid}>
                    <td className="fw-600">{rec.requirement}</td>
                    {selectedFramework === 'all' && <td><span className="badge badge-info">{rec.framework}</span></td>}
                    <td>
                      <span className={`badge badge-${STATUS_BADGES[rec.status] || 'info'}`}>
                        {rec.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{rec.client_name || '-'}</td>
                    <td>{rec.assigned_to_name || rec.assigned_to || '-'}</td>
                    <td className="date-cell">{rec.review_date ? new Date(rec.review_date).toLocaleDateString() : '-'}</td>
                    <td className="actions-cell">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(rec)} title="Edit"><FiEdit2 /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => setShowDelete(rec)} title="Delete"><FiTrash2 /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
            <motion.div className="modal-card modal-card-lg" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingRecord ? 'Edit Requirement' : 'Add Requirement'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Framework *</label>
                    <select className="form-input" value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} required>
                      <option value="">Select framework</option>
                      {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {COMP_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Requirement *</label>
                  <input type="text" className="form-input" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="e.g. CC6.1 - Logical and Physical Access Controls" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the requirement..." />
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
                    <label>Assigned To</label>
                    <select className="form-input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map((u) => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Review Date</label>
                  <input type="date" className="form-input" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Evidence</label>
                  <textarea className="form-input" rows={2} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="Evidence of compliance..." />
                </div>
                <div className="form-group">
                  <label>Gap Analysis</label>
                  <textarea className="form-input" rows={2} value={form.gap_analysis} onChange={(e) => setForm({ ...form, gap_analysis: e.target.value })} placeholder="Identified gaps..." />
                </div>
                <div className="form-group">
                  <label>Remediation Plan</label>
                  <textarea className="form-input" rows={2} value={form.remediation_plan} onChange={(e) => setForm({ ...form, remediation_plan: e.target.value })} placeholder="Steps to achieve compliance..." />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : (editingRecord ? 'Update' : 'Create')}
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
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDelete(null)}>
            <motion.div className="modal-card modal-card-sm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete Record</h2>
                <button className="modal-close" onClick={() => setShowDelete(null)}><FiX size={20} /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{showDelete.requirement}</strong>?</p>
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

export default Compliance;
