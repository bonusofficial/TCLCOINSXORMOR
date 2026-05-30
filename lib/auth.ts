import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
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
    },
  },
  plugins: [username(), nextCookies()],
});
