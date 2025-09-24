# Repository Guidelines
Welcome to PayHub. This guide aligns contributors quickly and keeps changes consistent with team expectations.

## Project Structure & Module Organization
Product code stays in `src/`. Pages live under `src/pages/` (for example `src/pages/InvoicesPage.tsx`), shared UI widgets in `src/components/`, and hooks in `src/hooks/`. Keep entry wiring limited to `src/main.tsx`. Place reusable media in `src/assets/` and public-only files in `public/`. Store backend metadata and SQL migrations exclusively inside `supabase/ai_context` to avoid drifting schemas.

## Build, Test, and Development Commands
Use `npm run dev` to boot Vite on http://localhost:5173 for iterative work. `npm run build` runs `tsc -b` and produces the optimized bundle in `dist/`. Smoke the bundle with `npm run preview`. Lint all TypeScript with `npm run lint`. Run the Vitest suite with `npm test` (add `-- --watch` for TDD loops).

## Coding Style & Naming Conventions
Write functional components in PascalCase (`PaymentPanel.tsx`) and hooks/utilities in camelCase (`useInvoices.ts`). Follow 2-space indentation, single quotes, trailing commas, and grouped imports (external, absolute aliases, then relatives). Let ESLint guide formatting; fix or justify any warning before merging.

## Testing Guidelines
Tests sit beside their subjects as `Component.test.tsx`. We rely on Vitest plus React Testing Library; aim for >=80% coverage on critical flows. Prefer scenario-driven tests that mirror user behavior. Document any manual verification when automated coverage is not feasible.

## Commit & Pull Request Guidelines
Use Conventional Commits such as `feat:`, `fix:`, or `chore:`. Each PR should link its tracked task, summarize the change, list lint/test results, and attach UI screenshots when visuals shift. Highlight deployment risks, note required follow-up, and confirm Supabase migrations remain synced.

## Security & Configuration Tips
Secrets belong in `.env` with the `VITE_` prefix; never log Supabase keys. After dependency bumps, run `npm install`, then re-run build and lint before asking for review. Keep schema work versioned in `supabase/ai_context` rather than ad-hoc scripts.


