import nodemailer from "nodemailer";

import { activationTokenMaxAgeHours } from "@/lib/activation";

type ActivationEmailInput = {
  to: string;
  studentName: string;
  courseLabel: string;
  activationUrl: string;
};

function getSenderAddress() {
  return process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SENDER;
}

function createTransport() {
  const senderAddress = getSenderAddress();
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!senderAddress || !appPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderAddress,
      pass: appPassword,
    },
  });
}

function activationEmailHtml({
  studentName,
  courseLabel,
  activationUrl,
}: Omit<ActivationEmailInput, "to">) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1f2937;background:#f8fafc">
  <div style="background:#065f54;padding:22px;border-radius:8px 8px 0 0">
    <h1 style="color:#ffffff;margin:0;font-size:20px">AttendGuard</h1>
    <p style="color:#ccfbf1;margin:6px 0 0;font-size:13px;text-transform:uppercase">Secure attendance activation</p>
  </div>
  <div style="background:#ffffff;padding:30px;border:1px solid #dbe4ea;border-top:none;border-radius:0 0 8px 8px">
    <h2 style="color:#0f172a;margin-top:0">Activate your student account</h2>
    <p>Dear <strong>${studentName}</strong>,</p>
    <p>You have been enrolled in <strong>${courseLabel}</strong> on AttendGuard.</p>
    <p>Use the secure one-time link below and confirm your student ID to create your password.</p>
    <p style="margin:28px 0">
      <a href="${activationUrl}" style="background:#065f54;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;display:inline-block;font-weight:bold">
        Activate account
      </a>
    </p>
    <p style="font-size:14px;color:#475569">This link expires in ${activationTokenMaxAgeHours} hours and can be used once.</p>
    <p style="font-size:14px;color:#475569">If the button does not work, copy and paste this link into your browser:</p>
    <p style="word-break:break-all;font-size:13px;color:#0f766e">${activationUrl}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">If you did not expect this email, contact your lecturer or administrator.</p>
  </div>
</body>
</html>`;
}

export async function sendStudentActivationEmail({
  to,
  studentName,
  courseLabel,
  activationUrl,
}: ActivationEmailInput) {
  const transporter = createTransport();
  const senderAddress = getSenderAddress();
  const senderName = process.env.EMAIL_SENDER_NAME ?? "AttendGuard";

  if (!transporter || !senderAddress) {
    return { sent: false, reason: "email_not_configured" };
  }

  await transporter.sendMail({
    from: `"${senderName}" <${senderAddress}>`,
    to,
    subject: "Activate your AttendGuard student account",
    text: [
      `Hello ${studentName},`,
      "",
      `You have been enrolled in ${courseLabel} on AttendGuard.`,
      "Open this secure link and confirm your student ID to create your password:",
      activationUrl,
      "",
      `This link expires in ${activationTokenMaxAgeHours} hours and can be used once.`,
      "",
      "If you did not expect this email, contact your lecturer or administrator.",
    ].join("\n"),
    html: activationEmailHtml({ studentName, courseLabel, activationUrl }),
  });

  return { sent: true };
}
