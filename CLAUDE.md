# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# PayHub - Construction Materials Procurement System

React/TypeScript procurement and payment approval system for construction materials with invoice workflow management.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173/)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint check
npm run format       # Prettier formatting
npm run format:check # Check formatting without changes
npm run preview      # Preview production build
npx tsc --noEmit    # Type checking only
```

## Architecture

### Feature-Sliced Design (FSD)
```
src/
├── app/       # Providers, routing setup
├── pages/     # Route pages  
├── widgets/   # Complex UI blocks (kanban, layout)
├── features/  # Business features (auth, device-prefs, data-prefetch)
├── entities/  # Business entities with APIs (invoice, contractor, etc.)
└── shared/    # Utilities, UI components, types, Supabase client
```

### Key Patterns
- **Path aliases**: Always use `@/`, `@/entities/`, etc. (configured in tsconfig & vite)
- **Public API**: Each slice exports through `index.ts`
- **API naming**: `entity-name-api.ts` in `entities/*/api/`
- **State management**: TanStack Query for server state, Zustand for auth/device preferences only
- **TypeScript**: Strict mode enabled with all checks

## Database

**Reference**: `supabase/schemas/prod.sql` is the source of truth for database structure.

### Core Tables
- `invoices` - Main records with status workflow
- `invoice_documents`, `attachments` - File handling
- `users` - Profiles linked to auth.users
- `contractors`, `payers`, `projects` - Reference data
- `approvals` - Workflow tracking

### Supabase Pattern
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

## Routes

- `/invoices` - Default landing, invoice management
- `/kanban` - Kanban board with customizable cards
- `/approvals/*` - Workflow stages (rukstroy, director, supply, payment, paid, rejected)
- `/admin` - Admin panel for managing reference data
- `/profile` - User settings with device preferences
- `/login`, `/register` - Authentication

## Responsive Design

### Device System
- User-selectable device type in profile (Auto/Desktop/Tablet)
- Settings persist in localStorage
- Touch optimization for tablets (44px min touch targets)

### Table Display
Always use auto-width tables:
```tsx
<Table 
  tableLayout="auto" 
  scroll={{ x: 'max-content' }}
  // ... 
/>
```

## Environment Variables

```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_STORAGE_BUCKET=<storage_url>
```

## Critical Rules

### MUST
- Run `npm run lint` before committing
- Use path aliases for imports
- Handle TypeScript strict mode
- Include error handling in Supabase queries
- Set `tableLayout="auto"` on all tables

### NEVER
- Create files unless absolutely necessary
- Add comments unless requested
- Use relative imports (../../../)
- Use `any` type
- Create documentation proactively

## Tech Stack

- **React 19** + **TypeScript 5.8** (strict) + **Vite 7**
- **Ant Design 5.27+** + **Notistack 3.0+** for UI
- **TanStack Query 5.85+** for server state
- **Zustand 5.0+** for auth/device state
- **Supabase 2.55+** backend (RLS disabled)
- **React Router 7.8+** for routing
- **Day.js**, **xlsx**, **@dnd-kit**, **@hello-pangea/dnd** utilities

## TypeScript Configuration

- **Strict mode**: All strict checks enabled
- **Path aliases**: Configured in tsconfig.json and vite.config.ts
- **No `any` type**: Use proper types or `unknown` when type is truly unknown

## Known Issues

- No testing framework configured
- Auth via Supabase with auto-refresh token management