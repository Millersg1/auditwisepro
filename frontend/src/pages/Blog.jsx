import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiEdit3, FiPlus, FiSearch, FiCalendar, FiUser, FiArrowRight
} from 'react-icons/fi';
import api from '../services/api';
import './Blog.css';

function Blog() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/blog');
      setPosts(res.data.posts || res.data || []);
    } catch {
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const getSeoScoreClass = (score) => {
    if (!score && score !== 0) return 'average';
    if (score >= 80) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  };

  const filtered = posts.filter((p) => {
    const matchesSearch =
      !search || (p.title || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="blog-page">
      <div className="blog-header">
        <h1>Blog Posts</h1>
        <button
          className="btn btn-accent"
          onClick={() => navigate('/blog/new')}
        >
          <FiPlus /> New Post
        </button>
      </div>

      <div className="blog-toolbar">
        <div className="blog-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading posts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-blog">
          <FiEdit3 size={48} />
          <h3>No blog posts found</h3>
          <p>Create your first blog post to boost your SEO.</p>
        </div>
      ) : (
        <div className="blog-grid">
          {filtered.map((post, i) => {
            const pid = post.id || post._id;
            const seoScore = post.seo_score ?? post.seoScore;
            return (
              <motion.div
                key={pid}
                className="blog-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/blog/edit/${pid}`)}
              >
                <div className="blog-card-header">
                  <h3>{post.title}</h3>
                  <span className={`badge status-badge ${post.status}`}>
                    {post.status}
                  </span>
                </div>
                <div className="blog-card-meta">
                  <span>
                    <FiUser size={13} />
                    {post.author || 'Unknown'}
                  </span>
                  <span>
                    <FiCalendar size={13} />
                    {new Date(
                      post.published_at || post.created_at || post.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="blog-card-tags">
                    {(Array.isArray(post.tags) ? post.tags : [post.tags])
                      .slice(0, 4)
                      .map((tag, ti) => (
                        <span key={ti} className="blog-tag">
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
                <div className="blog-card-footer">
                  {seoScore !== undefined && seoScore !== null ? (
                    <div className={`seo-score-mini ${getSeoScoreClass(seoScore)}`}>
                      {seoScore}
                    </div>
                  ) : (
                    <div />
                  )}
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.85rem',
                      color: 'var(--accent)',
                      fontWeight: 500,
                    }}
                  >
                    Edit <FiArrowRight size={14} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Blog;
