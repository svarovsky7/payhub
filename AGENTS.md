# Repository Guidelines

## Project Structure & Module Organization
- Keep feature code in `src/`; route screens belong under `src/pages`, shared UI in `src/components`, hooks in `src/hooks`.
- Store bundlable assets in `src/assets`, while immutable static files stay in `public/`.
- Co-locate tests beside implementations (`src/components/InvoiceTable.tsx` + `InvoiceTable.test.tsx`) to keep behavior discoverable.
- Track backend schema adjustments in `supabase/ai_context` alongside feature branches.

## Build, Test, and Development Commands
- `npm run dev`: launch Vite at http://localhost:5173 with hot reload for UI iteration.
- `npm run build`: run `tsc -b` and emit the production bundle into `dist/`; use before publishing.
- `npm run preview`: serve the latest build for a production-like smoke test.
- `npm run lint`: apply ESLint + Prettier; resolve any warnings prior to review.
- `npm test` or `npm test -- --watch`: execute the Vitest suite once or in watch mode while developing.

## Coding Style & Naming Conventions
- TypeScript everywhere; adhere to 2-space indentation, single quotes, and trailing commas enforced by repo formatters.
- Name React components in PascalCase (`PaymentPanel.tsx`), hooks/utilities in camelCase (`useInvoices.ts`), and keep filenames descriptive.
- Group imports by external packages, project aliases, then relative paths to reduce noisy diffs.

## Testing Guidelines
- Use Vitest with React Testing Library; aim for ~80% coverage on critical flows.
- Mirror filenames for tests and focus on behavior-driven `describe`/`it` statements.
- Run `npm test` before commits; add manual verification notes when automation cannot cover edge cases.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat: add invoice filters`, `fix: correct auth redirect`) to keep history searchable.
- Before opening a PR, run lint, test, and build commands locally and ensure screenshots or videos accompany UI changes.
- PR descriptions should link relevant tasks, summarize schema updates, and note any deployment considerations.

## Security & Configuration Tips
- Store secrets in `.env` with `VITE_` prefixes; never commit Supabase keys or leak them in logs.
- After dependency updates, reinstall packages, rerun lint/test/build, and document schema diffs under `supabase/ai_context`.
