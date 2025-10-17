# Repository Guidelines

Use this playbook whenever you add features, fix regressions, or adjust platform tooling. Each section calls out the defaults that keep PayHub predictable and production-ready.

## Project Structure & Module Organization
Source lives in `src/`. Route-driven views belong in `src/pages`, shared UI in `src/components`, and domain hooks in `src/hooks`. Co-locate tests with their subjects (for example, `src/components/InvoiceTable.tsx` pairs with `src/components/InvoiceTable.test.tsx`). Ship-ready assets reside in `src/assets`; long-lived static files stay in `public/`. Record any Supabase schema deltas in `supabase/ai_context` on the same branch they support.

## Architecture Snapshot
PayHub is a Vite-powered React + TypeScript app that talks to Supabase services through the exposed client library. Vite handles module bundling and preview servers, while TypeScript project references (`tsconfig.*.json`) keep builds fast and type-safe. Follow existing patterns to reuse providers, context hooks, and Supabase helpers.

## Build, Test, and Development Commands
`npm run dev` launches Vite at http://localhost:5173 with hot reloading. `npm run build` runs `tsc -b` and creates the optimized bundle in `dist/`. `npm run preview` serves the last build for manual smoke checks. `npm run lint` applies ESLint + Prettier; resolve every warning before committing. `npm test` (or `npm test -- --watch`) runs the Vitest suite.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation, single quotes, and trailing commas (the formatter enforces all three). Use PascalCase for React components (`PaymentPanel.tsx`), camelCase for utilities and hooks (`useInvoices.ts`), and SCREAMING_SNAKE_CASE only for constants exported from config. Group imports by third-party packages, internal aliases, then relative paths to keep diffs small.

## Testing Guidelines
We rely on Vitest plus React Testing Library. Mirror filenames (`Component.test.tsx`) and drive tests with behavior-focused `describe/it` blocks. Target ≈80% coverage on core user flows. Run `npm test` locally before every push and document any manual QA steps in the PR description.

## Commit & Pull Request Guidelines
Use Conventional Commits, e.g., `feat: add invoice filters` or `fix: correct auth redirect`, so automation can parse release notes. Before opening a PR, run lint, test, and build, then attach relevant screenshots or short Looms for UI work. Reference linked issues, summarize Supabase or schema updates, and call out deployment considerations.

## Security & Configuration Tips
Secrets live in `.env` with `VITE_` prefixes; never commit Supabase keys or tokens. After dependency upgrades, reinstall packages, re-run lint/test/build, and capture schema migrations under `supabase/ai_context` so reviewers can verify environment changes.
