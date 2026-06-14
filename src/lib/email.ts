import nodemailer from "nodemailer";

import { activationTokenMaxAgeHours } from "@/lib/activation";

type ActivationEmailInput = {
  to: string;
  studentName: string;
  courseLabel: string;
  activationUrl: string;
};

type AbsenceWarningEmailInput = {
  to: string;
  studentName: string;
  courseLabel: string;
  streakCount: 2 | 3;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
  const safeStudentName = escapeHtml(studentName);
  const safeCourseLabel = escapeHtml(courseLabel);
  const safeActivationUrl = escapeHtml(activationUrl);

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1f2937;background:#f8fafc">
  <div style="background:#065f54;padding:22px;border-radius:8px 8px 0 0">
    <h1 style="color:#ffffff;margin:0;font-size:20px">PU Attendance</h1>
    <p style="color:#ccfbf1;margin:6px 0 0;font-size:13px;text-transform:uppercase">Secure attendance activation</p>
  </div>
  <div style="background:#ffffff;padding:30px;border:1px solid #dbe4ea;border-top:none;border-radius:0 0 8px 8px">
    <h2 style="color:#0f172a;margin-top:0">Activate your student account</h2>
    <p>Dear <strong>${safeStudentName}</strong>,</p>
    <p>You have been enrolled in <strong>${safeCourseLabel}</strong> on PU Attendance.</p>
    <p>Use the secure one-time link below and confirm your student ID to create your password.</p>
    <p style="margin:28px 0">
      <a href="${safeActivationUrl}" style="background:#065f54;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;display:inline-block;font-weight:bold">
        Activate account
      </a>
    </p>
    <p style="font-size:14px;color:#475569">This link expires in ${activationTokenMaxAgeHours} hours and can be used once.</p>
    <p style="font-size:14px;color:#475569">If the button does not work, copy and paste this link into your browser:</p>
    <p style="word-break:break-all;font-size:13px;color:#0f766e">${safeActivationUrl}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">If you did not expect this email, contact your lecturer or administrator.</p>
  </div>
</body>
</html>`;
}

function absenceWarningEmailHtml({
  studentName,
  courseLabel,
  streakCount,
}: AbsenceWarningEmailInput) {
  const safeStudentName = escapeHtml(studentName);
  const safeCourseLabel = escapeHtml(courseLabel);
  const isStern = streakCount >= 3;
  const title = isStern
    ? "Immediate attendance action required"
    : "Attendance warning";
  const bannerColor = isStern ? "#991b1b" : "#92400e";
  const bannerText = isStern ? "#fee2e2" : "#fef3c7";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1f2937;background:#f8fafc">
  <div style="background:${bannerColor};padding:22px;border-radius:8px 8px 0 0">
    <h1 style="color:#ffffff;margin:0;font-size:20px">PU Attendance</h1>
    <p style="color:${bannerText};margin:6px 0 0;font-size:13px;text-transform:uppercase">${title}</p>
  </div>
  <div style="background:#ffffff;padding:30px;border:1px solid #dbe4ea;border-top:none;border-radius:0 0 8px 8px">
    <h2 style="color:#0f172a;margin-top:0">${title}</h2>
    <p>Dear <strong>${safeStudentName}</strong>,</p>
    <p>Our records show that you have missed <strong>${streakCount} consecutive attendance sessions</strong> for <strong>${safeCourseLabel}</strong>.</p>
    <p>${isStern
      ? "This is a serious attendance concern. Please contact your lecturer immediately and make sure you attend the next class session."
      : "Please treat this as an early warning and make sure you attend the next class session."}</p>
    <p>Consistent attendance may be required for course participation, lecturer review, and academic records.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">This message was generated automatically after the lecturer closed an attendance session.</p>
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
  const senderName = process.env.EMAIL_SENDER_NAME || "PU Attendance";

  if (!transporter || !senderAddress) {
    return { sent: false, reason: "email_not_configured" };
  }

  await transporter.sendMail({
    from: `"${senderName}" <${senderAddress}>`,
    to,
    subject: "Activate your Pentecost University Attendance student account",
    text: [
      `Hello ${studentName},`,
      "",
      `You have been enrolled in ${courseLabel} on PU Attendance.`,
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

export async function sendAbsenceWarningEmail({
  to,
  studentName,
  courseLabel,
  streakCount,
}: AbsenceWarningEmailInput) {
  const transporter = createTransport();
  const senderAddress = getSenderAddress();
  const senderName = process.env.EMAIL_SENDER_NAME || "PU Attendance";
  const isStern = streakCount >= 3;

  if (!transporter || !senderAddress) {
    return { sent: false, reason: "email_not_configured" };
  }

  await transporter.sendMail({
    from: `"${senderName}" <${senderAddress}>`,
    to,
    subject: isStern
      ? "Immediate attendance action required"
      : "Attendance warning",
    text: [
      `Hello ${studentName},`,
      "",
      `Our records show that you have missed ${streakCount} consecutive attendance sessions for ${courseLabel}.`,
      isStern
        ? "This is a serious attendance concern. Contact your lecturer immediately and attend the next class session."
        : "Please treat this as an early warning and attend the next class session.",
      "",
      "This message was generated automatically after the lecturer closed an attendance session.",
    ].join("\n"),
    html: absenceWarningEmailHtml({ to, studentName, courseLabel, streakCount }),
  });

  return { sent: true };
}
