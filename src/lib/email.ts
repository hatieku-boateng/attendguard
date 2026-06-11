import { Resend } from "resend";

import { activationTokenMaxAgeHours } from "@/lib/activation";

type ActivationEmailInput = {
  to: string;
  studentName: string;
  courseLabel: string;
  activationUrl: string;
};

export async function sendStudentActivationEmail({
  to,
  studentName,
  courseLabel,
  activationUrl,
}: ActivationEmailInput) {
  const apiKey = process.env.EMAIL_API_KEY;
  const senderAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SENDER;
  const senderName = process.env.EMAIL_SENDER_NAME;
  const from = senderName && senderAddress
    ? `${senderName} <${senderAddress}>`
    : senderAddress;

  if (!apiKey || !from) {
    return { sent: false, reason: "email_not_configured" };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: "Activate your AttendGuard student account",
    text: [
      `Hello ${studentName},`,
      "",
      `You have been enrolled in ${courseLabel} on AttendGuard.`,
      `Open this secure link and confirm your student ID to create your password:`,
      activationUrl,
      "",
      `This link expires in ${activationTokenMaxAgeHours} hours and can be used once.`,
      "",
      "If you did not expect this email, contact your lecturer or administrator.",
    ].join("\n"),
  });

  return { sent: true };
}
