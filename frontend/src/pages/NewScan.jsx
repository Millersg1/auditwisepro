import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiGlobe, FiSearch, FiExternalLink, FiClock } from 'react-icons/fi';
import { createScan, getScans } from '../services/api';
import './NewScan.css';

function NewScan() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    getScans({ limit: 5 })
      .then((res) => setRecentScans(res.data.scans || res.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
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

  return (
    <div className="new-scan-page">
      <h1>New Scan</h1>
      <p className="new-scan-desc">Enter a website URL to run a comprehensive audit.</p>

      <form className="new-scan-form card" onSubmit={handleSubmit}>
        <div className="new-scan-input-wrap">
          <FiGlobe className="new-scan-icon" />
          <input
            type="text"
            className="form-input new-scan-input"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={scanning}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-accent btn-lg" disabled={scanning}>
          {scanning ? (
            <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Scanning...</>
          ) : (
            <><FiSearch /> Start Scan</>
          )}
        </button>
      </form>

      {recentScans.length > 0 && (
        <div className="recent-scans">
          <h3><FiClock /> Recent Scans</h3>
          <div className="recent-list">
            {recentScans.slice(0, 5).map((scan) => {
              const scanId = scan.id || scan._id;
              return (
                <Link key={scanId} to={`/scan/${scanId}`} className="recent-item card">
                  <FiGlobe className="recent-icon" />
                  <span className="recent-url">{scan.url}</span>
                  <span className="recent-date">{new Date(scan.created_at || scan.createdAt).toLocaleDateString()}</span>
                  <FiExternalLink className="recent-arrow" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NewScan;
