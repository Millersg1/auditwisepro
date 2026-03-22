function CookiePolicy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 8 }}>Cookie Policy</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: 32, fontSize: '0.9rem' }}>
        Last updated: March 21, 2026
      </p>

      <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          1. What Are Cookies
        </h2>
        <p>
          Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently, provide information to the site owners, and improve the user experience. Similar technologies such as local storage and session storage may also be used for the same purposes and are covered by this policy.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          2. Cookies We Use
        </h2>
        <p><strong>Essential Cookies</strong></p>
        <p>
          These cookies are strictly necessary for the Service to function. They include authentication tokens (awp_token) and session management cookies. Without these cookies, you would not be able to log in or use core features of AuditWise Pro. Essential cookies cannot be disabled.
        </p>
        <p style={{ marginTop: 16 }}><strong>Functional Cookies</strong></p>
        <p>
          Functional cookies remember your preferences such as theme selection and language settings. These cookies improve your experience by personalizing the Service to your choices.
        </p>
        <p style={{ marginTop: 16 }}><strong>Analytics Cookies</strong></p>
        <p>
          We may use analytics to understand usage patterns and improve the Service. Currently we use basic server-side logging only. If we introduce third-party analytics tools in the future, we will update this policy accordingly.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          3. Third-Party Cookies
        </h2>
        <p>
          Stripe, our payment processing provider, may set cookies during checkout to process payments securely and prevent fraud. Google Fonts may load external resources when rendering the Service. These third parties have their own cookie and privacy policies, which we encourage you to review.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          4. Managing Cookies
        </h2>
        <p>
          Most web browsers allow you to control cookies through their settings. You can typically find these options in the "Privacy" or "Security" section of your browser preferences. You can choose to block or delete cookies, but please note that disabling essential cookies will prevent you from logging in and using core features of the Service.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          5. Cookie Duration
        </h2>
        <p>
          Session cookies are temporary and expire when you close your browser. Persistent cookies remain on your device for a set period. Our authentication token (awp_token) expires after 24 hours. Refresh tokens expire after 7 days. You can clear these cookies at any time through your browser settings.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          6. Updates to This Policy
        </h2>
        <p>
          We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          7. Contact Us
        </h2>
        <p>
          If you have any questions about our use of cookies, please contact us at{' '}
          <a href="mailto:support@auditwisepro.com" style={{ color: 'var(--accent)' }}>
            support@auditwisepro.com
          </a>.
        </p>
      </div>
    </div>
  );
}

export default CookiePolicy;
