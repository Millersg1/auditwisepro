import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiSearch, FiBarChart2, FiAward, FiActivity,
  FiTrash2, FiExternalLink, FiGlobe, FiPlus
} from 'react-icons/fi';
import { getScans, createScan, deleteScan } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ScoreGauge from '../components/ScoreGauge';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await getScans();
      setScans(res.data.scans || res.data || []);
    } catch {
      toast.error('Failed to load scans');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    setScanning(true);
    try {
      const res = await createScan({ url: finalUrl });
      const scanId = res.data.scan?.id || res.data.id;
      navigate(`/scan/${scanId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start scan');
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async (scanId) => {
    if (!window.confirm('Delete this scan?')) return;
    try {
      await deleteScan(scanId);
      setScans((prev) => prev.filter((s) => (s.id || s._id) !== scanId));
      toast.success('Scan deleted');
    } catch {
      toast.error('Failed to delete scan');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'var(--success)';
    if (score >= 70) return 'var(--accent)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  // Stats
  const totalScans = scans.length;
  const completedScans = scans.filter((s) => s.status === 'completed');
  const scores = completedScans.map((s) => {
    return s.overall_score ?? Math.round(
      ((s.seo_score || 0) + (s.security_score || 0) + (s.performance_score || 0) + (s.accessibility_score || 0)) / 4
    );
  }).filter(s => s > 0);

  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const scansRemaining = (user?.scans_limit || 5) - totalScans;

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <h1>Welcome back, {user?.name?.split(' ')[0] || 'there'}!</h1>
        <p>Here's an overview of your website audits.</p>
      </div>

      {/* Quick Scan */}
      <form className="quick-scan card" onSubmit={handleQuickScan}>
        <FiGlobe className="quick-scan-icon" />
        <input
          type="text"
          className="form-input"
          placeholder="Enter a URL to scan..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={scanning}
        />
        <button type="submit" className="btn btn-accent" disabled={scanning}>
          {scanning ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <><FiSearch /> Scan</>}
        </button>
      </form>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Scans', value: totalScans, icon: <FiBarChart2 size={22} />, color: 'var(--info)' },
          { label: 'Average Score', value: avgScore, icon: <FiActivity size={22} />, color: 'var(--accent)' },
          { label: 'Best Score', value: bestScore, icon: <FiAward size={22} />, color: 'var(--success)' },
          { label: 'Scans Remaining', value: Math.max(0, scansRemaining), icon: <FiSearch size={22} />, color: 'var(--warning)' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="stat-card card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
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

      {/* Scans Table */}
      <div className="scans-section">
        <div className="scans-header">
          <h2>Recent Scans</h2>
          <Link to="/new-scan" className="btn btn-accent btn-sm"><FiPlus /> New Scan</Link>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : scans.length === 0 ? (
          <div className="empty-state card">
            <FiSearch size={48} color="var(--text-light)" />
            <h3>No scans yet</h3>
            <p>Run your first website audit to see results here.</p>
            <Link to="/new-scan" className="btn btn-accent">Start Your First Scan</Link>
          </div>
        ) : (
          <div className="scans-table-wrap card">
            <table className="scans-table">
              <thead>
                <tr>
                  <th>Website</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => {
                  const scanId = scan.id || scan._id;
                  const r = scan.results || {};
                  const score = r.overall_score ?? Math.round(
                    ((r.seo?.score || 0) + (r.security?.score || 0) + (r.performance?.score || 0) + (r.accessibility?.score || 0)) / 4
                  );
                  return (
                    <tr key={scanId}>
                      <td className="scan-url-cell">
                        <FiGlobe className="scan-url-icon" />
                        <span>{scan.url}</span>
                      </td>
                      <td className="scan-date-cell">
                        {new Date(scan.created_at || scan.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {scan.status === 'completed' ? (
                          <span className="score-pill" style={{ background: `${getScoreColor(score)}15`, color: getScoreColor(score) }}>
                            {score}
                          </span>
                        ) : (
                          <span className="score-pill" style={{ background: 'var(--bg)', color: 'var(--text-light)' }}>--</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${scan.status === 'completed' ? 'success' : scan.status === 'failed' ? 'danger' : 'info'}`}>
                          {scan.status}
                        </span>
                      </td>
                      <td className="scan-actions-cell">
                        <Link to={`/scan/${scanId}`} className="btn btn-sm btn-outline" title="View">
                          <FiExternalLink />
                        </Link>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(scanId)} title="Delete">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
