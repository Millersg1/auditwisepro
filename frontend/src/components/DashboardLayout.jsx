import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiSearch, FiPlusCircle, FiSettings, FiShield,
  FiLogOut, FiMenu, FiX, FiChevronLeft
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

  const navItems = [
    { to: '/dashboard', icon: <FiGrid size={20} />, label: 'Dashboard' },
    { to: '/new-scan', icon: <FiPlusCircle size={20} />, label: 'New Scan' },
    { to: '/settings', icon: <FiSettings size={20} />, label: 'Settings' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', icon: <FiShield size={20} />, label: 'Admin' });
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && <span className="sidebar-brand">AuditWise Pro</span>}
          <button className="sidebar-collapse-btn desktop-only" onClick={() => setCollapsed(!collapsed)}>
            <FiChevronLeft size={18} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button className="sidebar-close-btn mobile-only" onClick={() => setMobileOpen(false)}>
            <FiX size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
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
