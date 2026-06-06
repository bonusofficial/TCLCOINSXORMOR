import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { captcha, username } from "better-auth/plugins";
import bcrypt from "bcryptjs";
import { verifyPassword as verifyScrypt } from "@better-auth/utils/password";
import {
  getAppBaseUrl,
  getResetPasswordExpiresInSeconds,
  sendPasswordResetEmail,
} from "@/lib/server/mail";

const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 15;
const authSecret = process.env.BETTER_AUTH_SECRET?.trim() || undefined;
const turnstileSecretKey =
  process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim() ||
  process.env.TURNSTILE_SECRET_KEY?.trim() ||
  undefined;

export const auth = betterAuth({
  secret: authSecret,
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://147.50.231.57:3000",
    "http://ormorstore.rdcw.xyz",
    "https://ormorstore.rdcw.xyz",
    "http://ormorxtc.com",
    "https://ormorxtc.com",
    "http://www.ormorxtc.com",
    "https://www.ormorxtc.com",
    "http://tclcoinsxormor.com",
    "https://tclcoinsxormor.com",
    "http://www.tclcoinsxormor.com",
    "https://www.tclcoinsxormor.com",
    // ── ซับโดเมนแอดมิน (dashboard) ──
    "https://dashboard.ormorxtc.com",
    "http://dashboard.ormorxtc.com",
    "https://dashboard.tclcoinsxormor.com",
    "http://dashboard.tclcoinsxormor.com",
    "https://dashboard.ormorstore.rdcw.xyz",
    "http://dashboard.ormorstore.rdcw.xyz",
  ],
  // cookie เว็บผู้ใช้ใช้ชื่อ "ormor-user" + host-only (ไม่แชร์ข้ามซับโดเมน) → แยกจาก login แอดมิน
  advanced: {
    cookiePrefix: "ormor-user",
  },
  session: {
    expiresIn: AUTH_SESSION_MAX_AGE_SECONDS,
    updateAge: AUTH_SESSION_MAX_AGE_SECONDS,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: getResetPasswordExpiresInSeconds(),
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInSeconds: getResetPasswordExpiresInSeconds(),
      });
    },
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        const isBcrypt = hash.startsWith("$2y$") || hash.startsWith("$2a$") || hash.startsWith("$2b$");
        if (isBcrypt) {
          const normalizedHash = hash.replace(/^\$2y\$/, "$2a$");
          return await bcrypt.compare(password, normalizedHash);
        }
        return await verifyScrypt(hash, password);
      },
    },
  },
  user: {
    additionalFields: {
      memberNo: {
        type: "number",
        required: false,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "Member",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      shopName: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      lineId: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // กำหนดเลขสมาชิกแบบรันนิ่ง (ห้ามซ้ำ — บังคับด้วย @unique) ตอนสมัครใหม่
        before: async (newUser) => {
          const last = await prisma.user.findFirst({
            where: { memberNo: { not: null } },
            orderBy: { memberNo: "desc" },
            select: { memberNo: true },
          });
          const nextNo = (last?.memberNo ?? 0) + 1;
          return { data: { ...newUser, memberNo: nextNo } };
        },
      },
    },
  },
  plugins: [
    username({
      usernameValidator: (val) => {
        // Allow all legacy usernames (including Thai characters, spaces, hyphens, and vertical bars)
        return val.length >= 3;
      },
    }),
    ...(turnstileSecretKey
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: turnstileSecretKey,
            endpoints: [
              "/sign-in/email",
              "/sign-in/username",
              "/sign-up/email",
            ],
          }),
        ]
      : []),
    nextCookies(),
  ],
});
