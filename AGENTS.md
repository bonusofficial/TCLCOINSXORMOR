# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 app using the `app/` router. Page routes and API handlers live in `app/`, with dashboard routes under `app/dashboard/` and API versions under `app/api/v0/` and `app/api/v1/`. Reusable UI lives in `components/`, with primitives in `components/ui/` and dashboard components in `components/dashboard/`. Shared utilities live in `lib/`; keep server-only helpers in `lib/server/`. Static assets are in `public/`. Prisma schema is in `prisma/schema.prisma`, and generated Prisma files are in `generated/prisma/`; do not edit generated files by hand.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build and run Next build-time checks.
- `npm run start`: serve the production build.
- `npm run lint`: run ESLint with Next core web vitals and TypeScript rules.
- `npm run dbgenerate`: regenerate Prisma client files after schema changes.
- `npm run dbpush`: push Prisma schema changes to the configured database.

Use npm by default because `package-lock.json` is present. Avoid dependency changes that update unrelated lockfiles.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing style: two-space indentation, double quotes, semicolons, and `@/` path aliases. Name component files in PascalCase, such as `ProductFormModal.tsx`; route folders stay lowercase and URL-oriented. Keep API logic close to its route and move shared validation or persistence into `lib/server/`.

## Testing Guidelines

No test framework is currently configured. For now, validate changes with `npm run lint` and `npm run build`. When adding tests, colocate them near the feature or use a dedicated test directory, with names such as `booking-status.test.ts`.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit prefixes, mainly `feat:` and `fix:`. Keep subjects concise and imperative, for example `fix: format parsed booking dates`. Pull requests should describe the change, list verification commands, link issues, and include screenshots for visible UI changes.

## Security & Configuration Tips

Keep secrets in `.env` and never commit credentials. Database changes should include the Prisma schema update and regenerated client output when required.

## Agent-Specific Instructions

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know. Next.js 16.2.6 may have breaking API, convention, and file-structure changes. Before changing Next.js APIs, config, routing, or server/client behavior, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->
