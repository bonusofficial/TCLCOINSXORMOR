// app/api/[[...slugs]]/route.ts
import { Elysia, t } from 'elysia'

const app = new Elysia({ prefix: '/api' })
  .get('/', () => 'hello Next.js')
  .post('/user', ({ body }) => body, {
    body: t.Object({
      name: t.String(),
      age: t.Number()
    })
  })

// Export type สำหรับ Eden
export type App = typeof app

// Mount handler ให้ Next.js
export const GET = app.handle
export const POST = app.handle