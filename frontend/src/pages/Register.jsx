import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiBriefcase, FiUserPlus } from 'react-icons/fi';
import './Auth.css';

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        company: form.company || undefined,
      });
      if (data.message?.includes('verify')) {
        toast.success('Account created! Please check your email to verify.');
        navigate('/login');
      } else {
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Start auditing websites for free</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <div className="input-icon-wrap">
              <FiUser className="input-icon" />
              <input
                id="name"
                name="name"
                type="text"
                className="form-input form-input-icon"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <div className="input-icon-wrap">
              <FiMail className="input-icon" />
              <input
                id="email"
                name="email"
                type="email"
                className="form-input form-input-icon"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="input-icon-wrap">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input form-input-icon"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="input-icon-wrap">
                <FiLock className="input-icon" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="form-input form-input-icon"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="company">Company <span className="optional">(optional)</span></label>
            <div className="input-icon-wrap">
              <FiBriefcase className="input-icon" />
              <input
                id="company"
                name="company"
                type="text"
                className="form-input form-input-icon"
                placeholder="Your company name"
                value={form.company}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-accent btn-lg auth-btn" disabled={loading}>
            {loading ? (
              <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Creating account...</>
            ) : (
              <><FiUserPlus /> Create Account</>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
