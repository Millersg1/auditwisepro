import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiEdit2, FiX, FiClipboard, FiAlertTriangle,
  FiShield, FiFile, FiActivity, FiUsers, FiCalendar
} from 'react-icons/fi';
import {
  getClient, updateClient, getClientAudits, getClientRisks,
  getClientCompliance, getClientDocuments, getClientActivity
} from '../services/api';
import './ClientDetail.css';

const INITIAL_FORM = {
  name: '', email: '', phone: '', company: '', industry: '',
  address: '', city: '', state: '', country: '', status: 'active', notes: ''
};

function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [audits, setAudits] = useState([]);
  const [risks, setRisks] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [id]);

  useEffect(() => {
    if (client) fetchTabData();
  }, [activeTab, client]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const res = await getClient(id);
      const data = res.data.client || res.data;
      setClient(data);
    } catch {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    setTabLoading(true);
    try {
      switch (activeTab) {
        case 'audits': {
          const res = await getClientAudits(id);
          setAudits(res.data.audits || res.data.data || []);
          break;
        }
        case 'risks': {
          const res = await getClientRisks(id);
          setRisks(res.data.risks || res.data.data || []);
          break;
        }
        case 'compliance': {
          const res = await getClientCompliance(id);
          setCompliance(res.data.records || res.data.data || []);
          break;
        }
        case 'documents': {
          const res = await getClientDocuments(id);
          setDocuments(res.data.documents || res.data.data || []);
          break;
        }
        case 'overview': {
          try {
            const res = await getClientActivity(id, { limit: 10 });
            setActivity(res.data.activity || res.data.data || []);
          } catch { /* optional */ }
          break;
        }
      }
    } catch {
      // Silently handle - tabs show empty state
    } finally {
      setTabLoading(false);
    }
  };

  const openEdit = () => {
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
    setShowEdit(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      await updateClient(id, form);
      toast.success('Client updated');
      setShowEdit(false);
      fetchClient();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      active: 'success', inactive: 'warning',
      draft: 'info', in_progress: 'info', review: 'warning', completed: 'success',
      compliant: 'success', non_compliant: 'danger', not_started: 'warning', partially_compliant: 'warning'
    };
    return map[status] || 'info';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading client...</p>
      </div>
    );
  }

  if (!client) return null;

  const stats = [
    { label: 'Total Audits', value: client.audits_count ?? 0, icon: <FiClipboard size={20} />, color: 'var(--info)' },
    { label: 'Open Findings', value: client.open_findings ?? 0, icon: <FiAlertTriangle size={20} />, color: 'var(--warning)' },
    { label: 'Risk Assessments', value: client.risks_count ?? 0, icon: <FiShield size={20} />, color: 'var(--danger)' },
    { label: 'Documents', value: client.documents_count ?? 0, icon: <FiFile size={20} />, color: 'var(--accent)' },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <FiUsers size={16} /> },
    { key: 'audits', label: 'Audits', icon: <FiClipboard size={16} /> },
    { key: 'risks', label: 'Risks', icon: <FiAlertTriangle size={16} /> },
    { key: 'compliance', label: 'Compliance', icon: <FiShield size={16} /> },
    { key: 'documents', label: 'Documents', icon: <FiFile size={16} /> },
  ];

  return (
    <div className="client-detail-page">
      {/* Back Button */}
      <button className="btn btn-sm btn-outline back-btn" onClick={() => navigate('/clients')}>
        <FiArrowLeft /> Back to Clients
      </button>

      {/* Client Header */}
      <div className="client-header card">
        <div className="client-header-left">
          <div className="client-detail-avatar">
            {(client.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>{client.name}</h1>
            <div className="client-meta">
              {client.company && <span>{client.company}</span>}
              {client.industry && <span className="meta-divider">|</span>}
              {client.industry && <span>{client.industry}</span>}
            </div>
            <span className={`badge badge-${getStatusBadge(client.status)}`}>
              {client.status}
            </span>
          </div>
        </div>
        <button className="btn btn-outline" onClick={openEdit}>
          <FiEdit2 /> Edit
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="stat-card card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
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

      {/* Tabs */}
      <div className="tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content card">
        {tabLoading ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="info-grid">
                  <div className="info-section">
                    <h3>Contact Information</h3>
                    <div className="info-item"><span>Email:</span> <span>{client.email || '-'}</span></div>
                    <div className="info-item"><span>Phone:</span> <span>{client.phone || '-'}</span></div>
                    <div className="info-item"><span>Address:</span> <span>{[client.address, client.city, client.state, client.country].filter(Boolean).join(', ') || '-'}</span></div>
                  </div>
                  <div className="info-section">
                    <h3>Details</h3>
                    <div className="info-item"><span>Industry:</span> <span>{client.industry || '-'}</span></div>
                    <div className="info-item"><span>Status:</span> <span className={`badge badge-${getStatusBadge(client.status)}`}>{client.status}</span></div>
                    <div className="info-item"><span>Created:</span> <span>{new Date(client.created_at || client.createdAt).toLocaleDateString()}</span></div>
                  </div>
                </div>
                {client.notes && (
                  <div className="info-section" style={{ marginTop: 20 }}>
                    <h3>Notes</h3>
                    <p className="client-notes">{client.notes}</p>
                  </div>
                )}
                {activity.length > 0 && (
                  <div className="info-section" style={{ marginTop: 20 }}>
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                      {activity.map((item, i) => (
                        <div key={i} className="activity-item">
                          <FiActivity size={14} />
                          <span className="activity-text">{item.description || item.action}</span>
                          <span className="activity-time">{new Date(item.created_at || item.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audits Tab */}
            {activeTab === 'audits' && (
              <div className="list-tab">
                {audits.length === 0 ? (
                  <div className="tab-empty"><FiClipboard size={32} /><p>No audits for this client yet.</p></div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Due Date</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((audit) => (
                        <tr
                          key={audit.id || audit._id}
                          className="clickable-row"
                          onClick={() => navigate(`/audits/${audit.id || audit._id}`)}
                        >
                          <td className="fw-600">{audit.title}</td>
                          <td><span className={`badge badge-${getStatusBadge(audit.status)}`}>{audit.status?.replace('_', ' ')}</span></td>
                          <td><span className={`badge badge-${audit.priority === 'high' ? 'danger' : audit.priority === 'medium' ? 'warning' : 'info'}`}>{audit.priority}</span></td>
                          <td className="date-cell">{audit.due_date ? new Date(audit.due_date).toLocaleDateString() : '-'}</td>
                          <td>{audit.score ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Risks Tab */}
            {activeTab === 'risks' && (
              <div className="list-tab">
                {risks.length === 0 ? (
                  <div className="tab-empty"><FiAlertTriangle size={32} /><p>No risk assessments for this client.</p></div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {risks.map((risk) => (
                        <tr key={risk.id || risk._id}>
                          <td className="fw-600">{risk.title}</td>
                          <td>{risk.category}</td>
                          <td><span className={`risk-score-badge ${risk.risk_score >= 20 ? 'critical' : risk.risk_score >= 15 ? 'high' : risk.risk_score >= 8 ? 'medium' : 'low'}`}>{risk.risk_score}</span></td>
                          <td><span className={`badge badge-${getStatusBadge(risk.status)}`}>{risk.status?.replace('_', ' ')}</span></td>
                          <td>{risk.owner || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Compliance Tab */}
            {activeTab === 'compliance' && (
              <div className="list-tab">
                {compliance.length === 0 ? (
                  <div className="tab-empty"><FiShield size={32} /><p>No compliance records for this client.</p></div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Requirement</th>
                        <th>Framework</th>
                        <th>Status</th>
                        <th>Review Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compliance.map((rec) => (
                        <tr key={rec.id || rec._id}>
                          <td className="fw-600">{rec.requirement}</td>
                          <td>{rec.framework}</td>
                          <td><span className={`badge badge-${getStatusBadge(rec.status)}`}>{rec.status?.replace('_', ' ')}</span></td>
                          <td className="date-cell">{rec.review_date ? new Date(rec.review_date).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="list-tab">
                {documents.length === 0 ? (
                  <div className="tab-empty"><FiFile size={32} /><p>No documents linked to this client.</p></div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id || doc._id}>
                          <td className="fw-600"><FiFile size={14} style={{ marginRight: 6 }} />{doc.name || doc.filename}</td>
                          <td>{doc.type || doc.mimetype || '-'}</td>
                          <td>{doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : '-'}</td>
                          <td className="date-cell">{new Date(doc.created_at || doc.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Edit Client</h2>
                <button className="modal-close" onClick={() => setShowEdit(false)}>
                  <FiX size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <input type="text" className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Industry</label>
                    <input type="text" className="form-input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input type="text" className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input type="text" className="form-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input type="text" className="form-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowEdit(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : 'Update Client'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ClientDetail;
