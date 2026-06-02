import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import bcrypt from "bcryptjs";
import { verifyPassword as verifyScrypt } from "@better-auth/utils/password";
import {
  getAppBaseUrl,
  getResetPasswordExpiresInSeconds,
  sendPasswordResetEmail,
} from "@/lib/server/mail";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
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
      credit: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      total_credit: {
        type: "number",
        required: false,
        defaultValue: 0,
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
  plugins: [
    username({
      usernameValidator: (val) => {
        // Allow all legacy usernames (including Thai characters, spaces, hyphens, and vertical bars)
        return val.length >= 3;
      },
    }),
    nextCookies(),
  ],
});
