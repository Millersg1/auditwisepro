import { Link } from 'react-router-dom';
import { FiCheckCircle, FiGrid, FiShield, FiLock } from 'react-icons/fi';
import './About.css';

function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About AuditWise Pro</h1>
        <p>Professional website auditing and compliance management for teams of every size.</p>
      </section>

      <section className="about-section">
        <h2>Our Mission</h2>
        <p>
          Our mission is to make website auditing accessible to everyone — from solo developers to
          enterprise audit teams. We believe that every website deserves to be fast, secure, accessible,
          and optimized for search engines, and that the tools to achieve this should be straightforward
          and affordable.
        </p>
      </section>

      <section className="about-section" style={{ paddingTop: 0 }}>
        <h2>What We Do</h2>
        <p>
          AuditWise Pro is a comprehensive platform for website auditing and audit management. Run
          detailed scans across SEO, security, performance, and accessibility. Manage clients, track
          findings, monitor compliance against industry frameworks, assess risks, and generate
          professional reports — all from a single dashboard. Whether you need a quick scan or a
          full-scale enterprise audit workflow, AuditWise Pro has you covered.
        </p>
      </section>

      <section className="about-section" style={{ paddingTop: 0 }}>
        <h2>Why Choose Us</h2>
        <div className="about-cards">
          <div className="about-card">
            <div className="about-card-icon">
              <FiCheckCircle />
            </div>
            <h3>Comprehensive Audits</h3>
            <p>30+ checks across SEO, security, performance, and accessibility to give you a complete picture of your website's health.</p>
          </div>
          <div className="about-card">
            <div className="about-card-icon">
              <FiGrid />
            </div>
            <h3>Enterprise Platform</h3>
            <p>Full audit management with client tracking, findings management, compliance monitoring, and professional reporting.</p>
          </div>
          <div className="about-card">
            <div className="about-card-icon">
              <FiShield />
            </div>
            <h3>Multi-Framework Compliance</h3>
            <p>Built-in support for SOC 2, ISO 27001, HIPAA, GDPR, and PCI DSS frameworks to streamline your compliance efforts.</p>
          </div>
          <div className="about-card">
            <div className="about-card-icon">
              <FiLock />
            </div>
            <h3>Trusted & Secure</h3>
            <p>Enterprise-grade security with encrypted data, role-based access controls, and secure infrastructure you can rely on.</p>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <h2>Ready to get started?</h2>
        <p>Create your free account and run your first audit in minutes.</p>
        <Link to="/register" className="btn btn-accent">
          Get Started Free
        </Link>
      </section>
    </div>
  );
}

export default About;
