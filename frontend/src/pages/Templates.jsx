import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
  FiChevronUp, FiChevronDown, FiList
} from 'react-icons/fi';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api';
import './Templates.css';

const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'HIPAA', 'GDPR', 'PCI DSS', 'Custom'];
const CATEGORIES = ['Security', 'Privacy', 'Financial', 'Operational', 'IT General Controls', 'Custom'];

const INITIAL_FORM = {
  name: '', description: '', category: '', framework: '', checklist_items: []
};

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (frameworkFilter !== 'all') params.framework = frameworkFilter;
      const res = await getTemplates(params);
      setTemplates(res.data.templates || res.data.data || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, frameworkFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ ...INITIAL_FORM, checklist_items: [] });
    setShowModal(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name || '',
      description: template.description || '',
      category: template.category || '',
      framework: template.framework || '',
      checklist_items: template.checklist_items || template.items || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id || editingTemplate._id, form);
        toast.success('Template updated');
      } else {
        await createTemplate(form);
        toast.success('Template created');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteTemplate(showDelete.id || showDelete._id);
      toast.success('Template deleted');
      setShowDelete(null);
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  // Checklist builder helpers
  const addItem = () => {
    setForm({
      ...form,
      checklist_items: [...form.checklist_items, { title: '', description: '' }]
    });
  };

  const removeItem = (index) => {
    setForm({
      ...form,
      checklist_items: form.checklist_items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const updated = [...form.checklist_items];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, checklist_items: updated });
  };

  const moveItem = (index, direction) => {
    const items = [...form.checklist_items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    setForm({ ...form, checklist_items: items });
  };

  return (
    <div className="templates-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><FiFileText /> Audit Templates</h1>
          <p>Create reusable audit checklists and templates</p>
        </div>
        <button className="btn btn-accent" onClick={openCreate}>
          <FiPlus /> Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="search-wrap">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input filter-select" value={frameworkFilter} onChange={(e) => setFrameworkFilter(e.target.value)}>
          <option value="all">All Frameworks</option>
          {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state card">
          <FiFileText size={48} color="var(--text-light)" />
          <h3>No templates found</h3>
          <p>Create your first audit template.</p>
          <button className="btn btn-accent" onClick={openCreate}>
            <FiPlus /> Create Template
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map((template, i) => {
            const tid = template.id || template._id;
            const items = template.checklist_items || template.items || [];
            return (
              <motion.div
                key={tid}
                className="template-card card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="template-card-header">
                  <h3>{template.name}</h3>
                  <div className="template-card-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(template)} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => setShowDelete(template)} title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                {template.description && (
                  <p className="template-desc">{template.description}</p>
                )}
                <div className="template-tags">
                  {template.category && <span className="badge badge-info">{template.category}</span>}
                  {template.framework && <span className="badge badge-success">{template.framework}</span>}
                </div>
                <div className="template-footer">
                  <span><FiList size={14} /> {items.length} checklist items</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
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
              className="modal-card modal-card-lg"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Template name" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Template description" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Framework</label>
                    <select className="form-input" value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })}>
                      <option value="">Select framework</option>
                      {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                {/* Checklist Builder */}
                <div className="checklist-builder">
                  <div className="checklist-builder-header">
                    <label>Checklist Items</label>
                    <button type="button" className="btn btn-sm btn-accent" onClick={addItem}>
                      <FiPlus /> Add Item
                    </button>
                  </div>
                  {form.checklist_items.length === 0 ? (
                    <div className="checklist-builder-empty">
                      <p>No items yet. Click "Add Item" to build your checklist.</p>
                    </div>
                  ) : (
                    <div className="checklist-builder-items">
                      {form.checklist_items.map((item, index) => (
                        <div key={index} className="checklist-builder-item">
                          <div className="builder-item-number">{index + 1}</div>
                          <div className="builder-item-fields">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Item title"
                              value={item.title}
                              onChange={(e) => updateItem(index, 'title', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-input builder-desc-input"
                              placeholder="Description (optional)"
                              value={item.description || ''}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="builder-item-controls">
                            <button type="button" className="builder-ctrl-btn" onClick={() => moveItem(index, -1)} disabled={index === 0} title="Move up">
                              <FiChevronUp size={16} />
                            </button>
                            <button type="button" className="builder-ctrl-btn" onClick={() => moveItem(index, 1)} disabled={index === form.checklist_items.length - 1} title="Move down">
                              <FiChevronDown size={16} />
                            </button>
                            <button type="button" className="builder-ctrl-btn danger" onClick={() => removeItem(index)} title="Remove">
                              <FiX size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? <div className="spinner spinner-sm" /> : (editingTemplate ? 'Update Template' : 'Create Template')}
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
                <h2>Delete Template</h2>
                <button className="modal-close" onClick={() => setShowDelete(null)}><FiX size={20} /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{showDelete.name}</strong>?</p>
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

export default Templates;
