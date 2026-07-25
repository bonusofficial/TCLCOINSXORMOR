# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 application using the `app/` router. Pages and route handlers live in `app/`; dashboard pages are under `app/dashboard/`, while versioned APIs are organized in `app/api/v0/` and `app/api/v1/`. Reusable React components belong in `components/`, with UI primitives in `components/ui/` and dashboard-specific components in `components/dashboard/`. Shared utilities live in `lib/`; keep server-only code in `lib/server/`. Static assets are stored in `public/`. Prisma source is in `prisma/schema.prisma`, and generated client code is in `generated/prisma/`; never edit generated files manually.

## Build, Test, and Development Commands

Use npm because the repository includes `package-lock.json`.

- `npm run dev`: start the development server on port 3001.
- `npm run build`: create a production build and run Next.js build checks.
- `npm run start`: serve the production build on port 3001.
- `npm run lint`: run ESLint with the configured Next.js and TypeScript rules.
- `npm run dbgenerate`: regenerate the Prisma client after schema changes.
- `npm run dbpush`: push the current Prisma schema to the configured database.

## Coding Style & Naming Conventions

Write TypeScript and React function components. Follow existing formatting: two-space indentation, double quotes, semicolons, and `@/` import aliases. Use PascalCase for component files, such as `ProductFormModal.tsx`; keep route directories lowercase and URL-oriented. Place reusable validation and persistence logic in `lib/server/`.

## Testing Guidelines

No automated test framework or coverage target is currently configured. Validate every change with `npm run lint` and `npm run build`. If adding tests, colocate them with the feature or use a dedicated test directory, and name files descriptively, for example `booking-status.test.ts`.

## Commit & Pull Request Guidelines

Prefer concise, imperative Conventional Commit subjects, especially `feat:` and `fix:` (for example, `fix: format parsed booking dates`). Pull requests should explain the change, list verification commands, link relevant issues, and include screenshots for visible UI updates.

## Security & Agent Notes

Keep credentials in `.env` and never commit secrets. Before changing Next.js APIs, routing, configuration, or server/client behavior, consult the relevant Next.js 16.2.6 documentation in `node_modules/next/dist/docs/` and follow current deprecation guidance.
