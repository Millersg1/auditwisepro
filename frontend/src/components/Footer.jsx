import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer-inner container">
        <div className="footer-brand">
          <span className="footer-logo">AuditWise Pro</span>
          <p className="footer-tagline">Instant website audits for better performance.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
          <Link to="/contact">Contact</Link>
          <Link to="/about">About</Link>
        </nav>
        <nav className="footer-legal" aria-label="Legal links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/cookie-policy">Cookie Policy</Link>
          <Link to="/acceptable-use">Acceptable Use</Link>
        </nav>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AuditWise Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
