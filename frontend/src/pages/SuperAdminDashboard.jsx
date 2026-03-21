import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiBriefcase, FiCreditCard, FiDollarSign,
  FiMail, FiTool
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminStats, getSystemHealth, toggleMaintenance
} from '../services/api';
import './SuperAdminDashboard.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
);

function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        getSuperAdminStats(),
        getSystemHealth().catch(() => ({ data: { services: [] } })),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data?.services || healthRes.data?.health || []);
    } catch {
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const current = stats?.maintenance_mode || false;
    if (!window.confirm(`${current ? 'Disable' : 'Enable'} maintenance mode?`)) return;
    try {
      await toggleMaintenance({ enabled: !current });
      setStats((prev) => ({ ...prev, maintenance_mode: !current }));
      toast.success(`Maintenance mode ${!current ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle maintenance mode');
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="loading-container" style={{ minHeight: '50vh' }}>
        <h2>Access Denied</h2>
        <p>SuperAdmin access required.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  const totalUsers = stats?.total_users || 0;
  const totalOrgs = stats?.total_organizations || 0;
  const activeSubscriptions = stats?.active_subscriptions || 0;
  const mrr = stats?.mrr || 0;

  // Revenue chart data (last 12 months)
  const revenueMonths = stats?.monthly_revenue?.map((m) => m.month) || [];
  const revenueValues = stats?.monthly_revenue?.map((m) => m.amount) || [];
  const revenueChartData = {
    labels: revenueMonths.length ? revenueMonths : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    datasets: [{
      label: 'Revenue ($)',
      data: revenueValues.length ? revenueValues : [0,0,0,0,0,0,0,0,0,0,0,0],
      backgroundColor: 'rgba(56, 178, 172, 0.7)',
      borderColor: 'var(--accent)',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // Users by plan doughnut
  const planLabels = stats?.users_by_plan?.map((p) => p.plan) || ['Free','Starter','Pro','Agency'];
  const planValues = stats?.users_by_plan?.map((p) => p.count) || [0,0,0,0];
  const planChartData = {
    labels: planLabels,
    datasets: [{
      data: planValues,
      backgroundColor: ['#718096','#3182ce','#38b2ac','#1a365d'],
      borderWidth: 0,
    }],
  };

  // New users trend (last 30 days)
  const trendDates = stats?.new_users_trend?.map((d) => d.date) || [];
  const trendValues = stats?.new_users_trend?.map((d) => d.count) || [];
  const trendChartData = {
    labels: trendDates,
    datasets: [{
      label: 'New Users',
      data: trendValues,
      borderColor: 'var(--info)',
      backgroundColor: 'rgba(49, 130, 206, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } } },
  };

  const recentUsers = stats?.recent_signups || [];

  const healthItems = health.length > 0 ? health : [
    { name: 'Database', status: 'healthy' },
    { name: 'Email Service', status: 'healthy' },
    { name: 'Stripe', status: 'healthy' },
    { name: 'Storage', status: 'healthy' },
  ];

  const statCards = [
    { label: 'Total Users', value: totalUsers, icon: <FiUsers size={22} />, color: 'var(--info)' },
    { label: 'Total Orgs', value: totalOrgs, icon: <FiBriefcase size={22} />, color: 'var(--accent)' },
    { label: 'Active Subscriptions', value: activeSubscriptions, icon: <FiCreditCard size={22} />, color: 'var(--success)' },
    { label: 'MRR', value: `$${mrr.toLocaleString()}`, icon: <FiDollarSign size={22} />, color: 'var(--warning)' },
  ];

  return (
    <div className="sa-dashboard">
      <h1>System Overview</h1>

      {/* Stats */}
      <div className="sa-stats-row">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            className="sa-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="sa-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>
              {s.icon}
            </div>
            <div className="sa-stat-info">
              <span className="sa-stat-value">{s.value}</span>
              <span className="sa-stat-label">{s.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts: Revenue + Plan breakdown */}
      <div className="sa-charts-row">
        <div className="sa-chart-card">
          <h3>Monthly Revenue (Last 12 Months)</h3>
          <div className="sa-chart-wrap">
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </div>
        <div className="sa-chart-card">
          <h3>Users by Plan</h3>
          <div className="sa-doughnut-wrap">
            <Doughnut data={planChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* New users trend */}
      <div className="sa-trend-row">
        <div className="sa-chart-card">
          <h3>New Users (Last 30 Days)</h3>
          <div className="sa-chart-wrap">
            <Line data={trendChartData} options={chartOptions} />
          </div>
        </div>

        {/* System Health */}
        <div className="sa-chart-card">
          <h3>System Health</h3>
          <div className="sa-health-grid">
            {healthItems.map((h, i) => (
              <div key={i} className="sa-health-item">
                <div className={`sa-health-dot ${h.status === 'healthy' || h.status === 'ok' ? 'green' : h.status === 'degraded' ? 'yellow' : 'red'}`} />
                <span className="sa-health-label">{h.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sa-quick-actions">
        <button className="btn btn-primary" onClick={handleToggleMaintenance}>
          <FiTool size={16} />
          {stats?.maintenance_mode ? 'Disable' : 'Enable'} Maintenance Mode
        </button>
        <Link to="/superadmin/settings" className="btn btn-outline">
          <FiMail size={16} /> Send Bulk Email
        </Link>
      </div>

      {/* Recent Signups */}
      <div className="sa-recent-section">
        <div className="sa-chart-card">
          <h3>Recent Signups</h3>
          <div style={{ overflow: 'auto' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '24px' }}>No recent signups</td></tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id || u._id}>
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                          <div>
                            <strong>{u.name}</strong>
                            <br />
                            <small style={{ color: 'var(--text-light)' }}>{u.email}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{u.plan || 'free'}</span></td>
                      <td><span className="badge badge-success" style={{ textTransform: 'capitalize' }}>{u.role || 'user'}</span></td>
                      <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(u.created_at || u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
