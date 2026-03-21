import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiFileText, FiDownload, FiTrash2, FiPlus,
  FiCalendar, FiFile, FiUser
} from 'react-icons/fi';
import api from '../services/api';
import './Reports.css';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audits, setAudits] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    title: '',
    type: 'audit_report',
    audit_id: '',
    client_id: '',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data.reports || res.data || []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const openGenerateModal = async () => {
    setShowModal(true);
    try {
      const [auditsRes, clientsRes] = await Promise.all([
        api.get('/audits').catch(() => ({ data: { audits: [] } })),
        api.get('/clients').catch(() => ({ data: { clients: [] } })),
      ]);
      setAudits(auditsRes.data.audits || auditsRes.data || []);
      setClients(clientsRes.data.clients || clientsRes.data || []);
    } catch {
      // Optional data, no toast needed
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a report title');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/reports', form);
      setReports((prev) => [res.data.report || res.data, ...prev]);
      toast.success('Report generated successfully');
      setShowModal(false);
      setForm({ title: '', type: 'audit_report', audit_id: '', client_id: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await api.delete(`/reports/${id}`);
      setReports((prev) => prev.filter((r) => (r.id || r._id) !== id));
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete report');
    }
  };

  const handleDownload = async (report) => {
    try {
      const res = await api.get(`/reports/${report.id || report._id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title || 'report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
    }
  };

  const filtered = filterType
    ? reports.filter((r) => r.type === filterType)
    : reports;

  const typeLabels = {
    audit_report: 'Audit Report',
    compliance_report: 'Compliance Report',
    risk_report: 'Risk Report',
    executive_summary: 'Executive Summary',
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Reports</h1>
        <button className="btn btn-accent" onClick={openGenerateModal}>
          <FiPlus /> Generate Report
        </button>
      </div>

      <div className="reports-filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="audit_report">Audit Report</option>
          <option value="compliance_report">Compliance Report</option>
          <option value="risk_report">Risk Report</option>
          <option value="executive_summary">Executive Summary</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-reports">
          <FiFileText size={48} />
          <h3>No reports found</h3>
          <p>Generate your first report to get started.</p>
        </div>
      ) : (
        <div className="reports-grid">
          {filtered.map((report, i) => {
            const rid = report.id || report._id;
            return (
              <motion.div
                key={rid}
                className="report-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="report-card-header">
                  <h3>{report.title}</h3>
                  <span className={`report-type-badge ${report.type}`}>
                    {typeLabels[report.type] || report.type}
                  </span>
                </div>
                <div className="report-meta">
                  <span>
                    <FiCalendar size={14} />
                    {new Date(report.created_at || report.createdAt).toLocaleDateString()}
                  </span>
                  {report.format && (
                    <span>
                      <FiFile size={14} />
                      {report.format.toUpperCase()}
                    </span>
                  )}
                  {report.client_name && (
                    <span>
                      <FiUser size={14} />
                      {report.client_name}
                    </span>
                  )}
                </div>
                <div className="report-card-actions">
                  <button
                    className="btn btn-sm btn-accent"
                    onClick={() => handleDownload(report)}
                  >
                    <FiDownload /> Download
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(rid)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Generate Report</h2>
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label>Report Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter report title..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Report Type</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="audit_report">Audit Report</option>
                  <option value="compliance_report">Compliance Report</option>
                  <option value="risk_report">Risk Report</option>
                  <option value="executive_summary">Executive Summary</option>
                </select>
              </div>
              <div className="form-group">
                <label>Select Audit (optional)</label>
                <select
                  className="form-input"
                  value={form.audit_id}
                  onChange={(e) => setForm({ ...form, audit_id: e.target.value })}
                >
                  <option value="">-- None --</option>
                  {audits.map((a) => (
                    <option key={a.id || a._id} value={a.id || a._id}>
                      {a.title || a.name || `Audit #${a.id || a._id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Select Client (optional)</label>
                <select
                  className="form-input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                >
                  <option value="">-- None --</option>
                  {clients.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name || c.company_name || `Client #${c.id || c._id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={generating}>
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
