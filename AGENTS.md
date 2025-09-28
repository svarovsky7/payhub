# Repository Guidelines

## Project Structure & Module Organization
- Primary code lives in `src/`; route screens in `src/pages`, reusable UI in `src/components`, and custom hooks in `src/hooks`.
- Assets ready for bundling belong in `src/assets`; static files that ship untouched stay in `public/`.
- Co-locate Vitest suites beside implementations (e.g., `src/components/InvoiceTable.tsx` + `InvoiceTable.test.tsx`).
- Track backend schema changes in `supabase/ai_context` alongside the corresponding feature work.

## Build, Test, and Development Commands
- `npm run dev` starts Vite at http://localhost:5173 for interactive development.
- `npm run build` runs `tsc -b` and emits the production bundle into `dist/`.
- `npm run preview` serves the latest build for a production smoke test.
- `npm run lint` applies ESLint + Prettier rules; resolve all warnings before review.
- `npm test` executes the Vitest suite; add `-- --watch` while iterating locally.

## Coding Style & Naming Conventions
- TypeScript only: 2-space indentation, single quotes, and trailing commas enforced by repo formatters.
- Name React components in PascalCase (`PaymentPanel.tsx`); hooks and utilities stay in camelCase (`useInvoices.ts`).
- Group imports by external packages, project aliases, then relatives to keep diffs clean.

## Testing Guidelines
- Use Vitest with React Testing Library and keep critical paths near 80% coverage.
- Mirror filenames for tests and write behavior-focused `describe` / `it` labels.
- Document manual verification steps in PRs whenever automation falls short.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat: add invoice filters`, `fix: correct auth redirect`).
- Run `npm run lint`, `npm test`, and `npm run build` before requesting review.
- Include linked tasks, deployment notes, and UI screenshots when visuals change.

## Security & Configuration Tips
- Store secrets in `.env` using `VITE_` prefixes; never commit or log Supabase keys.
- After dependency updates, reinstall, rerun lint/test/build, and record schema diffs under `supabase/ai_context`.
