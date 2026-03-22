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
          <Link to="/contact">Contact</Link>
          <Link to="/about">About</Link>
        </div>
        <div className="footer-legal">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/cookie-policy">Cookie Policy</Link>
          <Link to="/acceptable-use">Acceptable Use</Link>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AuditWise Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
