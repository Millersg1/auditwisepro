import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-brand">
          <span className="footer-logo">AuditWise Pro</span>
          <p className="footer-tagline">Instant website audits for better performance.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AuditWise Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
