import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiSave, FiSend, FiSearch, FiZap,
  FiChevronDown, FiChevronUp, FiCheckCircle,
  FiAlertCircle, FiAlertTriangle, FiX
} from 'react-icons/fi';
import api from '../services/api';
import './BlogEditor.css';

function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'draft',
    featured_image: '',
    tags: [],
    meta_title: '',
    meta_description: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('');
  const [seoResults, setSeoResults] = useState(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/blog/${id}`);
      const post = res.data.post || res.data;
      setForm({
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        status: post.status || 'draft',
        featured_image: post.featured_image || '',
        tags: Array.isArray(post.tags) ? post.tags : [],
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
      });
    } catch {
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value) => {
    const newSlug = form.slug === generateSlug(form.title) || !form.slug
      ? generateSlug(value)
      : form.slug;
    setForm({ ...form, title: value, slug: newSlug });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Autosave
  useEffect(() => {
    if (!form.title && !form.content) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000);
    return () => clearTimeout(timer);
  }, [form]);

  const handleAutoSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setAutosaveStatus('saving');
    try {
      if (isEditing) {
        await api.put(`/blog/${id}`, form);
      }
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus(''), 3000);
    } catch {
      setAutosaveStatus('');
    }
  }, [form, id, isEditing]);

  const handleSave = async (status) => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    setSaving(true);
    const payload = { ...form, status: status || form.status };
    try {
      if (isEditing) {
        await api.put(`/blog/${id}`, payload);
        toast.success('Post updated');
      } else {
        const res = await api.post('/blog', payload);
        const newId = res.data.post?.id || res.data.id;
        toast.success('Post created');
        if (newId) navigate(`/blog/edit/${newId}`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleSeoAudit = async () => {
    try {
      const res = await api.post('/blog/seo-audit', {
        title: form.title,
        content: form.content,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        slug: form.slug,
      });
      setSeoResults(res.data);
      setSeoOpen(true);
    } catch {
      toast.error('SEO audit failed');
    }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await api.post('/blog/ai-generate', { topic: aiTopic });
      const data = res.data;
      setForm({
        ...form,
        title: data.title || form.title,
        content: data.content || form.content,
        excerpt: data.excerpt || form.excerpt,
        tags: data.tags || form.tags,
        slug: generateSlug(data.title || form.title),
      });
      toast.success('Content generated successfully');
      setShowAiModal(false);
      setAiTopic('');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <FiAlertCircle size={16} color="var(--danger)" />;
      case 'warning':
        return <FiAlertTriangle size={16} color="var(--warning)" />;
      default:
        return <FiCheckCircle size={16} color="var(--success)" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const metaDescLen = (form.meta_description || '').length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading post...</p>
      </div>
    );
  }

  return (
    <div className="blog-editor-page">
      <div className="blog-editor-topbar">
        <div className="blog-editor-topbar-left">
          <span className="back-link" onClick={() => navigate('/blog')}>
            <FiArrowLeft /> Back to Blog
          </span>
          {autosaveStatus && (
            <span className={`autosave-indicator ${autosaveStatus}`}>
              {autosaveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>
        <div className="blog-editor-topbar-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={handleSeoAudit}
          >
            <FiSearch /> SEO Audit
          </button>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--info)', color: '#fff' }}
            onClick={() => setShowAiModal(true)}
          >
            <FiZap /> AI Generate
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            <FiSave /> Save Draft
          </button>
          <button
            className="btn btn-accent btn-sm"
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            <FiSend /> Publish
          </button>
        </div>
      </div>

      <div className="blog-editor-layout">
        <div className="blog-editor-main">
          <input
            type="text"
            className="title-input"
            placeholder="Enter post title..."
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
          <input
            type="text"
            className="slug-input"
            placeholder="post-slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <textarea
            className="content-textarea"
            placeholder="Write your content here... (Markdown supported)"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <div>
            <label style={{ fontWeight: 500, marginBottom: 6, display: 'block', fontSize: '0.9rem' }}>
              Excerpt
            </label>
            <textarea
              className="excerpt-textarea"
              placeholder="Short excerpt for previews..."
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>

          {/* SEO Results Panel */}
          {seoResults && (
            <div className="seo-panel">
              <div className="seo-panel-header" onClick={() => setSeoOpen(!seoOpen)}>
                <h3>
                  <FiSearch size={16} /> SEO Audit Results
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className="seo-overall-score"
                    style={{ color: getScoreColor(seoResults.score || 0) }}
                  >
                    {seoResults.score || 0}/100
                  </span>
                  {seoOpen ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>
              {seoOpen && (
                <div className="seo-panel-body">
                  {(seoResults.issues || []).map((issue, idx) => (
                    <div key={idx} className="seo-issue">
                      <span className="seo-issue-icon">
                        {getSeverityIcon(issue.severity)}
                      </span>
                      <div className="seo-issue-content">
                        <h4>{issue.title}</h4>
                        <p>{issue.recommendation}</p>
                      </div>
                    </div>
                  ))}
                  {(!seoResults.issues || seoResults.issues.length === 0) && (
                    <p style={{ color: 'var(--success)', fontSize: '0.9rem' }}>
                      No issues found. Great job!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="blog-editor-sidebar">
          <div className="sidebar-card">
            <h3>Publish</h3>
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="form-group">
              <label>Featured Image URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://..."
                value={form.featured_image}
                onChange={(e) =>
                  setForm({ ...form, featured_image: e.target.value })
                }
              />
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Tags</h3>
            <div className="tags-container">
              {form.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}>
                    <FiX size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="tag-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <button className="btn btn-sm btn-accent" onClick={handleAddTag}>
                Add
              </button>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>SEO Settings</h3>
            <div className="form-group">
              <label>Meta Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="SEO title..."
                value={form.meta_title}
                onChange={(e) =>
                  setForm({ ...form, meta_title: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Meta Description</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="SEO description..."
                value={form.meta_description}
                onChange={(e) =>
                  setForm({ ...form, meta_description: e.target.value })
                }
                style={{ resize: 'vertical' }}
              />
              <div
                className={`char-count ${
                  metaDescLen > 160 ? 'danger' : metaDescLen > 140 ? 'warning' : ''
                }`}
              >
                {metaDescLen}/160
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div
            className="modal-content ai-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              <FiZap /> AI Generate Content
            </h2>
            <div className="form-group">
              <label>Topic</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter a topic or keyword..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAiGenerate();
                }}
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 16 }}>
              AI will generate a title, content, excerpt, and tags based on your topic. Existing content will be replaced.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowAiModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-accent"
                onClick={handleAiGenerate}
                disabled={aiGenerating}
              >
                {aiGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlogEditor;
