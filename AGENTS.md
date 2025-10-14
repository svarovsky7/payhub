# Repository Guidelines

This guide keeps PayHub contributors in sync on structure, tooling, and review expectations. Follow it whenever you add features, fix bugs, or refine the developer experience.

## Project Structure & Module Organization
- Place app code in `src/`; route components live under `src/pages`, shared UI under `src/components`, and reusable logic under `src/hooks`.
- Bundle-ready assets belong in `src/assets`; immutable static files stay in `public/`.
- Co-locate tests with their subjects (for example, `src/components/InvoiceTable.tsx` pairs with `src/components/InvoiceTable.test.tsx`).
- Track backend schema adjustments in `supabase/ai_context` alongside the feature branch that requires them.

## Build, Test, and Development Commands
- `npm run dev`: start Vite at http://localhost:5173 for hot-reload UI work.
- `npm run build`: run `tsc -b` and emit the optimized bundle to `dist/` before shipping.
- `npm run preview`: serve the latest build for production-like smoke testing.
- `npm run lint`: apply ESLint + Prettier and resolve all warnings prior to review.
- `npm test` or `npm test -- --watch`: execute the Vitest suite once or in watch mode.

## Coding Style & Naming Conventions
- Write everything in TypeScript with 2-space indentation, single quotes, and trailing commas enforced by project formatters.
- Prefer concise descriptive filenames: PascalCase for components (`PaymentPanel.tsx`), camelCase for hooks/utilities (`useInvoices.ts`).
- Group imports by external packages, project aliases, then relative paths to minimize noisy diffs.

## Testing Guidelines
- Use Vitest with React Testing Library; target ~80% coverage on critical flows.
- Mirror implementation filenames and emphasize behavior-driven `describe`/`it` names.
- Run `npm test` before pushing and note any manual verification steps that automation misses.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat: add invoice filters`, `fix: correct auth redirect`) to keep history searchable.
- Before opening a PR, run lint, test, and build; attach screenshots or videos for UI updates.
- Summarize schema changes, link related tasks, and highlight deployment considerations in the PR description.

## Security & Configuration Tips
- Store secrets in `.env` with `VITE_` prefixes and keep Supabase keys out of logs and commits.
- After dependency updates, reinstall packages, rerun lint/test/build, and document schema diffs under `supabase/ai_context`.
