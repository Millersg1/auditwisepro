import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  FiGrid, FiSearch, FiPlusCircle, FiSettings, FiShield,
  FiLogOut, FiMenu, FiX, FiChevronLeft, FiUsers, FiClipboard,
  FiFileText, FiAlertTriangle, FiCheckSquare, FiBarChart2,
  FiFolder, FiEdit3, FiBell, FiUser, FiZap, FiGlobe, FiDollarSign, FiTool
} from 'react-icons/fi';
import './DashboardLayout.css';

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navSections = [
    {
      label: 'Overview',
      items: [
        { to: '/dashboard', icon: <FiGrid size={20} />, label: 'Dashboard' },
        { to: '/new-scan', icon: <FiSearch size={20} />, label: 'Website Scan' },
      ]
    },
    {
      label: 'Audit Management',
      items: [
        { to: '/clients', icon: <FiUsers size={20} />, label: 'Clients' },
        { to: '/audits', icon: <FiClipboard size={20} />, label: 'Audits' },
        { to: '/templates', icon: <FiFileText size={20} />, label: 'Templates' },
      ]
    },
    {
      label: 'Analysis',
      items: [
        { to: '/risks', icon: <FiAlertTriangle size={20} />, label: 'Risk Assessment' },
        { to: '/compliance', icon: <FiCheckSquare size={20} />, label: 'Compliance' },
        { to: '/reports', icon: <FiBarChart2 size={20} />, label: 'Reports' },
      ]
    },
    {
      label: 'Resources',
      items: [
        { to: '/documents', icon: <FiFolder size={20} />, label: 'Documents' },
        { to: '/blog', icon: <FiEdit3 size={20} />, label: 'Blog' },
      ]
    },
    {
      label: 'Account',
      items: [
        { to: '/notifications', icon: <FiBell size={20} />, label: 'Notifications' },
        { to: '/account', icon: <FiUser size={20} />, label: 'Account' },
        { to: '/settings', icon: <FiSettings size={20} />, label: 'Subscription' },
      ]
    },
  ];

  // Add admin section
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    navSections.push({
      label: 'Admin',
      items: [
        { to: '/admin', icon: <FiShield size={20} />, label: 'Admin Panel' },
      ]
    });
  }

  // Add superadmin section
  if (user?.role === 'superadmin') {
    navSections.push({
      label: 'Super Admin',
      items: [
        { to: '/superadmin', icon: <FiZap size={20} />, label: 'System Overview' },
        { to: '/superadmin/users', icon: <FiUsers size={20} />, label: 'All Users' },
        { to: '/superadmin/organizations', icon: <FiGlobe size={20} />, label: 'Organizations' },
        { to: '/superadmin/revenue', icon: <FiDollarSign size={20} />, label: 'Revenue' },
        { to: '/superadmin/settings', icon: <FiTool size={20} />, label: 'System Settings' },
      ]
    });
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="AuditWise Pro" className="sidebar-logo" />
          {!collapsed && <span className="sidebar-brand">AuditWise Pro</span>}
          <button className="sidebar-collapse-btn desktop-only" onClick={() => setCollapsed(!collapsed)}>
            <FiChevronLeft size={18} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button className="sidebar-close-btn mobile-only" onClick={() => setMobileOpen(false)}>
            <FiX size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="sidebar-section">
              {!collapsed && <span className="sidebar-section-label">{section.label}</span>}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link sidebar-logout" onClick={handleLogout} title={collapsed ? 'Logout' : undefined}>
            <FiLogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`dashboard-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="dashboard-topbar">
          <button className="mobile-menu-btn mobile-only" onClick={() => setMobileOpen(true)}>
            <FiMenu size={22} />
          </button>
          <div className="topbar-spacer" />
          <NotificationBell />
          <div className="topbar-user">
            <div className="topbar-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{user?.name}</span>
              <span className="topbar-user-plan">{user?.plan || 'Free'} Plan</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
