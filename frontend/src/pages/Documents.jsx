import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiUpload, FiTrash2, FiSearch, FiGrid, FiList,
  FiFile, FiCalendar, FiDownload, FiFolder, FiUser
} from 'react-icons/fi';
import api from '../services/api';
import './Documents.css';

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audits, setAudits] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    name: '',
    category: 'evidence',
    tags: '',
    client_id: '',
    audit_id: '',
    file_url: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || res.data || []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = async () => {
    setShowModal(true);
    try {
      const [auditsRes, clientsRes] = await Promise.all([
        api.get('/audits').catch(() => ({ data: { audits: [] } })),
        api.get('/clients').catch(() => ({ data: { clients: [] } })),
      ]);
      setAudits(auditsRes.data.audits || auditsRes.data || []);
      setClients(clientsRes.data.clients || clientsRes.data || []);
    } catch {
      // Optional
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    setUploading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const res = await api.post('/documents', payload);
      setDocuments((prev) => [res.data.document || res.data, ...prev]);
      toast.success('Document uploaded successfully');
      setShowModal(false);
      setForm({ name: '', category: 'evidence', tags: '', client_id: '', audit_id: '', file_url: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => (d.id || d._id) !== id));
      setSelected((prev) => prev.filter((s) => s !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} documents?`)) return;
    try {
      await Promise.all(selected.map((id) => api.delete(`/documents/${id}`)));
      setDocuments((prev) => prev.filter((d) => !selected.includes(d.id || d._id)));
      setSelected([]);
      toast.success('Documents deleted');
    } catch {
      toast.error('Failed to delete some documents');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getFileIcon = (name) => {
    if (!name) return 'default';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'img';
    return 'default';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const filtered = documents.filter((d) => {
    const matchesSearch = !search || (d.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || d.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="documents-page">
      <div className="documents-header">
        <h1>Documents</h1>
        <button className="btn btn-accent" onClick={openUploadModal}>
          <FiUpload /> Upload Document
        </button>
      </div>

      <div className="documents-toolbar">
        <div className="documents-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="evidence">Evidence</option>
          <option value="report">Report</option>
          <option value="policy">Policy</option>
          <option value="procedure">Procedure</option>
          <option value="template">Template</option>
          <option value="other">Other</option>
        </select>
        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <FiGrid />
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <FiList />
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bulk-actions">
          <span>{selected.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
            <FiTrash2 /> Delete Selected
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading documents...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-documents">
          <FiFolder size={48} />
          <h3>No documents found</h3>
          <p>Upload your first document to get started.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="documents-grid">
          {filtered.map((doc, i) => {
            const did = doc.id || doc._id;
            const iconType = getFileIcon(doc.name);
            return (
              <motion.div
                key={did}
                className={`document-card ${selected.includes(did) ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <input
                  type="checkbox"
                  className="document-card-checkbox"
                  checked={selected.includes(did)}
                  onChange={() => toggleSelect(did)}
                />
                <div className={`document-icon ${iconType}`}>
                  <FiFile />
                </div>
                <div className="document-name">{doc.name}</div>
                <span className={`category-badge ${doc.category}`}>
                  {doc.category}
                </span>
                <div className="document-meta">
                  <span>
                    <FiCalendar size={12} />
                    {new Date(doc.created_at || doc.createdAt).toLocaleDateString()}
                  </span>
                  {doc.size && (
                    <span>{formatSize(doc.size)}</span>
                  )}
                  {doc.client_name && (
                    <span><FiUser size={12} /> {doc.client_name}</span>
                  )}
                </div>
                <div className="document-card-actions">
                  <a
                    href={doc.file_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-accent"
                  >
                    <FiDownload /> Download
                  </a>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(did)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="documents-list">
          {filtered.map((doc) => {
            const did = doc.id || doc._id;
            const iconType = getFileIcon(doc.name);
            return (
              <div key={did} className="document-list-item">
                <input
                  type="checkbox"
                  checked={selected.includes(did)}
                  onChange={() => toggleSelect(did)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <div className={`document-icon ${iconType}`}>
                  <FiFile />
                </div>
                <div className="document-list-info">
                  <div className="document-name">{doc.name}</div>
                  <span className={`category-badge ${doc.category}`}>
                    {doc.category}
                  </span>
                </div>
                <div className="document-list-meta">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {new Date(doc.created_at || doc.createdAt).toLocaleDateString()}
                  </span>
                  {doc.size && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {formatSize(doc.size)}
                    </span>
                  )}
                </div>
                <a
                  href={doc.file_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-accent"
                >
                  <FiDownload />
                </a>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(did)}
                >
                  <FiTrash2 />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Document</h2>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Document Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter document name..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="evidence">Evidence</option>
                  <option value="report">Report</option>
                  <option value="policy">Policy</option>
                  <option value="procedure">Procedure</option>
                  <option value="template">Template</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SOC2, Q1, compliance"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Link to Client (optional)</label>
                <select
                  className="form-input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                >
                  <option value="">-- None --</option>
                  {clients.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name || c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Link to Audit (optional)</label>
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
                <label>File URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
