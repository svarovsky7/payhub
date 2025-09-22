# Repository Guidelines

## Project Structure & Module Organization
PayHub is a Vite + React + TypeScript app. All product code lives in `src/`. Screens follow `src/pages/InvoicesPage.tsx`, while shared UI goes in `src/components/` and shared logic in `src/hooks/`. Entry wiring stays lean inside `src/main.tsx`. Place reusable assets in `src/assets/`, and expose public-only files via `public/`. Store backend metadata and SQL in `supabase/` - avoid ad-hoc migrations elsewhere.

## Build, Test, and Development Commands
- `npm run dev` starts Vite on `http://localhost:5173` for local work.
- `npm run build` runs `tsc -b` and emits the production bundle to `dist/`.
- `npm run preview` serves the built bundle for smoke checks.
- `npm run lint` executes ESLint over `.ts/.tsx` sources.

## Coding Style & Naming Conventions
Use functional components in PascalCase (`PaymentPanel.tsx`) and hooks/utilities in camelCase (`useInvoices.ts`). Format with 2-space indentation, single quotes, and trailing commas. Group imports: external packages, absolute aliases, then relative paths. ESLint is the source of truth - resolve or justify warnings before merging.

## Testing Guidelines
Tests sit alongside code as `Component.test.tsx`. We rely on Vitest plus React Testing Library; run the suite with `npm test` or `npm run test -- --watch`. Target >=80% coverage on critical flows and document any manual verification in PR notes.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`). Each PR should link to the tracked task, summarize changes, include results of lint/test runs, and attach UI screenshots when altering visuals. Call out deployment risks and follow-up work for the release plan.

## Security & Configuration Tips
Keep secrets in `.env` using the `VITE_` prefix and never log Supabase keys. Manage schema changes through versioned files under `supabase/ai_context`. After dependency updates, run `npm install` and re-validate build and lint before opening a PR.
