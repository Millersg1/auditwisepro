import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiSend, FiCheckCircle } from 'react-icons/fi';
import { forgotPassword } from '../services/api';
import './Auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card card auth-message">
          <div className="auth-message-icon">
            <FiCheckCircle size={48} color="var(--success)" />
          </div>
          <h2>Check Your Email</h2>
          <p>If an account exists for {email}, we sent password reset instructions.</p>
          <Link to="/login" className="btn btn-primary">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p>Enter your email and we'll send a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-icon-wrap">
              <FiMail className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input form-input-icon"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-accent btn-lg auth-btn" disabled={loading}>
            {loading ? (
              <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Sending...</>
            ) : (
              <><FiSend /> Send Reset Link</>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Remember your password? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
