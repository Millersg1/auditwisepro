import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  FiDownload, FiShare2, FiAlertTriangle, FiAlertCircle,
  FiInfo, FiCheckCircle, FiChevronDown, FiChevronUp,
  FiClock, FiGlobe, FiArrowLeft
} from 'react-icons/fi';
import { getScan, getPublicScan, downloadPDF } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ScoreGauge from '../components/ScoreGauge';
import './ScanResults.css';

function ScanResults() {
  const { id } = useParams();
  const { user } = useAuth();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('seo');
  const [expandedIssues, setExpandedIssues] = useState({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchScan();
  }, [id]);

  const fetchScan = async () => {
    try {
      let res;
      if (user) {
        try {
          res = await getScan(id);
        } catch {
          res = await getPublicScan(id);
        }
      } else {
        res = await getPublicScan(id);
      }
      const scanData = res.data.scan || res.data;
      const issuesData = res.data.issues || [];
      scanData._issues = issuesData;
      setScan(scanData);

      // If scan is still running, poll every 3 seconds
      if (scanData.status === 'pending' || scanData.status === 'running') {
        setTimeout(fetchScan, 3000);
      }
    } catch (err) {
      toast.error('Failed to load scan results');
    } finally {
      setLoading(false);
    }
  };

  const toggleIssue = (idx) => {
    setExpandedIssues((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDownloadPDF = async () => {
    if (!user) {
      toast.info('Sign up to download PDF reports');
      return;
    }
    setDownloading(true);
    try {
      const res = await downloadPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/scan/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.info(shareUrl);
    });
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <FiAlertTriangle className="severity-icon severity-critical" />;
      case 'warning': return <FiAlertCircle className="severity-icon severity-warning" />;
      case 'info': return <FiInfo className="severity-icon severity-info" />;
      case 'pass': return <FiCheckCircle className="severity-icon severity-pass" />;
      default: return <FiInfo className="severity-icon severity-info" />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <p>Loading scan results...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <h2>Scan not found</h2>
        <p>This scan may have been deleted or does not exist.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Go Home</Link>
      </div>
    );
  }

  // Handle scan still in progress
  if (scan.status === 'pending' || scan.status === 'running') {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <h2>Scan in progress...</h2>
        <p>We are analyzing {scan.url}. This usually takes 15-30 seconds.</p>
        <button className="btn btn-accent" onClick={fetchScan} style={{ marginTop: 16 }}>
          Check Status
        </button>
      </div>
    );
  }

  const allIssues = scan._issues || [];
  const categories = {
    seo: { label: 'SEO', score: scan.seo_score ?? 0, issues: allIssues.filter(i => i.category === 'seo') },
    security: { label: 'Security', score: scan.security_score ?? 0, issues: allIssues.filter(i => i.category === 'security') },
    performance: { label: 'Performance', score: scan.performance_score ?? 0, issues: allIssues.filter(i => i.category === 'performance') },
    accessibility: { label: 'Accessibility', score: scan.accessibility_score ?? 0, issues: allIssues.filter(i => i.category === 'accessibility') },
  };

  const overallScore = scan.overall_score ?? Math.round(
    (categories.seo.score + categories.security.score + categories.performance.score + categories.accessibility.score) / 4
  );

  const activeCategory = categories[activeTab];

  return (
    <div className="scan-results">
      <div className="container">
        {/* Header */}
        <motion.div
          className="scan-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="scan-header-info">
            <Link to={user ? '/dashboard' : '/'} className="scan-back">
              <FiArrowLeft /> Back
            </Link>
            <h1 className="scan-url">
              <FiGlobe /> {scan.url}
            </h1>
            <div className="scan-meta">
              <span><FiClock /> Scanned on {new Date(scan.created_at || scan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <div className="scan-header-actions">
            <button className="btn btn-outline btn-sm" onClick={handleShare}>
              <FiShare2 /> Share
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF} disabled={downloading}>
              <FiDownload /> {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          className="score-overview card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="score-overall">
            <ScoreGauge score={overallScore} size={160} label="Overall" strokeWidth={12} />
          </div>
          <div className="score-categories">
            {Object.entries(categories).map(([key, cat]) => (
              <button
                key={key}
                className={`score-category-btn ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <ScoreGauge score={cat.score} size={80} label={cat.label} strokeWidth={6} />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="scan-tabs">
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              className={`scan-tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {cat.label}
              <span className="tab-score">{cat.score}</span>
            </button>
          ))}
        </div>

        {/* Issues List */}
        <motion.div
          className="issues-list"
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {activeCategory.issues.length === 0 ? (
            <div className="no-issues card">
              <FiCheckCircle size={40} color="var(--success)" />
              <h3>No issues found</h3>
              <p>Great job! No {activeCategory.label} issues were detected.</p>
            </div>
          ) : (
            activeCategory.issues.map((issue, idx) => {
              const issueKey = `${activeTab}-${idx}`;
              const isExpanded = expandedIssues[issueKey];
              return (
                <div key={idx} className={`issue-card card issue-${issue.severity || 'info'}`}>
                  <div className="issue-header" onClick={() => toggleIssue(issueKey)}>
                    {getSeverityIcon(issue.severity)}
                    <div className="issue-info">
                      <h4 className="issue-title">{issue.title || issue.message}</h4>
                      {issue.description && !isExpanded && (
                        <p className="issue-desc-preview">{issue.description.substring(0, 120)}...</p>
                      )}
                    </div>
                    <span className={`badge badge-${issue.severity === 'critical' ? 'danger' : issue.severity === 'warning' ? 'warning' : issue.severity === 'pass' ? 'success' : 'info'}`}>
                      {issue.severity || 'info'}
                    </span>
                    <button className="issue-toggle">
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="issue-details">
                      {issue.description && (
                        <div className="issue-description">
                          <p>{issue.description}</p>
                        </div>
                      )}
                      {issue.recommendation && (
                        <div className="issue-recommendation">
                          <strong>Recommendation:</strong>
                          <p>{issue.recommendation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>

        {/* CTA for unauthenticated users */}
        {!user && (
          <div className="scan-cta card">
            <h3>Want full audit details & tracking?</h3>
            <p>Sign up to see complete results, track improvements over time, and export PDF reports.</p>
            <Link to="/register" className="btn btn-accent">Create Free Account</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScanResults;
