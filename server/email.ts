import nodemailer from "nodemailer";

/**
 * Checks whether SMTP credentials are fully provided in the environment.
 */
export function isEmailConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  return Boolean(host && user && pass && Number.isInteger(port) && port > 0 && port <= 65535);
}

/**
 * Creates a Nodemailer transporter using environment variables.
 * Supports Gmail, Mailtrap, SendGrid, AWS SES, or any standard SMTP server.
 */
export function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass || !Number.isInteger(port) || port <= 0 || port > 65535) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user, pass },
  });
}

function getSafeSmtpError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "SMTP operation failed";
  }

  const smtpError = error as { code?: unknown; responseCode?: unknown };
  const code = typeof smtpError.code === "string" ? smtpError.code : undefined;
  const responseCode =
    typeof smtpError.responseCode === "number" ? smtpError.responseCode : undefined;

  return [
    "SMTP operation failed",
    code ? `(code ${code})` : "",
    responseCode ? `(response ${responseCode})` : "",
  ].filter(Boolean).join(" ");
}

/**
 * Verifies the SMTP connection and authentication credentials.
 */
export async function verifySmtpConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        connected: false,
        error: "SMTP configuration is missing or invalid.",
      };
    }

    await transporter.verify();
    return { connected: true };
  } catch (err: unknown) {
    const safeError = getSafeSmtpError(err);
    console.error("[BloodMitra Email] SMTP verification failed:", safeError);
    return { connected: false, error: safeError };
  }
}

/**
 * Sends a BloodMitra-branded password reset email.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string; notConfigured?: boolean }> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn("[BloodMitra Email] Password reset email was not sent: SMTP configuration is missing or invalid.");
      return {
        success: false,
        notConfigured: true,
        error: "SMTP email delivery is not configured on this server.",
      };
    }

    const from = process.env.SMTP_FROM || `BloodMitra <${process.env.SMTP_USER}>`;
    const safeResetUrl = resetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your BloodMitra Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #f3f4f6;text-align:center;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <div style="width:36px;height:36px;background-color:#dc2626;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-size:20px;font-weight:bold;">
                      &#x1FA78;
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:24px;font-weight:800;color:#dc2626;letter-spacing:-0.5px;">BloodMitra</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;text-align:center;">
                Reset Your Password
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#4b5563;">
                Hello,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4b5563;">
                We received a request to reset the password for your <strong>BloodMitra</strong> account. Click the button below to choose a new password:
              </p>

              <!-- Reset Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeResetUrl}" target="_blank" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;box-shadow:0 2px 4px rgba(220,38,38,0.2);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <div style="background-color:#fef2f2;border-left:4px solid:#dc2626;border-radius:6px;padding:12px 16px;margin:24px 0;">
                <p style="margin:0;font-size:13px;line-height:20px;color:#991b1b;">
                  <strong>Important:</strong> This link is valid for <strong>one hour</strong> and can be used once. After one hour, you will need to request a new link.
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin:24px 0 8px;font-size:13px;color:#6b7280;line-height:20px;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#dc2626;word-break:break-all;line-height:18px;">
                <a href="${safeResetUrl}" style="color:#dc2626;text-decoration:underline;">${safeResetUrl}</a>
              </p>

              <!-- Security Warning -->
              <div style="border-top:1px solid #f3f4f6;padding-top:20px;margin-top:24px;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">
                  &#x1F6E1; <strong>Security Warning:</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:18px;">
                BloodMitra – Smart Blood Donation & Emergency Matching Platform<br>
                Connecting donors, hospitals, and patients in real-time.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
BloodMitra – Reset Your Password

We received a request to reset the password for your BloodMitra account.

Visit the link below to choose a new password:
${resetUrl}

This link is valid for ONE HOUR and can only be used once.

Security Notice: If you did not request a password reset, you can safely ignore this email. Your password will not change.

--
BloodMitra – Smart Blood Donation & Emergency Matching Platform
    `.trim();

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: "BloodMitra – Password Reset Request",
      text,
      html,
    });

    console.info(`[BloodMitra Email] Password reset email accepted by SMTP (messageId: ${info.messageId}).`);
    return { success: true };
  } catch (err: unknown) {
    const safeError = getSafeSmtpError(err);
    console.error("[BloodMitra Email] SMTP delivery failed:", safeError);
    return { success: false, error: safeError };
  }
}
