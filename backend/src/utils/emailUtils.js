import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'server.allelitehosting.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'noreply@auditwisepro.com',
    pass: process.env.SMTP_PASS || '',
  },
});

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">AuditWise Pro</h1>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Website Audit Intelligence</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:13px;">&copy; ${new Date().getFullYear()} AuditWise Pro. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buttonStyle() {
  return 'display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;';
}

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">Verify Your Email</h2>
    <p style="color:#475569;font-size:16px;line-height:1.6;">Welcome to AuditWise Pro! Click the button below to verify your email address and activate your account.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="${buttonStyle()}">Verify Email Address</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'AuditWise Pro <noreply@auditwisepro.com>',
    to: email,
    subject: 'Verify your AuditWise Pro account',
    html,
  });
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">Reset Your Password</h2>
    <p style="color:#475569;font-size:16px;line-height:1.6;">We received a request to reset your password. Click below to create a new one. This link expires in 1 hour.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="${buttonStyle()}">Reset Password</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;">If you didn't request a password reset, please ignore this email.</p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'AuditWise Pro <noreply@auditwisepro.com>',
    to: email,
    subject: 'Reset your AuditWise Pro password',
    html,
  });
}

export async function sendScanCompleteEmail(email, scanUrl, score) {
  const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#eab308' : '#dc2626';
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">Your Scan is Complete!</h2>
    <p style="color:#475569;font-size:16px;line-height:1.6;">Your website audit for <strong>${scanUrl}</strong> has finished.</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;width:100px;height:100px;border-radius:50%;border:6px solid ${scoreColor};line-height:100px;font-size:36px;font-weight:700;color:${scoreColor};">${score}</div>
      <p style="color:#475569;font-size:14px;margin-top:8px;">Overall Score</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.FRONTEND_URL}/scans" style="${buttonStyle()}">View Full Report</a>
    </div>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'AuditWise Pro <noreply@auditwisepro.com>',
    to: email,
    subject: `Scan Complete: ${scanUrl} scored ${score}/100`,
    html,
  });
}

export async function sendContactNotification(name, email, message) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">New Contact Message</h2>
    <p style="color:#475569;font-size:16px;line-height:1.6;"><strong>From:</strong> ${name} (${email})</p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0;">${message}</p>
    </div>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'AuditWise Pro <noreply@auditwisepro.com>',
    to: process.env.ADMIN_NOTIFICATION_EMAIL || 'support@auditwisepro.com',
    subject: `Contact Form: ${name}`,
    html,
  });
}
