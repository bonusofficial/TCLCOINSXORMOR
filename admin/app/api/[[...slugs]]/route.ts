// app/api/[[...slugs]]/route.ts
import { Elysia, t } from "elysia";
import { loggerPlugin } from "@/lib/server/middleware";
import { withElysiaAudit } from "@/lib/server/audit-route";

const app = new Elysia({ prefix: "/api" })
  .use(loggerPlugin)
  .get("/", () => "hello Next.js")
  .post("/user", ({ body }) => body, {
    body: t.Object({
      name: t.String(),
      age: t.Number(),
    }),
  });

// Export type สำหรับ Eden
export type App = typeof app;

// Mount handler ให้ Next.js
export const GET = withElysiaAudit(app.handle);
export const POST = withElysiaAudit(app.handle);
