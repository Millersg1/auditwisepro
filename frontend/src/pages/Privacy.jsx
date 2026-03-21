import { Link } from 'react-router-dom';

function Privacy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: 32, fontSize: '0.9rem' }}>
        Last updated: March 21, 2026
      </p>

      <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          1. Information We Collect
        </h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, use the Service, make a purchase, or contact us. This may include your name, email address, phone number, billing information, company name, job title, and any other information you choose to provide. We also collect information automatically when you use the Service, including your IP address, browser type, operating system, referring URLs, pages viewed, and the dates and times of your visits.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          2. How We Use Your Information
        </h2>
        <p>
          We use the information we collect to provide, maintain, and improve the Service; process transactions and send related information; send you technical notices, updates, security alerts, and administrative messages; respond to your comments, questions, and requests; communicate with you about products, services, offers, and events; monitor and analyze trends, usage, and activities in connection with the Service; detect, investigate, and prevent fraudulent transactions and other illegal activities; and personalize and improve the Service.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          3. Data Storage and Security
        </h2>
        <p>
          We use industry-standard security measures to protect your personal information. Your data is stored on secure servers with encryption at rest and in transit. We implement access controls, regular security audits, and monitoring to safeguard your information. However, no method of transmission over the Internet or method of electronic storage is completely secure, and we cannot guarantee absolute security. We retain your personal information for as long as your account is active or as needed to provide you with the Service, comply with legal obligations, resolve disputes, and enforce our agreements.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          4. Third-Party Services
        </h2>
        <p>
          We may share your information with third-party service providers who perform services on our behalf, such as payment processing, data analytics, email delivery, hosting, customer service, and marketing. These third parties are obligated to maintain the confidentiality of your information and are restricted from using it for any purpose other than providing services to us. We may also share information if required by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of AuditWise Pro, our users, or the public.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          5. Cookies and Tracking Technologies
        </h2>
        <p>
          We use cookies and similar tracking technologies to collect and track information and to improve and analyze the Service. Cookies are small data files stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, some portions of the Service may not function properly. We use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device until deleted) to provide you with a more personalized experience.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          6. Your Rights
        </h2>
        <p>
          Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete your personal data; the right to data portability; the right to restrict or object to processing; and the right to withdraw consent at any time. If you are a resident of the European Economic Area (EEA), you have additional rights under the General Data Protection Regulation (GDPR). To exercise any of these rights, please contact us using the information provided below. We will respond to your request within a reasonable timeframe and in accordance with applicable law.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          7. Children's Privacy
        </h2>
        <p>
          The Service is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that a child under 16 has provided us with personal information, we will take steps to delete such information.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          8. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          9. Contact Us
        </h2>
        <p>
          If you have any questions about this Privacy Policy or our data practices, please contact us at:
        </p>
        <p style={{ marginTop: 8 }}>
          Email:{' '}
          <a href="mailto:privacy@auditwisepro.com" style={{ color: 'var(--accent)' }}>
            privacy@auditwisepro.com
          </a>
          <br />
          Or visit our <Link to="/contact" style={{ color: 'var(--accent)' }}>Contact Page</Link>.
        </p>
      </div>
    </div>
  );
}

export default Privacy;
