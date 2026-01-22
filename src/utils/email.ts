// MODULE: Outbound Communication Service
// Provides a unified interface for sending transactional emails via SMTP.

// HEADER: Imports & Setup
import nodemailer from "nodemailer";

// HEADER: Type Definitions
// NOTE: Using an interface ensures that all email requests follow a strict data contract.
interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string; 
}

/**
 * HEADER: Email Dispatcher
 * @param options - Object containing recipient, subject, and body content.
 * SECURITY: TLS configuration is enforced to prevent man-in-the-middle (MITM) attacks.
 */
export const sendEmail = async (options: EmailOptions) => {
  // SECTION: SMTP Configuration
  // PERF: Transporter is initialized per request (or can be moved to a singleton for high-volume).
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // NOTE: Set to true for 465, false for 587/25 (with STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      // SECURITY: Essential for production to ensure we only connect to verified mail servers.
      rejectUnauthorized: true
    }
  });

  // SECTION: Content Normalization
  // API: Fallback logic ensures that if no HTML is provided, the plain text is wrapped in a clean div.
  const mailOptions = {
    from: '"High Minds Digital" <info@highmindsdigital.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<div style="font-family: sans-serif;">${options.message.replace(/\n/g, '<br>')}</div>`
  };

  // EXECUTION: Asynchronous dispatch
  // NOTE: In a high-traffic system, this should ideally be pushed to a Redis Queue (BullMQ).
  await transporter.sendMail(mailOptions);
};