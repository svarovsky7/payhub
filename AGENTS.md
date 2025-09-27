# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`. Route screens stay inside `src/pages/`, shared UI primitives in `src/components/`, and reusable logic in `src/hooks/`. Keep bundle-friendly assets in `src/assets/` and reserve `public/` for static files only. Co-locate tests beside implementations as `*.test.tsx`. Track Supabase schema and migrations exclusively in `supabase/ai_context` so backend state versioning stays in lockstep with code.

## Build, Test, and Development Commands
Use `npm run dev` to launch Vite at http://localhost:5173 during feature work. Run `npm run build` to compile via `tsc -b` and produce the `dist/` bundle, then `npm run preview` for a local production smoke test. Execute `npm run lint` to satisfy ESLint before review. Run `npm test` or `npm test -- --watch` to exercise the Vitest suite.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation, single quotes, and trailing commas—ESLint plus Prettier enforce defaults. Name React components in PascalCase (e.g., `PaymentPanel.tsx`) and hooks/utilities in camelCase (e.g., `useInvoices.ts`). Group imports by external packages, absolute aliases, then relatives. Avoid wiring logic outside `src/main.tsx` to keep entry clean.

## Testing Guidelines
Vitest with React Testing Library powers unit and integration tests. Aim for scenario-driven coverage above 80% on critical flows. Mirror the implementation name in `Component.test.tsx` files and place them beside their components. Document any manual verification steps when automation is impractical.

## Commit & Pull Request Guidelines
Adopt Conventional Commits such as `feat: add invoice filters` or `fix: correct auth redirect`. Pull requests should link to their task, summarize changes, outline deployment risks, and attach UI screenshots when visuals shift. Confirm `npm run lint`, `npm test`, and `npm run build` succeed before requesting review.

## Security & Configuration Tips
Store secrets in `.env` with the `VITE_` prefix and never log Supabase keys. After dependency updates, rerun install, build, and lint commands. Persist all Supabase schema updates inside `supabase/ai_context` to keep environments reproducible.
