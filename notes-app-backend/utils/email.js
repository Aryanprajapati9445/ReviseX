import nodemailer from 'nodemailer';

/**
 * Creates a nodemailer transport if SMTP is configured.
 * Returns null in dev mode (no SMTP — verification link is logged instead).
 */
function createTransport() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT) || 587,
        secure: SMTP_SECURE === 'true', // true = port 465 TLS
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
}

/**
 * Send an email-verification link to the new student.
 *
 * In dev (no SMTP configured): logs the link to the console and resolves.
 * In production: sends a real email via nodemailer.
 *
 * @param {string} email   - Recipient email address
 * @param {string} token   - Verification token stored on the Student document
 */
export async function sendVerificationEmail(email, token) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const transporter = createTransport();

    if (!transporter) {
        // ─── DEV MODE: no SMTP configured ───────────────────────────
        console.log('\n────────────────────────────────────────────────');
        console.log(`📧 [DEV] Email verification link for: ${email}`);
        console.log(`   ${verifyUrl}`);
        console.log('────────────────────────────────────────────────\n');
        return;
    }

    // ── PRODUCTION MODE ─────────────────────────────────────────────
    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"ReviseX" <noreply@revisex.app>',
        to: email,
        subject: 'Verify your ReviseX account',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 40px;">
              <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;">
                <h2 style="color:#4f46e5">Welcome to ReviseX!</h2>
                <p style="color:#374151">Click the button below to verify your email address and activate your account.</p>
                <a href="${verifyUrl}"
                   style="display:inline-block;margin-top:16px;padding:12px 28px;
                          background:#4f46e5;color:#fff;border-radius:8px;
                          text-decoration:none;font-weight:600">
                  Verify Email
                </a>
                <p style="margin-top:24px;font-size:12px;color:#9ca3af">
                  This link expires in 24 hours. If you didn't create an account, ignore this email.
                </p>
              </div>
            </body>
            </html>
        `,
    });
}

/**
 * Send a password-reset email.
 * @param {string} email
 * @param {string} token
 */
export async function sendPasswordResetEmail(email, token) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const transporter = createTransport();

    if (!transporter) {
        console.log('\n────────────────────────────────────────────────');
        console.log(`📧 [DEV] Password reset link for: ${email}`);
        console.log(`   ${resetUrl}`);
        console.log('────────────────────────────────────────────────\n');
        return;
    }

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"ReviseX" <noreply@revisex.app>',
        to: email,
        subject: 'Reset your ReviseX password',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 40px;">
              <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;">
                <h2 style="color:#4f46e5">Reset Your Password</h2>
                <p style="color:#374151">Click the button below to reset your ReviseX password.</p>
                <a href="${resetUrl}"
                   style="display:inline-block;margin-top:16px;padding:12px 28px;
                          background:#4f46e5;color:#fff;border-radius:8px;
                          text-decoration:none;font-weight:600">
                  Reset Password
                </a>
                <p style="margin-top:24px;font-size:12px;color:#9ca3af">
                  This link expires in 1 hour. If you didn't request a reset, ignore this email.
                </p>
              </div>
            </body>
            </html>
        `,
    });
}

/**
 * Send an OTP code for email verification before registration.
 * @param {string} email
 * @param {string} otp
 */
export async function sendOtpEmail(email, otp) {
    const transporter = createTransport();

    if (!transporter) {
        console.log('\n────────────────────────────────────────────────');
        console.log(`📧 [DEV] Verification OTP for: ${email}`);
        console.log(`   OTP: ${otp}`);
        console.log('────────────────────────────────────────────────\n');
        return;
    }

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"ReviseX" <noreply@revisex.app>',
        to: email,
        subject: 'Your ReviseX Verification Code',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 40px;">
              <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;text-align:center;">
                <h2 style="color:#4f46e5;margin-bottom:16px;">Email Verification</h2>
                <p style="color:#374151;font-size:16px;">Use the following 6-digit code to complete your registration:</p>
                <div style="margin:24px 0;padding:16px;background:#f3f4f6;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:4px;color:#111827;">
                  ${otp}
                </div>
                <p style="margin-top:24px;font-size:13px;color:#9ca3af">
                  This code expires in 10 minutes. Do not share it with anyone.
                </p>
              </div>
            </body>
            </html>
        `,
    });
}
