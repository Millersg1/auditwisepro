import { Link } from 'react-router-dom';

function Terms() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: 32, fontSize: '0.9rem' }}>
        Last updated: March 21, 2026
      </p>

      <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing or using AuditWise Pro ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all visitors, users, and others who access or use the Service.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          2. Service Description
        </h2>
        <p>
          AuditWise Pro is a software-as-a-service (SaaS) platform that provides audit management, compliance tracking, risk assessment, and related professional services tools. The Service may include features such as website auditing, report generation, document management, blog management, client collaboration, and data analytics. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          3. User Accounts
        </h2>
        <p>
          You must register for an account to access certain features of the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete. You must notify us immediately of any unauthorized use of your account or any other breach of security.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          4. Subscriptions and Billing
        </h2>
        <p>
          Some features of the Service require a paid subscription. By selecting a paid plan, you agree to pay the applicable fees as described at the time of purchase. Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on the plan selected). You authorize us to charge your designated payment method for all applicable fees. Subscriptions automatically renew unless cancelled before the renewal date. Refunds are handled in accordance with our refund policy.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          5. Data Privacy
        </h2>
        <p>
          Your privacy is important to us. Our collection and use of personal information in connection with the Service is described in our <Link to="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>. By using the Service, you consent to the collection and use of information as described therein. You retain ownership of any data you submit to the Service. We will not sell, share, or distribute your data to third parties except as described in our Privacy Policy or as required by law.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          6. Intellectual Property
        </h2>
        <p>
          The Service and its original content, features, and functionality are and will remain the exclusive property of AuditWise Pro and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without prior written consent. You may not copy, modify, distribute, sell, or lease any part of the Service or included software, nor may you reverse engineer or attempt to extract the source code of that software.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          7. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by applicable law, in no event shall AuditWise Pro, its affiliates, directors, employees, agents, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (a) your access to or use of or inability to access or use the Service; (b) any conduct or content of any third party on the Service; (c) any content obtained from the Service; and (d) unauthorized access, use, or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence), or any other legal theory.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          8. Termination
        </h2>
        <p>
          We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so by contacting us or using the account settings. All provisions of the Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          9. Governing Law
        </h2>
        <p>
          These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding the Service and supersede any prior agreements.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          10. Contact Us
        </h2>
        <p>
          If you have any questions about these Terms of Service, please contact us at{' '}
          <a href="mailto:support@auditwisepro.com" style={{ color: 'var(--accent)' }}>
            support@auditwisepro.com
          </a>.
        </p>
      </div>
    </div>
  );
}

export default Terms;
