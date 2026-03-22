function RefundPolicy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 8 }}>Refund Policy</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: 32, fontSize: '0.9rem' }}>
        Last updated: March 21, 2026
      </p>

      <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          1. 30-Day Money-Back Guarantee
        </h2>
        <p>
          Your first paid month is fully refundable within 30 days of your initial subscription purchase. No questions asked. If AuditWise Pro isn't the right fit for you, simply request a refund within 30 days and we'll return your payment in full.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          2. After the First Month
        </h2>
        <p>
          Once your subscription renews into the second billing period, no refunds will be issued for that billing period or any subsequent periods. We encourage you to make use of the full 30-day guarantee period to evaluate the Service before your subscription renews.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          3. How to Request a Refund
        </h2>
        <p>
          To request a refund, contact us at{' '}
          <a href="mailto:support@auditwisepro.com" style={{ color: 'var(--accent)' }}>
            support@auditwisepro.com
          </a>{' '}
          within 30 days of your initial purchase. Please include the email address associated with your account. Providing a reason for the refund is optional but appreciated, as it helps us improve the Service.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          4. Processing
        </h2>
        <p>
          Approved refunds are processed within 5-7 business days and returned to your original payment method via Stripe. Depending on your bank or card issuer, it may take an additional few business days for the refund to appear on your statement.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          5. Cancellation vs. Refund
        </h2>
        <p>
          Cancelling your subscription stops future charges but does not automatically trigger a refund. When you cancel, you retain access to the Service until the end of your current billing period. If you are within the 30-day guarantee window and wish to receive a refund, you must explicitly request one by contacting support.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          6. Free Plan
        </h2>
        <p>
          The free plan has no charges and therefore no refunds apply. You may use the free plan indefinitely without any payment obligation.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          7. Downgrades
        </h2>
        <p>
          If you downgrade from a higher plan to a lower plan, the change takes effect at the start of your next billing cycle. No partial refunds are issued for the remaining time on the higher plan. You will continue to have access to the higher plan's features until the end of your current billing period.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginTop: 32, marginBottom: 12 }}>
          8. Contact Us
        </h2>
        <p>
          If you have any questions about our refund policy, please contact us at{' '}
          <a href="mailto:support@auditwisepro.com" style={{ color: 'var(--accent)' }}>
            support@auditwisepro.com
          </a>.
        </p>
      </div>
    </div>
  );
}

export default RefundPolicy;
