# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# PayHub Project

## Overview
PayHub is a construction materials procurement and payment approval system built with React, TypeScript, and Supabase. It manages invoice workflows and approval processes for construction materials.

## Tech Stack
- **Frontend**: React 19, TypeScript (strict mode), Vite 7
- **UI**: Ant Design 5.27+, Notistack 3.0+
- **State**: TanStack Query 5.85+ (server state), Zustand 5.0+ (auth & device preferences)
- **Backend**: Supabase 2.55+ (RLS disabled)
- **Routing**: React Router 6.30+
- **Utilities**: Day.js, xlsx, @dnd-kit/core, @hello-pangea/dnd

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:5173/)
npm run build      # TypeScript check + Vite build
npm run lint       # ESLint check
npm run format     # Prettier formatting
npm run format:check # Check formatting without changing files
npm run preview    # Preview production build
npx tsc --noEmit  # Type checking only (standalone)
```

## Architecture

### Feature-Sliced Design (FSD)
```
src/
├── app/          # App-level providers, routing
├── pages/        # Route pages
├── widgets/      # Complex reusable UI blocks
├── features/     # User interactions, business features
├── entities/     # Business entities and their APIs
└── shared/       # Shared utilities, UI components, types
```

### Key Patterns
- **Public API**: Each slice exposes through `index.ts`
- **Imports**: Always use path aliases (`@/`, `@/entities/`, etc.)
- **State**: React Query for server, Zustand for auth only
- **API Files**: Named as `entity-name-api.ts` in `entities/*/api/`

## Database

**CRITICAL**: Always reference `supabase/schemas/prod.sql` for current database structure.

### Core Tables
- `invoices` - Main invoice records with status tracking
- `invoice_documents` - Links invoices to attachment files
- `attachments` - File metadata storage (simplified)
- `users` - User profiles (linked to auth.users, no role-based restrictions)
- `contractors`, `payers`, `projects` - Reference data
- `responsible_persons`, `units` - Supporting tables

### Key Relations
- All tables use `created_by uuid` referencing users
- Invoice workflow tracked through approvals table
- Many-to-many relations via junction tables (e.g., invoice_documents)

## API Pattern

Standard Supabase query pattern:
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*, relation:table(*)')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

### Authentication
- Supabase Auth configured with auto-refresh and session persistence
- Auth state managed via Zustand store in `features/auth/model/auth-store.ts`
- Protected routes handled by `ProtectedRoute` component

## Critical Guidelines

### MUST DO
- Run `npm run lint` before committing
- Use only `supabase/schemas/prod.sql` for database reference
- Handle all TypeScript strict mode requirements
- Use absolute imports with path aliases
- Export public APIs through index.ts files
- Include error handling in all Supabase queries

### NEVER DO
- Create files unless absolutely necessary
- Add comments unless explicitly requested
- Use relative imports (../../../)
- Commit .env files
- Use `any` type in TypeScript
- Create documentation files proactively

## Environment Variables

```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_STORAGE_BUCKET=<storage_url>
```

## Current Pages
- `/login` - Authentication
- `/register` - User registration
- `/invoices` - Invoice management (default landing page) with responsive table/card views
- `/kanban` - Kanban board view with customizable cards and touch optimization
- `/admin` - Admin panel
- `/profile` - User profile with device preference settings
- `/approvals/rukstroy` - Rukstroy approval workflow
- `/approvals/director` - Director approval workflow
- `/approvals/supply` - Supply approval workflow
- `/approvals/payment` - Payment processing
- `/approvals/paid` - Paid invoices view
- `/approvals/rejected` - Rejected invoices view

## Responsive Design & Device Optimization

### Device Preference System
- Users can select preferred device type in profile settings (Auto-detect/Desktop/Tablet)
- Preferences persist in localStorage across sessions
- Device-specific CSS classes applied to body element
- Touch optimization automatically enabled for tablets

### Responsive Breakpoints
- **4K Desktop (2560px+)**: Enhanced spacing and larger components
- **Full HD (1920px)**: Optimized table and form sizing
- **Desktop (1280px)**: Standard desktop layout
- **iPad Pro 12.9" (1024px)**: Touch-optimized with persistent sidebar
- **iPad Air/Pro 11" (820px)**: Compact sidebar, enhanced touch targets
- **iPad Mini (768px)**: Collapsible sidebar, card-first approach
- **Mobile (<768px)**: Full mobile optimization with drawer navigation

### Touch Optimization Features
- Minimum 44px touch targets on tablets/mobile (Apple HIG compliant)
- Enhanced button heights: 32px (desktop) vs 40px (tablet)
- Touch-friendly input fields with increased height
- Disabled hover effects on touch devices
- Improved active states and focus indicators
- Touch-optimized scrollbars

### Kanban Board Enhancements
- Customizable card fields via settings modal
- Compact mode for space efficiency
- Auto-switching between Kanban/Stack views based on screen size
- View mode toggle for tablets (Kanban vs Stack view)
- Settings persist in localStorage
- Touch-friendly drag and drop

## TypeScript Configuration
- Composite project with separate `tsconfig.app.json` and `tsconfig.node.json`
- Strict mode enabled with all strict checks
- Path aliases configured in both `tsconfig.app.json` and `vite.config.ts`
- Build info cached in `node_modules/.tmp/`
- Module resolution: bundler mode with ESNext modules

## Important Notes

### ESLint Configuration
The project uses ESLint flat config (`eslint.config.js`). Note: Line 6 has an incorrect import that should be fixed.

### Testing & Quality
- TypeScript strict mode enforced
- ESLint with TypeScript rules (flat config)
- Prettier for formatting
- No testing framework currently configured