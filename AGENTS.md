# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + TypeScript codebase; `main.tsx` bootstraps the app and should stay thin while features live in scoped folders under `src`.
- `src/assets/` holds bundled static assets; use `public/` for files served verbatim (favicons, manifest, policy docs).
- Root configs (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`) control build, compiler, and linting behavior; update them when adding path aliases or introducing tooling.
- Environment hooks live in `.env`; create `.env.local` for personal secrets and commit a sanitized `.env.example` whenever new variables appear.

## Build, Test, and Development Commands
- `npm install` prepares dependencies; rerun after any lockfile change.
- `npm run dev` starts Vite on `http://localhost:5173` with hot reload for UI feedback.
- `npm run build` executes `tsc -b` for type safety, then emits optimized assets to `dist/`.
- `npm run preview` serves the production bundle locally for final smoke tests.
- `npm run lint` runs ESLint across `.ts`/`.tsx`; fix or justify warnings before opening a PR.

## Coding Style & Naming Conventions
- Use function components with PascalCase filenames (`PaymentPanel.tsx`); utilities and hooks stay camelCase (`formatCurrency.ts`, `useInvoices.ts`).
- Keep 2-space indentation, single quotes, and trailing commas per current sources; leverage `npm run lint -- --fix` for formatting assists.
- Organize imports by third-party, absolute aliases, then relative paths; remove unused symbols promptly.
- Store component styles in nearby `.css` files and namespace shared selectors (`ph-dashboard__header`) to avoid collisions.

## Testing Guidelines
- A test runner is not yet wired in; align on Vitest plus React Testing Library before contributing significant logic.
- Place tests alongside code as `Component.test.tsx` or in `src/__tests__/`; mirror file names to simplify lookup.
- Until automation lands, pair linting with manual verification notes in PRs (flows exercised, edge cases observed).
- Target >=80% coverage on core views and critical hooks once Vitest is introduced, and document gaps explicitly.

## Commit & Pull Request Guidelines
- Git history is absent; follow Conventional Commits (`feat:`, `fix:`, `chore:`) so automation can parse intent from day one.
- Scope commits narrowly and keep them buildable; include config or schema updates with the feature they enable.
- Pull requests need a clear summary, linked ticket or reference, and test evidence; attach UI screenshots or GIFs when visuals change.
- List deployment considerations and follow-up tasks in the PR body to keep the roadmap transparent.
