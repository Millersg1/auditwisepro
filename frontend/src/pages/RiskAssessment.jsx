import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShield, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
  FiAlertTriangle
} from 'react-icons/fi';
import {
  getRisks, createRisk, updateRisk, deleteRisk,
  getClients, getAudits
} from '../services/api';
import './RiskAssessment.css';

const RISK_CATEGORIES = ['operational', 'financial', 'compliance', 'technology', 'strategic'];
const RISK_STATUSES = ['identified', 'assessed', 'mitigating', 'accepted', 'closed'];

const INITIAL_FORM = {
  title: '', description: '', category: 'operational', client_id: '', audit_id: '',
  likelihood: 3, impact: 3, status: 'identified',
  mitigation_strategy: '', owner: '', review_date: ''
};

function RiskAssessment() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [matrixFilter, setMatrixFilter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [audits, setAudits] = useState([]);

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter !== 'all') params.client_id = clientFilter;
      const res = await getRisks(params);
      setRisks(res.data.risks || res.data.data || []);
    } catch {
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, clientFilter]);

  useEffect(() => { fetchRisks(); }, [fetchRisks]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cRes, aRes] = await Promise.allSettled([
          getClients({ limit: 100 }),
          getAudits({ limit: 100 })
        ]);
        if (cRes.status === 'fulfilled') setClients(cRes.value.data.clients || cRes.value.data.data || []);
        if (aRes.status === 'fulfilled') setAudits(aRes.value.data.audits || aRes.value.data.data || []);
      } catch { /* silent */ }
    };
    loadDropdowns();
  }, []);

  const openCreate = () => {
    setEditingRisk(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (risk) => {
    setEditingRisk(risk);
    setForm({
      title: risk.title || '',
      description: risk.description || '',
      category: risk.category || 'operational',
      client_id: risk.client_id || '',
      audit_id: risk.audit_id || '',
      likelihood: risk.likelihood || 3,
      impact: risk.impact || 3,
      status: risk.status || 'identified',
      mitigation_strategy: risk.mitigation_strategy || '',
      owner: risk.owner || '',
      review_date: risk.review_date ? risk.review_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSubmitting(true);
    try {
      const payload = { ...form, risk_score: form.likelihood * form.impact };
      if (editingRisk) {
        await updateRisk(editingRisk.id || editingRisk._id, payload);
        toast.success('Risk updated');
      } else {
        await createRisk(payload);
        toast.success('Risk created');
      }
      setShowModal(false);
      fetchRisks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save risk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteRisk(showDelete.id || showDelete._id);
      toast.success('Risk deleted');
      setShowDelete(null);
      fetchRisks();
    } catch {
      toast.error('Failed to delete risk');
    }
  };

  // Stats
  const totalRisks = risks.length;
  const criticalCount = risks.filter((r) => (r.risk_score || r.likelihood * r.impact) >= 20).length;
  const highCount = risks.filter((r) => { const s = r.risk_score || r.likelihood * r.impact; return s >= 15 && s < 20; }).length;
  const mediumCount = risks.filter((r) => { const s = r.risk_score || r.likelihood * r.impact; return s >= 8 && s < 15; }).length;
  const lowCount = risks.filter((r) => (r.risk_score || r.likelihood * r.impact) < 8).length;

  // Risk Matrix - 5x5 grid
  const getMatrixCount = (likelihood, impact) => {
    return risks.filter((r) => r.likelihood === likelihood && r.impact === impact).length;
  };

  const getMatrixColor = (likelihood, impact) => {
    const score = likelihood * impact;
    if (score >= 20) return '#e53e3e';
    if (score >= 15) return '#dd6b20';
    if (score >= 8) return '#ecc94b';
    return '#38a169';
  };

  const handleMatrixClick = (likelihood, impact) => {
    if (matrixFilter && matrixFilter.likelihood === likelihood && matrixFilter.impact === impact) {
      setMatrixFilter(null);
    } else {
      setMatrixFilter({ likelihood, impact });
    }
  };

  // Filtered risks
  const displayRisks = matrixFilter
    ? risks.filter((r) => r.likelihood === matrixFilter.likelihood && r.impact === matrixFilter.impact)
    : risks;

  const getRiskLevel = (score) => {
    if (score >= 20) return { label: 'Critical', class: 'critical' };
    if (score >= 15) return { label: 'High', class: 'high' };
    if (score >= 8) return { label: 'Medium', class: 'medium' };
    return { label: 'Low', class: 'low' };
  };

  const statCards = [
    { label: 'Total Risks', value: totalRisks, color: 'var(--info)', icon: <FiShield size={20} /> },
    { label: 'Critical', value: criticalCount, color: 'var(--danger)', icon: <FiAlertTriangle size={20} /> },
    { label: 'High', value: highCount, color: 'var(--warning)', icon: <FiAlertTriangle size={20} /> },
    { label: 'Medium', value: mediumCount, color: '#ecc94b', icon: <FiShield size={20} /> },
    { label: 'Low', value: lowCount, color: 'var(--success)', icon: <FiShield size={20} /> },
  ];

  return (
    <div className="risk-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><FiShield /> Risk Assessment</h1>
          <p>Identify, assess, and manage risks across your audits</p>
        </div>
        <button className="btn btn-accent" onClick={openCreate}>
          <FiPlus /> Add Risk
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid stats-grid-5">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            className="stat-card card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
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

      {/* Risk Matrix */}
      <div className="risk-matrix-section card">
        <h2>Risk Matrix</h2>
        <p className="matrix-subtitle">Click a cell to filter risks by likelihood and impact</p>
        <div className="risk-matrix-container">
          <div className="matrix-y-label">Likelihood</div>
          <div className="risk-matrix">
            {[5, 4, 3, 2, 1].map((likelihood) => (
              <div key={likelihood} className="matrix-row">
                <div className="matrix-row-label">{likelihood}</div>
                {[1, 2, 3, 4, 5].map((impact) => {
                  const count = getMatrixCount(likelihood, impact);
                  const isActive = matrixFilter?.likelihood === likelihood && matrixFilter?.impact === impact;
                  return (
                    <div
                      key={impact}
                      className={`matrix-cell ${isActive ? 'active' : ''}`}
                      style={{ background: getMatrixColor(likelihood, impact) }}
                      onClick={() => handleMatrixClick(likelihood, impact)}
                      title={`Likelihood: ${likelihood}, Impact: ${impact}, Score: ${likelihood * impact}`}
                    >
                      {count > 0 && <span className="matrix-cell-count">{count}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="matrix-row matrix-x-labels">
              <div className="matrix-row-label"></div>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="matrix-x-label">{n}</div>
              ))}
            </div>
          </div>
          <div className="matrix-x-title">Impact</div>
        </div>
        {matrixFilter && (
          <div className="matrix-filter-info">
            Showing risks with Likelihood={matrixFilter.likelihood}, Impact={matrixFilter.impact}
            <button className="btn btn-sm btn-outline" onClick={() => setMatrixFilter(null)} style={{ marginLeft: 12 }}>Clear Filter</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="search-wrap">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search risks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {RISK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input filter-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Risks Table */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading risks...</p></div>
      ) : displayRisks.length === 0 ? (
        <div className="empty-state card">
          <FiShield size={48} color="var(--text-light)" />
          <h3>No risks found</h3>
          <p>Add your first risk assessment.</p>
          <button className="btn btn-accent" onClick={openCreate}><FiPlus /> Add Risk</button>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Likelihood</th>
                <th>Impact</th>
                <th>Score</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRisks.map((risk) => {
                const rid = risk.id || risk._id;
                const score = risk.risk_score || (risk.likelihood * risk.impact);
                const level = getRiskLevel(score);
                return (
                  <tr key={rid}>
                    <td className="fw-600">{risk.title}</td>
                    <td className="capitalize">{risk.category}</td>
                    <td>{risk.likelihood}</td>
                    <td>{risk.impact}</td>
                    <td>
                      <span className={`risk-score-badge ${level.class}`}>{score}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${risk.status === 'closed' ? 'success' : risk.status === 'mitigating' ? 'info' : 'warning'}`}>
                        {risk.status}
                      </span>
                    </td>
                    <td>{risk.owner || '-'}</td>
                    <td className="actions-cell">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(risk)} title="Edit"><FiEdit2 /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => setShowDelete(risk)} title="Delete"><FiTrash2 /></button>
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
            <motion.div className="modal-card" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingRisk ? 'Edit Risk' : 'Add Risk'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Risk title" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the risk..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {RISK_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
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
                    <label>Audit</label>
                    <select className="form-input" value={form.audit_id} onChange={(e) => setForm({ ...form, audit_id: e.target.value })}>
                      <option value="">Select audit</option>
                      {audits.map((a) => <option key={a.id || a._id} value={a.id || a._id}>{a.title}</option>)}
                    </select>
                  </div>
                </div>

                {/* Likelihood & Impact Sliders */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Likelihood: <strong>{form.likelihood}</strong></label>
                    <input
                      type="range"
                      min={1} max={5} step={1}
                      className="risk-slider"
                      value={form.likelihood}
                      onChange={(e) => setForm({ ...form, likelihood: parseInt(e.target.value) })}
                    />
                    <div className="slider-labels">
                      <span>1 - Rare</span>
                      <span>5 - Almost Certain</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Impact: <strong>{form.impact}</strong></label>
                    <input
                      type="range"
                      min={1} max={5} step={1}
                      className="risk-slider"
                      value={form.impact}
                      onChange={(e) => setForm({ ...form, impact: parseInt(e.target.value) })}
                    />
                    <div className="slider-labels">
                      <span>1 - Negligible</span>
                      <span>5 - Catastrophic</span>
                    </div>
                  </div>
                </div>

                {/* Calculated Score */}
                <div className="calculated-score">
                  <span>Risk Score:</span>
                  <span className={`risk-score-badge ${getRiskLevel(form.likelihood * form.impact).class}`}>
                    {form.likelihood * form.impact}
                  </span>
                  <span className="score-level">{getRiskLevel(form.likelihood * form.impact).label}</span>
                </div>

                <div className="form-group">
                  <label>Mitigation Strategy</label>
                  <textarea className="form-input" rows={2} value={form.mitigation_strategy} onChange={(e) => setForm({ ...form, mitigation_strategy: e.target.value })} placeholder="How to mitigate this risk..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Owner</label>
                    <input type="text" className="form-input" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Risk owner" />
                  </div>
                  <div className="form-group">
                    <label>Review Date</label>
                    <input type="date" className="form-input" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : (editingRisk ? 'Update Risk' : 'Add Risk')}
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
                <h2>Delete Risk</h2>
                <button className="modal-close" onClick={() => setShowDelete(null)}><FiX size={20} /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{showDelete.title}</strong>?</p>
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

export default RiskAssessment;
