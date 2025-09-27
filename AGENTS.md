# Repository Guidelines

## Project Structure & Module Organization
- Keep all application code under `src/`. Place route-driven screens in `src/pages/`, shared UI primitives in `src/components/`, and reusable logic in `src/hooks/`.
- Store bundle-friendly assets in `src/assets/`; reserve `public/` for static files that ship as-is.
- Co-locate Vitest suites beside implementations as `Component.test.tsx`. Track Supabase schema updates in `supabase/ai_context` to version backend state with code.

## Build, Test, and Development Commands
- `npm run dev`: start Vite on http://localhost:5173 for interactive development.
- `npm run build`: run `tsc -b` and emit the production bundle into `dist/`.
- `npm run preview`: serve the built bundle locally for a production smoke test.
- `npm run lint`: execute ESLint with project rules; resolve all warnings before review.
- `npm test`: run the Vitest suite; add `-- --watch` during TDD sessions.

## Coding Style & Naming Conventions
- Write TypeScript with 2-space indentation, single quotes, and trailing commas. Prettier and ESLint enforce these defaults—run the formatters before commits.
- Name React components in PascalCase (e.g., `PaymentPanel.tsx`) and hooks/utilities in camelCase (e.g., `useInvoices.ts`). Group imports by external packages, aliases, then relatives.
- Keep wiring logic in `src/main.tsx`; keep feature wiring scoped to pages or components.

## Testing Guidelines
- Use Vitest with React Testing Library for unit and integration coverage; target 80%+ on critical flows.
- Mirror filenames for tests (e.g., `InvoiceTable.test.tsx` beside `InvoiceTable.tsx`). Document any manual verification steps when automated checks are impractical.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat: add invoice filters`, `fix: correct auth redirect`). Describe scope clearly.
- Before opening a PR, ensure `npm run lint`, `npm test`, and `npm run build` succeed. Include linked tasks, deployment considerations, and UI screenshots when visuals change.

## Security & Configuration Tips
- Store secrets in `.env` with `VITE_` prefixes and avoid logging Supabase keys.
- After dependency updates, reinstall, then rerun lint, test, and build commands. Persist schema advances in `supabase/ai_context` for reproducibility.
