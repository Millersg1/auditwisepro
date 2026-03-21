import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiEdit2, FiX, FiAlertTriangle, FiCheckSquare,
  FiFile, FiMessageSquare, FiActivity, FiDownload, FiChevronDown,
  FiPlus, FiFilter, FiUser, FiCalendar, FiClock
} from 'react-icons/fi';
import {
  getAudit, updateAudit, updateAuditStatus, exportAuditReport,
  getFindings, createFinding, updateFinding, deleteFinding,
  getChecklist, updateChecklistItem,
  getDocuments, getComments, createComment, deleteComment,
  getAuditActivity, getUsers
} from '../services/api';
import ScoreGauge from '../components/ScoreGauge';
import './AuditDetail.css';

const STATUSES = ['draft', 'in_progress', 'review', 'completed'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const SEVERITY_COLORS = { critical: '#e53e3e', high: '#dd6b20', medium: '#ecc94b', low: '#3182ce' };
const SEVERITY_BADGES = { critical: 'danger', high: 'warning', medium: 'warning', low: 'info' };
const STATUS_BADGES = { draft: 'info', in_progress: 'info', review: 'warning', completed: 'success', open: 'info', resolved: 'success', accepted: 'success' };
const PRIORITY_BADGES = { low: 'info', medium: 'warning', high: 'danger', critical: 'danger' };

const INITIAL_FINDING = {
  title: '', description: '', severity: 'medium', category: '',
  recommendation: '', assigned_to: '', due_date: '', status: 'open'
};

function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('findings');
  const [tabLoading, setTabLoading] = useState(false);

  // Findings
  const [findings, setFindings] = useState([]);
  const [findingSeverityFilter, setFindingSeverityFilter] = useState('all');
  const [findingStatusFilter, setFindingStatusFilter] = useState('all');
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [findingForm, setFindingForm] = useState(INITIAL_FINDING);
  const [editingFinding, setEditingFinding] = useState(null);
  const [expandedFinding, setExpandedFinding] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState([]);

  // Documents
  const [documents, setDocuments] = useState([]);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Activity
  const [activity, setActivity] = useState([]);

  // Users
  const [users, setUsers] = useState([]);

  // Status dropdown
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchAudit();
    loadUsers();
  }, [id]);

  useEffect(() => {
    if (audit) fetchTabData();
  }, [activeTab, audit]);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await getAudit(id);
      setAudit(res.data.audit || res.data);
    } catch {
      toast.error('Failed to load audit');
      navigate('/audits');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.users || res.data.data || []);
    } catch { /* silent */ }
  };

  const fetchTabData = async () => {
    setTabLoading(true);
    try {
      switch (activeTab) {
        case 'findings': {
          const res = await getFindings(id);
          setFindings(res.data.findings || res.data.data || []);
          break;
        }
        case 'checklist': {
          const res = await getChecklist(id);
          setChecklist(res.data.checklist || res.data.items || res.data.data || []);
          break;
        }
        case 'documents': {
          const res = await getDocuments({ audit_id: id });
          setDocuments(res.data.documents || res.data.data || []);
          break;
        }
        case 'comments': {
          const res = await getComments(id);
          setComments(res.data.comments || res.data.data || []);
          break;
        }
        case 'activity': {
          const res = await getAuditActivity(id);
          setActivity(res.data.activity || res.data.data || []);
          break;
        }
      }
    } catch { /* tabs show empty */ }
    finally { setTabLoading(false); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateAuditStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      setAudit({ ...audit, status: newStatus });
      setShowStatusDropdown(false);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportAuditReport(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-${audit.title || id}-report.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch {
      toast.error('Failed to export report');
    }
  };

  const openEditModal = () => {
    setEditForm({
      title: audit.title || '',
      description: audit.description || '',
      priority: audit.priority || 'medium',
      due_date: audit.due_date ? audit.due_date.split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateAudit(id, editForm);
      toast.success('Audit updated');
      setShowEditModal(false);
      fetchAudit();
    } catch {
      toast.error('Failed to update audit');
    }
  };

  // Findings handlers
  const openAddFinding = () => {
    setEditingFinding(null);
    setFindingForm(INITIAL_FINDING);
    setShowFindingModal(true);
  };

  const openEditFinding = (finding) => {
    setEditingFinding(finding);
    setFindingForm({
      title: finding.title || '',
      description: finding.description || '',
      severity: finding.severity || 'medium',
      category: finding.category || '',
      recommendation: finding.recommendation || '',
      assigned_to: finding.assigned_to || '',
      due_date: finding.due_date ? finding.due_date.split('T')[0] : '',
      status: finding.status || 'open',
    });
    setShowFindingModal(true);
  };

  const handleFindingSubmit = async (e) => {
    e.preventDefault();
    if (!findingForm.title.trim()) return toast.error('Title is required');
    setSubmitting(true);
    try {
      if (editingFinding) {
        await updateFinding(id, editingFinding.id || editingFinding._id, findingForm);
        toast.success('Finding updated');
      } else {
        await createFinding(id, findingForm);
        toast.success('Finding added');
      }
      setShowFindingModal(false);
      const res = await getFindings(id);
      setFindings(res.data.findings || res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save finding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFinding = async (findingId) => {
    if (!window.confirm('Delete this finding?')) return;
    try {
      await deleteFinding(id, findingId);
      toast.success('Finding deleted');
      setFindings((prev) => prev.filter((f) => (f.id || f._id) !== findingId));
    } catch {
      toast.error('Failed to delete finding');
    }
  };

  // Checklist handlers
  const handleChecklistToggle = async (item) => {
    const itemId = item.id || item._id;
    const newChecked = !item.checked;
    setChecklist((prev) =>
      prev.map((i) => (i.id || i._id) === itemId ? { ...i, checked: newChecked } : i)
    );
    try {
      await updateChecklistItem(id, itemId, { checked: newChecked });
    } catch {
      setChecklist((prev) =>
        prev.map((i) => (i.id || i._id) === itemId ? { ...i, checked: !newChecked } : i)
      );
      toast.error('Failed to update checklist');
    }
  };

  // Comments handlers
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await createComment(id, { content: commentText });
      setCommentText('');
      const res = await getComments(id);
      setComments(res.data.comments || res.data.data || []);
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => (c.id || c._id) !== commentId));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  // Filtered findings
  const filteredFindings = findings.filter((f) => {
    if (findingSeverityFilter !== 'all' && f.severity !== findingSeverityFilter) return false;
    if (findingStatusFilter !== 'all' && f.status !== findingStatusFilter) return false;
    return true;
  });

  // Findings summary
  const findingSummary = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  // Checklist progress
  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((i) => i.checked).length;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading audit...</p>
      </div>
    );
  }

  if (!audit) return null;

  const tabs = [
    { key: 'findings', label: 'Findings', icon: <FiAlertTriangle size={16} />, count: findings.length },
    { key: 'checklist', label: 'Checklist', icon: <FiCheckSquare size={16} /> },
    { key: 'documents', label: 'Documents', icon: <FiFile size={16} />, count: documents.length },
    { key: 'comments', label: 'Comments', icon: <FiMessageSquare size={16} />, count: comments.length },
    { key: 'activity', label: 'Activity', icon: <FiActivity size={16} /> },
  ];

  return (
    <div className="audit-detail-page">
      {/* Back */}
      <button className="btn btn-sm btn-outline back-btn" onClick={() => navigate('/audits')}>
        <FiArrowLeft /> Back to Audits
      </button>

      {/* Audit Header */}
      <div className="audit-header card">
        <div className="audit-header-main">
          <div className="audit-header-left">
            <h1>{audit.title}</h1>
            <div className="audit-badges">
              <span className={`badge badge-${STATUS_BADGES[audit.status] || 'info'}`}>
                {audit.status?.replace('_', ' ')}
              </span>
              <span className={`badge badge-${PRIORITY_BADGES[audit.priority] || 'info'}`}>
                {audit.priority} priority
              </span>
            </div>
          </div>
          {audit.score != null && (
            <div className="audit-score-gauge">
              <ScoreGauge score={audit.score} size={90} label="Score" />
            </div>
          )}
        </div>

        <div className="audit-meta-row">
          {audit.client_name && <span><FiUser size={14} /> {audit.client_name}</span>}
          {audit.assigned_to_name && <span><FiUser size={14} /> Assigned: {audit.assigned_to_name}</span>}
          {audit.template_name && <span><FiCheckSquare size={14} /> {audit.template_name}</span>}
          {audit.created_at && <span><FiClock size={14} /> Created: {new Date(audit.created_at || audit.createdAt).toLocaleDateString()}</span>}
          {audit.due_date && <span><FiCalendar size={14} /> Due: {new Date(audit.due_date).toLocaleDateString()}</span>}
        </div>

        <div className="audit-header-actions">
          <button className="btn btn-sm btn-outline" onClick={openEditModal}><FiEdit2 /> Edit</button>
          <div className="status-dropdown-wrap">
            <button className="btn btn-sm btn-primary" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
              Change Status <FiChevronDown />
            </button>
            {showStatusDropdown && (
              <div className="status-dropdown">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className={`status-option ${audit.status === s ? 'active' : ''}`}
                    onClick={() => handleStatusChange(s)}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-sm btn-accent" onClick={handleExport}><FiDownload /> Export Report</button>
        </div>
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
            {tab.count != null && tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content card">
        {tabLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <>
            {/* ===== FINDINGS TAB ===== */}
            {activeTab === 'findings' && (
              <div className="findings-tab">
                {/* Summary Bar */}
                <div className="findings-summary">
                  {SEVERITIES.map((sev) => (
                    <div key={sev} className="findings-summary-item" style={{ borderLeftColor: SEVERITY_COLORS[sev] }}>
                      <span className="summary-count">{findingSummary[sev]}</span>
                      <span className="summary-label">{sev}</span>
                    </div>
                  ))}
                </div>

                {/* Findings Toolbar */}
                <div className="findings-toolbar">
                  <div className="findings-filters">
                    <select
                      className="form-input filter-select-sm"
                      value={findingSeverityFilter}
                      onChange={(e) => setFindingSeverityFilter(e.target.value)}
                    >
                      <option value="all">All Severities</option>
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      className="form-input filter-select-sm"
                      value={findingStatusFilter}
                      onChange={(e) => setFindingStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                  <button className="btn btn-sm btn-accent" onClick={openAddFinding}>
                    <FiPlus /> Add Finding
                  </button>
                </div>

                {/* Findings List */}
                {filteredFindings.length === 0 ? (
                  <div className="tab-empty">
                    <FiAlertTriangle size={32} />
                    <p>No findings {findingSeverityFilter !== 'all' || findingStatusFilter !== 'all' ? 'matching filters' : 'yet'}.</p>
                  </div>
                ) : (
                  <div className="findings-list">
                    {filteredFindings.map((finding) => {
                      const fid = finding.id || finding._id;
                      const isExpanded = expandedFinding === fid;
                      return (
                        <motion.div key={fid} className="finding-card" layout>
                          <div className="finding-card-header" onClick={() => setExpandedFinding(isExpanded ? null : fid)}>
                            <div className="finding-severity-bar" style={{ background: SEVERITY_COLORS[finding.severity] }} />
                            <div className="finding-info">
                              <span className="finding-title">{finding.title}</span>
                              <div className="finding-badges">
                                <span className={`badge badge-${SEVERITY_BADGES[finding.severity]}`}>{finding.severity}</span>
                                <span className={`badge badge-${STATUS_BADGES[finding.status] || 'info'}`}>{finding.status?.replace('_', ' ')}</span>
                                {finding.assigned_to_name && <span className="finding-assignee"><FiUser size={12} /> {finding.assigned_to_name}</span>}
                              </div>
                            </div>
                            <div className="finding-actions" onClick={(e) => e.stopPropagation()}>
                              <button className="btn btn-sm btn-outline" onClick={() => openEditFinding(finding)} title="Edit"><FiEdit2 /></button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteFinding(fid)} title="Delete"><FiX /></button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                className="finding-details"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {finding.description && (
                                  <div className="finding-detail-section">
                                    <h4>Description</h4>
                                    <p>{finding.description}</p>
                                  </div>
                                )}
                                {finding.recommendation && (
                                  <div className="finding-detail-section">
                                    <h4>Recommendation</h4>
                                    <p>{finding.recommendation}</p>
                                  </div>
                                )}
                                {finding.category && (
                                  <div className="finding-detail-section">
                                    <h4>Category</h4>
                                    <p>{finding.category}</p>
                                  </div>
                                )}
                                {finding.due_date && (
                                  <div className="finding-detail-section">
                                    <h4>Due Date</h4>
                                    <p>{new Date(finding.due_date).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== CHECKLIST TAB ===== */}
            {activeTab === 'checklist' && (
              <div className="checklist-tab">
                {checklist.length === 0 ? (
                  <div className="tab-empty">
                    <FiCheckSquare size={32} />
                    <p>No checklist items. Assign a template to generate a checklist.</p>
                  </div>
                ) : (
                  <>
                    <div className="checklist-progress-bar">
                      <div className="checklist-progress-info">
                        <span>{checklistDone} of {checklistTotal} completed</span>
                        <span className="checklist-percent">{checklistPercent}%</span>
                      </div>
                      <div className="progress-track">
                        <motion.div
                          className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${checklistPercent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <div className="checklist-items">
                      {checklist.map((item) => {
                        const iid = item.id || item._id;
                        return (
                          <div key={iid} className={`checklist-item ${item.checked ? 'checked' : ''}`} onClick={() => handleChecklistToggle(item)}>
                            <div className={`checklist-checkbox ${item.checked ? 'checked' : ''}`}>
                              {item.checked && <FiCheckSquare size={18} />}
                            </div>
                            <div className="checklist-item-content">
                              <span className="checklist-item-title">{item.title}</span>
                              {item.description && <span className="checklist-item-desc">{item.description}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ===== DOCUMENTS TAB ===== */}
            {activeTab === 'documents' && (
              <div className="documents-tab">
                {documents.length === 0 ? (
                  <div className="tab-empty"><FiFile size={32} /><p>No documents uploaded for this audit.</p></div>
                ) : (
                  <div className="documents-list">
                    {documents.map((doc) => (
                      <div key={doc.id || doc._id} className="document-item">
                        <FiFile size={20} className="doc-icon" />
                        <div className="doc-info">
                          <span className="doc-name">{doc.name || doc.filename}</span>
                          <span className="doc-meta">{doc.type || doc.mimetype} {doc.size ? `- ${(doc.size / 1024).toFixed(1)} KB` : ''}</span>
                        </div>
                        <span className="doc-date">{new Date(doc.created_at || doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== COMMENTS TAB ===== */}
            {activeTab === 'comments' && (
              <div className="comments-tab">
                <form className="comment-form" onSubmit={handleAddComment}>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-accent btn-sm" disabled={!commentText.trim()}>
                    Post Comment
                  </button>
                </form>
                {comments.length === 0 ? (
                  <div className="tab-empty"><FiMessageSquare size={32} /><p>No comments yet. Start the conversation.</p></div>
                ) : (
                  <div className="comments-list">
                    {comments.map((comment) => {
                      const cid = comment.id || comment._id;
                      return (
                        <div key={cid} className="comment-item">
                          <div className="comment-avatar">
                            {(comment.user_name || comment.author || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="comment-body">
                            <div className="comment-header">
                              <span className="comment-author">{comment.user_name || comment.author || 'User'}</span>
                              <span className="comment-time">{new Date(comment.created_at || comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="comment-text">{comment.content || comment.text}</p>
                          </div>
                          <button className="comment-delete" onClick={() => handleDeleteComment(cid)} title="Delete">
                            <FiX size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== ACTIVITY TAB ===== */}
            {activeTab === 'activity' && (
              <div className="activity-tab">
                {activity.length === 0 ? (
                  <div className="tab-empty"><FiActivity size={32} /><p>No activity recorded yet.</p></div>
                ) : (
                  <div className="activity-timeline">
                    {activity.map((item, i) => (
                      <div key={i} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <span className="timeline-action">{item.description || item.action}</span>
                          <span className="timeline-user">{item.user_name || item.user || ''}</span>
                          <span className="timeline-time">{new Date(item.created_at || item.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Finding Modal */}
      <AnimatePresence>
        {showFindingModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFindingModal(false)}>
            <motion.div className="modal-card" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingFinding ? 'Edit Finding' : 'Add Finding'}</h2>
                <button className="modal-close" onClick={() => setShowFindingModal(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleFindingSubmit} className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" className="form-input" value={findingForm.title} onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-input" rows={3} value={findingForm.description} onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Severity</label>
                    <select className="form-input" value={findingForm.severity} onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}>
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input type="text" className="form-input" value={findingForm.category} onChange={(e) => setFindingForm({ ...findingForm, category: e.target.value })} placeholder="e.g. Access Control" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Recommendation</label>
                  <textarea className="form-input" rows={2} value={findingForm.recommendation} onChange={(e) => setFindingForm({ ...findingForm, recommendation: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Assigned To</label>
                    <select className="form-input" value={findingForm.assigned_to} onChange={(e) => setFindingForm({ ...findingForm, assigned_to: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map((u) => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" className="form-input" value={findingForm.due_date} onChange={(e) => setFindingForm({ ...findingForm, due_date: e.target.value })} />
                  </div>
                </div>
                {editingFinding && (
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-input" value={findingForm.status} onChange={(e) => setFindingForm({ ...findingForm, status: e.target.value })}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowFindingModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : (editingFinding ? 'Update Finding' : 'Add Finding')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Audit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)}>
            <motion.div className="modal-card modal-card-sm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Audit</h2>
                <button className="modal-close" onClick={() => setShowEditModal(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" className="form-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-input" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="form-input" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" className="form-input" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AuditDetail;
