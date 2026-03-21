import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMail, FiMapPin, FiSend } from 'react-icons/fi';
import { submitContact } from '../services/api';
import './Contact.css';

function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSending(true);
    try {
      await submitContact(form);
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-page">
      <h1>Contact Us</h1>
      <p>Have a question or need support? We'd love to hear from you.</p>

      <div className="contact-layout">
        <div className="contact-form-card">
          <h2>Send a Message</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="What's this about?"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Message *</label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Tell us how we can help..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                style={{ resize: 'vertical' }}
              />
            </div>
            <button type="submit" className="btn btn-accent" disabled={sending}>
              {sending ? 'Sending...' : <><FiSend /> Send Message</>}
            </button>
          </form>
        </div>

        <div className="contact-sidebar">
          <div className="contact-info-card">
            <h3>Get in Touch</h3>
            <div className="contact-info-item">
              <div className="contact-info-icon">
                <FiMail size={16} />
              </div>
              <div className="contact-info-text">
                <label>Email</label>
                <a href="mailto:support@auditwisepro.com">support@auditwisepro.com</a>
              </div>
            </div>
            <div className="contact-info-item">
              <div className="contact-info-icon">
                <FiMapPin size={16} />
              </div>
              <div className="contact-info-text">
                <label>Address</label>
                <span>123 Audit Lane, Suite 100<br />San Francisco, CA 94105</span>
              </div>
            </div>
          </div>

          <div className="contact-info-card">
            <h3>Business Hours</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.8 }}>
              Monday - Friday: 9:00 AM - 6:00 PM (PST)<br />
              Saturday - Sunday: Closed
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 12 }}>
              We typically respond within 24 hours on business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
