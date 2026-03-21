import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/api';
import './SubscriptionSuccess.css';

function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [countdown, setCountdown] = useState(5);

  const plan = searchParams.get('plan') || 'your selected';

  // Refresh user profile to get updated plan info
  useEffect(() => {
    getProfile()
      .then((res) => {
        const userData = res.data.user || res.data;
        updateUser(userData);
      })
      .catch(() => {});
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="subscription-success">
      <div className="success-card card">
        <div className="success-icon">
          <FiCheckCircle size={56} />
        </div>
        <h1>Subscription Activated!</h1>
        <p className="success-plan">
          You are now on the <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan.
        </p>
        <p className="success-desc">
          Thank you for subscribing! Your account has been upgraded and all premium features are now available.
        </p>
        <Link to="/dashboard" className="btn btn-accent btn-lg">
          Go to Dashboard <FiArrowRight />
        </Link>
        <p className="success-redirect">
          Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>
      </div>
    </div>
  );
}

export default SubscriptionSuccess;
