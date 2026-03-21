import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FiSend, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getSystemSettings, updateSystemSetting, sendBulkEmail, toggleMaintenance, getSystemHealth
} from '../services/api';
import './SuperAdminSettings.css';

function SuperAdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [systemInfo, setSystemInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: '',
    recipient_filter: 'all',
  });
  const [previewCount, setPreviewCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Rate limit settings
  const [scanRateLimit, setScanRateLimit] = useState(10);
  const [defaultPlan, setDefaultPlan] = useState('free');

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, healthRes] = await Promise.all([
        getSystemSettings().catch(() => ({ data: {} })),
        getSystemHealth().catch(() => ({ data: {} })),
      ]);
      const s = settingsRes.data?.settings || settingsRes.data || {};
      setSettings(s);
      setMaintenanceMode(s.maintenance_mode || false);
      setScanRateLimit(s.scan_rate_limit || 10);
      setDefaultPlan(s.default_plan || 'free');
      setSystemInfo(healthRes.data || {});
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      await toggleMaintenance({ enabled: !maintenanceMode });
      setMaintenanceMode(!maintenanceMode);
      toast.success(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleSaveSetting = async (key, value) => {
    try {
      await updateSystemSetting({ key, value });
      toast.success('Setting saved');
    } catch {
      toast.error('Failed to save setting');
    }
  };

  const handleSendBulkEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    if (!window.confirm(`Send email to ${previewCount || 'all matching'} users?`)) return;
    setSending(true);
    try {
      const res = await sendBulkEmail(emailForm);
      setPreviewCount(res.data?.sent_count || 0);
      toast.success(`Email sent to ${res.data?.sent_count || 0} users`);
      setEmailForm({ subject: '', message: '', recipient_filter: 'all' });
    } catch {
      toast.error('Failed to send bulk email');
    } finally {
      setSending(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      await updateSystemSetting({ key: 'test_smtp', value: true });
      toast.success('SMTP test email sent to your address');
    } catch {
      toast.error('SMTP test failed');
    } finally {
      setTestingSmtp(false);
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="loading-container" style={{ minHeight: '50vh' }}>
        <h2>Access Denied</h2>
      </div>
    );
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="sa-settings-page">
      <h1>System Settings</h1>

      <div className="sa-settings-grid">
        {/* Maintenance Mode */}
        <motion.div className="sa-settings-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h3>Maintenance Mode</h3>
          <div className="sa-maintenance-toggle">
            <button
              className={`sa-toggle ${maintenanceMode ? 'active' : ''}`}
              onClick={handleToggleMaintenance}
            />
            <div className="sa-maintenance-info">
              <h4>{maintenanceMode ? 'Maintenance Mode ON' : 'Maintenance Mode OFF'}</h4>
              <p>When enabled, all non-admin users will see a maintenance page.</p>
            </div>
          </div>
          {maintenanceMode && (
            <div className="sa-maintenance-warning">
              Warning: The application is currently in maintenance mode. Regular users cannot access the system.
            </div>
          )}
        </motion.div>

        {/* Default Settings */}
        <motion.div className="sa-settings-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3>Default Settings</h3>
          <div className="sa-setting-row">
            <label>Default Plan</label>
            <select
              className="form-input"
              value={defaultPlan}
              onChange={(e) => setDefaultPlan(e.target.value)}
              onBlur={() => handleSaveSetting('default_plan', defaultPlan)}
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          <div className="sa-setting-row">
            <label>Scan Rate Limit (per hour)</label>
            <input
              className="form-input"
              type="number"
              value={scanRateLimit}
              onChange={(e) => setScanRateLimit(parseInt(e.target.value) || 0)}
              onBlur={() => handleSaveSetting('scan_rate_limit', scanRateLimit)}
            />
          </div>
          <div className="sa-setting-row">
            <label>SMTP Connection</label>
            <button className="btn btn-sm btn-outline" onClick={handleTestSmtp} disabled={testingSmtp}>
              <FiRefreshCw size={14} className={testingSmtp ? 'spinning' : ''} /> Test SMTP
            </button>
          </div>
        </motion.div>

        {/* Bulk Email */}
        <motion.div className="sa-settings-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3>Bulk Email</h3>
          <div className="sa-email-form">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Recipient Filter</label>
              <select
                className="form-input"
                value={emailForm.recipient_filter}
                onChange={(e) => setEmailForm({ ...emailForm, recipient_filter: e.target.value })}
              >
                <option value="all">All Users</option>
                <option value="free">Free Plan</option>
                <option value="starter">Starter Plan</option>
                <option value="pro">Pro Plan</option>
                <option value="agency">Agency Plan</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Subject</label>
              <input
                className="form-input"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Email subject..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Message</label>
              <textarea
                className="form-input sa-email-form textarea"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder="Write your message..."
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSendBulkEmail} disabled={sending}>
              <FiSend size={16} /> {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </motion.div>

        {/* System Info */}
        <motion.div className="sa-settings-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3>System Information</h3>
          <div className="sa-system-info">
            <div className="sa-system-info-item">
              <label>Node Version</label>
              <span>{systemInfo.node_version || systemInfo.nodeVersion || '-'}</span>
            </div>
            <div className="sa-system-info-item">
              <label>Uptime</label>
              <span>{systemInfo.uptime || '-'}</span>
            </div>
            <div className="sa-system-info-item">
              <label>Memory Usage</label>
              <span>{systemInfo.memory_usage || systemInfo.memoryUsage || '-'}</span>
            </div>
            <div className="sa-system-info-item">
              <label>Database Status</label>
              <span style={{ color: systemInfo.db_status === 'connected' || systemInfo.dbStatus === 'connected' ? 'var(--success)' : 'var(--danger)' }}>
                {systemInfo.db_status || systemInfo.dbStatus || 'Unknown'}
              </span>
            </div>
            <div className="sa-system-info-item">
              <label>Environment</label>
              <span>{systemInfo.environment || systemInfo.env || '-'}</span>
            </div>
            <div className="sa-system-info-item">
              <label>Version</label>
              <span>{systemInfo.version || systemInfo.app_version || '-'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default SuperAdminSettings;
