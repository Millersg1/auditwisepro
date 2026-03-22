import { Link } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';

function NotFound() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <FiAlertTriangle size={60} color="var(--warning)" style={{ marginBottom: 20 }} />
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>404</h1>
      <h2 style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: 12 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 24, maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-accent">Go Home</Link>
    </div>
  );
}

export default NotFound;
