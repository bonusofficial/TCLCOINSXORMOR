import nodemailer, { type Transporter } from "nodemailer";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  fromName: string;
};

type PasswordResetMail = {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresInSeconds: number;
};

let transporter: Transporter | null = null;

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readMailConfig(): MailConfig {
  const user = firstEnv("SMTP_USER", "GMAIL_USER", "GOOGLE_MAIL_USER", "IMAP_USER");
  const password = firstEnv(
    "SMTP_PASSWORD",
    "SMTP_PASS",
    "GMAIL_APP_PASSWORD",
    "GMAIL_PASSWORD",
    "GOOGLE_MAIL_PASSWORD",
    "IMAP_PASSWORD"
  );

  if (!user || !password) {
    throw new Error(
      "Missing email credentials. Set SMTP_USER/GMAIL_USER and SMTP_PASSWORD/GMAIL_APP_PASSWORD in .env."
    );
  }

  const port = Number(firstEnv("SMTP_PORT", "GMAIL_SMTP_PORT") || 465);

  return {
    host: firstEnv("SMTP_HOST", "GMAIL_SMTP_HOST") || "smtp.gmail.com",
    port,
    secure: parseBoolean(process.env.SMTP_SECURE, port === 465),
    user,
    password,
    from: firstEnv("SMTP_FROM", "EMAIL_FROM", "GMAIL_FROM") || user,
    fromName: firstEnv("SMTP_FROM_NAME", "EMAIL_FROM_NAME") || "TCLCOINSXORMOR",
  };
}

function getTransporter() {
  if (transporter) return transporter;

  const config = readMailConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  return transporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getAppBaseUrl() {
  return (
    firstEnv("BETTER_AUTH_URL", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_APP_URL") ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function getResetPasswordExpiresInSeconds() {
  const raw = Number(firstEnv("RESET_PASSWORD_TOKEN_EXPIRES_IN"));
  return Number.isFinite(raw) && raw > 0 ? raw : 60 * 60;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresInSeconds,
}: PasswordResetMail) {
  const config = readMailConfig();
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const displayName = name?.trim() || "ลูกค้า";
  const safeResetUrl = escapeHtml(resetUrl);
  const safeDisplayName = escapeHtml(displayName);

  await getTransporter().sendMail({
    from: {
      name: config.fromName,
      address: config.from,
    },
    to,
    subject: "รีเซ็ตรหัสผ่าน TCLCOINSXORMOR",
    text: [
      `สวัสดี ${displayName}`,
      "",
      "เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ",
      `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่: ${resetUrl}`,
      "",
      `ลิงก์นี้หมดอายุใน ${minutes} นาที`,
      "หากคุณไม่ได้ร้องขอ สามารถละเว้นอีเมลนี้ได้",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.65; color: #122016; max-width: 560px;">
        <h2 style="margin: 0 0 12px; color: #12651d;">รีเซ็ตรหัสผ่าน</h2>
        <p>สวัสดี ${safeDisplayName}</p>
        <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี TCLCOINSXORMOR ของคุณ</p>
        <p style="margin: 24px 0;">
          <a href="${safeResetUrl}" style="display: inline-block; background: #16a329; color: #ffffff; padding: 12px 18px; border-radius: 12px; text-decoration: none; font-weight: 700;">
            ตั้งรหัสผ่านใหม่
          </a>
        </p>
        <p>ลิงก์นี้หมดอายุใน ${minutes} นาที</p>
        <p style="color: #66756a;">หากคุณไม่ได้ร้องขอ สามารถละเว้นอีเมลนี้ได้</p>
      </div>
    `,
  });
}
