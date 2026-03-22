import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FiSearch, FiShield, FiZap, FiEye, FiArrowRight,
  FiCheck, FiGlobe, FiLock, FiTrendingUp, FiLoader
} from 'react-icons/fi';
import { createScan, createCheckoutSession } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

function LandingPage() {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubscribe = async (plan) => {
    if (!user) {
      toast.info('Please create an account first');
      navigate('/register');
      return;
    }
    setSubscribingPlan(plan);
    try {
      const res = await createCheckoutSession(plan);
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setSubscribingPlan(null);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setScanning(true);
    try {
      const res = await createScan({ url: finalUrl });
      const scanId = res.data.scan?.id || res.data.id;
      navigate(`/scan/${scanId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start scan. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
    }),
  };

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container hero-content hero-split">
          <div className="hero-text">
            <motion.h1
              className="hero-title"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              Audit Your Website <br /><span className="hero-accent">in Seconds</span>
            </motion.h1>

            <motion.p
              className="hero-subtitle"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              Get instant insights on SEO, security, performance & accessibility.
              <br />Free scan — no signup required.
            </motion.p>

            <motion.form
              className="hero-form"
              onSubmit={handleScan}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
            >
              <div className="hero-input-wrap">
                <FiGlobe className="hero-input-icon" />
                <input
                  type="text"
                  className="hero-input"
                  placeholder="Enter your website URL (e.g. example.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={scanning}
                  aria-label="Website URL to audit"
                />
              </div>
              <button
                type="submit"
                className="btn btn-accent btn-lg hero-btn"
                disabled={scanning}
                aria-label="Start website audit scan"
              >
                {scanning ? (
                  <>
                    <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
                    Scanning...
                  </>
                ) : (
                  <>
                    <FiSearch size={20} />
                    Scan Now
                  </>
                )}
              </button>
            </motion.form>

            <motion.div
              className="hero-trust"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
            >
              <div className="trust-item">
                <FiCheck /> <span>10,000+ websites scanned</span>
              </div>
              <div className="trust-item">
                <FiCheck /> <span>100% free basic scan</span>
              </div>
              <div className="trust-item">
                <FiCheck /> <span>No signup required</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="hero-mascot"
            initial={{ opacity: 0, scale: 0.8, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          >
            <img src="/mascot.png" alt="AuditWise Pro Owl" className="hero-mascot-img" />
            <div className="hero-mascot-glow" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <h2>Comprehensive Website Auditing</h2>
            <p>Four essential audits in one powerful scan</p>
          </motion.div>

          <div className="features-grid">
            {[
              {
                img: '/owl-seo.png',
                title: 'SEO Audit',
                desc: 'Analyze meta tags, headings, content structure, sitemaps, and on-page SEO factors to boost your search rankings.',
              },
              {
                img: '/owl-security.png',
                title: 'Security Check',
                desc: 'Detect SSL issues, mixed content, security headers, and vulnerabilities that could put your site at risk.',
              },
              {
                img: '/owl-performance.png',
                title: 'Performance Analysis',
                desc: 'Measure load times, resource optimization, caching, and Core Web Vitals for a faster user experience.',
              },
              {
                img: '/owl-accessibility.png',
                title: 'Accessibility Review',
                desc: 'Check WCAG compliance, alt text, ARIA labels, color contrast, and keyboard navigation support.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="feature-card card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i}
              >
                <div className="feature-owl">
                  <img src={feature.img} alt={feature.title} className="feature-owl-img" />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <h2>How It Works</h2>
            <p>Three simple steps to a better website</p>
          </motion.div>

          <div className="steps-grid">
            {[
              { num: '1', title: 'Enter Your URL', desc: 'Paste your website address into the scanner. No signup needed for your first scan.' },
              { num: '2', title: 'We Scan Everything', desc: 'Our engine checks SEO, security, performance, and accessibility in seconds.' },
              { num: '3', title: 'Get Your Report', desc: 'Receive a detailed report with scores, issues found, and actionable recommendations.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                className="step-card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i}
              >
                <div className="step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing" id="pricing">
        <div className="container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <h2>Simple, Transparent Pricing</h2>
            <p>Start for free, upgrade as you grow</p>
          </motion.div>

          <div className="pricing-grid">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                features: ['5 scans per month', 'Basic audit reports', 'Overall scores', 'Shareable links'],
                cta: 'Get Started',
                ctaLink: '/register',
                highlight: false,
                stripePlan: null,
              },
              {
                name: 'Starter',
                price: '$29',
                period: '/month',
                features: ['50 scans per month', 'PDF export', 'Email alerts', 'Scan history', 'Priority support'],
                cta: 'Subscribe',
                ctaLink: null,
                highlight: false,
                stripePlan: 'starter',
              },
              {
                name: 'Pro',
                price: '$79',
                period: '/month',
                features: ['200 scans per month', 'Scheduled scans', 'API access', 'Custom branding', 'Webhook notifications'],
                cta: 'Subscribe',
                ctaLink: null,
                highlight: true,
                stripePlan: 'pro',
              },
              {
                name: 'Agency',
                price: '$199',
                period: '/month',
                features: ['Unlimited scans', 'White-label reports', 'Team members', 'Priority queue', 'Dedicated support'],
                cta: 'Subscribe',
                ctaLink: null,
                highlight: false,
                stripePlan: 'agency',
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                className={`pricing-card card ${plan.highlight ? 'pricing-highlight' : ''}`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i}
              >
                {plan.highlight && <div className="pricing-badge">Most Popular</div>}
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                <ul className="pricing-features">
                  {plan.features.map((f, j) => (
                    <li key={j}><FiCheck className="pricing-check" /> {f}</li>
                  ))}
                </ul>
                {plan.stripePlan ? (
                  <button
                    className="btn btn-accent btn-lg pricing-btn"
                    onClick={() => handleSubscribe(plan.stripePlan)}
                    disabled={subscribingPlan === plan.stripePlan}
                  >
                    {subscribingPlan === plan.stripePlan ? (
                      <><FiLoader className="spin-icon" /> Processing...</>
                    ) : (
                      <>{plan.cta} <FiArrowRight /></>
                    )}
                  </button>
                ) : (
                  <Link to={plan.ctaLink} className="btn btn-accent btn-lg pricing-btn">
                    {plan.cta} <FiArrowRight />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <motion.div
            className="cta-inner"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <h2>Ready to Improve Your Website?</h2>
            <p>Join thousands of website owners who use AuditWise Pro to stay ahead.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-accent btn-lg">
                Create Free Account <FiArrowRight />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
