import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { verifyEmail } from '../services/api';
import './Auth.css';

function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error

  useEffect(() => {
    const verify = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    verify();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-card card auth-message">
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <h2>Verifying your email...</h2>
          <p>Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="auth-page">
        <div className="auth-card card auth-message">
          <div className="auth-message-icon">
            <FiXCircle size={48} color="var(--danger)" />
          </div>
          <h2>Verification Failed</h2>
          <p>This link may have expired or is invalid. Please try again or request a new verification email.</p>
          <Link to="/login" className="btn btn-primary">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card card auth-message">
        <div className="auth-message-icon">
          <FiCheckCircle size={48} color="var(--success)" />
        </div>
        <h2>Email Verified!</h2>
        <p>Your email has been verified. You can now sign in and start auditing websites.</p>
        <Link to="/login" className="btn btn-accent">Sign In</Link>
      </div>
    </div>
  );
}

export default VerifyEmail;
