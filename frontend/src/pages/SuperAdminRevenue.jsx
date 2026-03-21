import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { getRevenueStats } from '../services/api';
import './SuperAdminRevenue.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Tooltip, Legend, Filler
);

function SuperAdminRevenue() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      const res = await getRevenueStats();
      setData(res.data);
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
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

  const mrr = data?.mrr || 0;
  const mrrTrend = data?.mrr_trend || 0;
  const totalRevenue = data?.total_revenue || 0;
  const activeSubs = data?.active_subscriptions || 0;
  const churnRate = data?.churn_rate || 0;
  const events = data?.subscription_events || [];

  // Revenue by plan (stacked bar)
  const planMonths = data?.revenue_by_plan?.months || [];
  const planDatasets = data?.revenue_by_plan?.datasets || [];
  const planColors = { free: '#718096', starter: '#3182ce', pro: '#38b2ac', agency: '#1a365d' };

  const stackedBarData = {
    labels: planMonths.length ? planMonths : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    datasets: planDatasets.length ? planDatasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: planColors[ds.label?.toLowerCase()] || '#718096',
      borderRadius: 4,
    })) : [
      { label: 'Free', data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: '#718096', borderRadius: 4 },
      { label: 'Starter', data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: '#3182ce', borderRadius: 4 },
      { label: 'Pro', data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: '#38b2ac', borderRadius: 4 },
      { label: 'Agency', data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: '#1a365d', borderRadius: 4 },
    ],
  };

  // Monthly revenue trend (line)
  const trendMonths = data?.monthly_trend?.map((m) => m.month) || [];
  const trendValues = data?.monthly_trend?.map((m) => m.amount) || [];
  const lineData = {
    labels: trendMonths,
    datasets: [{
      label: 'Revenue',
      data: trendValues,
      borderColor: '#38b2ac',
      backgroundColor: 'rgba(56, 178, 172, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#38b2ac',
    }],
  };

  const stackedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } },
    },
  };

  const cards = [
    { label: 'Monthly Recurring Revenue', value: `$${mrr.toLocaleString()}`, trend: mrrTrend },
    { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, trend: null },
    { label: 'Active Subscriptions', value: activeSubs, trend: null },
    { label: 'Churn Rate', value: `${churnRate}%`, trend: churnRate > 5 ? -1 : 1 },
  ];

  return (
    <div className="sa-revenue-page">
      <h1>Revenue Analytics</h1>

      {/* Top cards */}
      <div className="sa-revenue-cards">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            className="sa-revenue-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="sa-revenue-card-label">{c.label}</div>
            <div className="sa-revenue-card-value">
              {c.value}
              {c.trend !== null && c.trend !== 0 && (
                <span className={`sa-trend-arrow ${c.trend > 0 ? 'up' : 'down'}`}>
                  {c.trend > 0 ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
                  {typeof c.trend === 'number' && Math.abs(c.trend) > 1 ? `${Math.abs(c.trend)}%` : ''}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="sa-revenue-charts">
        <div className="sa-revenue-chart-card">
          <h3>Revenue by Plan</h3>
          <div className="sa-revenue-chart-wrap">
            <Bar data={stackedBarData} options={stackedOptions} />
          </div>
        </div>
        <div className="sa-revenue-chart-card">
          <h3>Monthly Revenue Trend</h3>
          <div className="sa-revenue-chart-wrap">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* Subscription events */}
      <motion.div className="sa-events-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <h3>Recent Subscription Events</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sa-events-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Event</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>No events found</td></tr>
              ) : (
                events.map((e, i) => (
                  <tr key={i}>
                    <td>{e.user_name || e.userName || e.email}</td>
                    <td>
                      <span className={`sa-event-type ${e.type || e.event}`}>
                        {e.type || e.event}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{e.plan || '-'}</td>
                    <td>{e.amount ? `$${e.amount}` : '-'}</td>
                    <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(e.date || e.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default SuperAdminRevenue;
