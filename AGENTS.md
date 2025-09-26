# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with routing screens under `src/pages/`, shared UI in `src/components/`, and hooks in `src/hooks/`. Keep assets that ship with the bundle in `src/assets/` and limit `public/` to static, client-visible files. Place Supabase schema metadata and migrations only in `supabase/ai_context` so backend state stays versioned alongside code. Co-locate tests beside the implementation as `*.test.tsx` for quick discovery.

## Build, Test, & Development Commands
Use `npm run dev` to start Vite on http://localhost:5173 during feature work. `npm run build` runs `tsc -b` and emits the production bundle to `dist/`; follow with `npm run preview` for a local smoke test. Run `npm run lint` before review to satisfy ESLint rules. Execute `npm test` (optionally `npm test -- --watch`) to exercise the Vitest suite.

## Coding Style & Naming Conventions
Stick to TypeScript with 2-space indentation, single quotes, and trailing commas; ESLint and Prettier enforce defaults. Name components in PascalCase (e.g., `PaymentPanel.tsx`), hooks and utilities in camelCase (`useInvoices.ts`). Group imports: external packages, absolute aliases, then relative paths. Avoid placing wiring logic outside `src/main.tsx` to keep entry clean.

## Testing Guidelines
Favor scenario-driven Vitest cases with React Testing Library. Ensure critical flows stay above 80% coverage; add focused tests when behavior is user-facing or risky. Name files `Component.test.tsx` beside the component. Document any manual verification in the PR when automation is impractical.

## Commit & Pull Request Guidelines
Write Conventional Commits such as `feat: add invoice filters` or `fix: correct auth redirect`. PRs should link to their task, summarize changes, call out deployment risks, and attach screenshots when UI shifts. Confirm lint and test commands pass, and note any Supabase migration touches in `supabase/ai_context`.

## Security & Configuration Tips
Keep secrets in `.env` files with the `VITE_` prefix and never log Supabase keys. After dependency updates, rerun `npm install`, then `npm run build` and `npm run lint`. Avoid ad-hoc scripts; persist all schema work inside `supabase/ai_context`.
