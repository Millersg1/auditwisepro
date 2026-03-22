import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiChevronDown, FiUser, FiLogOut, FiGrid } from 'react-icons/fi';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="AuditWise Pro" className="brand-logo" />
          <span className="brand-text">AuditWise Pro</span>
        </Link>

        <button className="navbar-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}>
          {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        <div className={`navbar-menu ${mobileOpen ? 'open' : ''}`}>
          {!user ? (
            <>
              <a href="/#features" className="navbar-link" onClick={() => setMobileOpen(false)}>Features</a>
              <a href="/#pricing" className="navbar-link" onClick={() => setMobileOpen(false)}>Pricing</a>
              <Link to="/about" className="navbar-link" onClick={() => setMobileOpen(false)}>About</Link>
              <Link to="/login" className="navbar-link" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-accent btn-sm navbar-cta" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/new-scan" className="btn btn-accent btn-sm navbar-cta" onClick={() => setMobileOpen(false)}>
                New Scan
              </Link>
              <div className="navbar-dropdown" ref={dropdownRef}>
                <button className="navbar-user-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <div className="navbar-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <FiChevronDown size={16} />
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <FiGrid size={16} /> Dashboard
                    </Link>
                    <Link to="/settings" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <FiUser size={16} /> Account Settings
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                      <FiLogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
