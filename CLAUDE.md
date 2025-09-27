# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PayHub - Invoice management and payment processing React application built with Vite, TypeScript, and Supabase. Russian-localized enterprise application for financial document workflow.

## Development Commands

```bash
npm run dev       # Start development server on http://localhost:5173
npm run build     # TypeScript check (tsc -b) + Vite production build to dist/
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
node scripts/generate-ai-context.cjs  # Regenerate database AI context from supabase/exports/
```

**Note**: No test framework is currently configured. Tests referenced in AGENTS.md (`npm test`, Vitest) are not yet implemented.

## Architecture

### Technology Stack
- **React 19.1** with Ant Design 5.x (using React 19 compatibility patch)
- **TypeScript 5.8** with strict mode enabled
- **Vite 7.1** for build and dev server
- **Supabase** for backend (PostgreSQL at http://31.128.51.210:8001)
- **React Router 7** for client-side routing
- **Day.js** for date handling (Russian locale)

### Core Application Structure

#### Service Layer Pattern
Services are split when exceeding 600 lines:
- Main service file (e.g., `invoiceOperations.ts`) re-exports from modules
- Subdirectory modules handle specific concerns:
  - `services/invoice/`: `invoiceCrud.ts`, `invoiceStatus.ts`, `invoiceFiles.ts`, `invoiceReferences.ts`
  - `services/approval/`: `approvalRoutes.ts`, `approvalActions.ts`, `approvalProcess.ts`, `approvalQueries.ts`

#### Hook-Service Separation
- **Hooks** (`src/hooks/`): React state management, UI interactions, optimistic updates
- **Services** (`src/services/`): Pure business logic, database operations, no React dependencies

Key hooks:
- `useInvoiceManagement.ts` - Invoice CRUD with optimistic updates
- `usePaymentManagement.ts` - Payment allocation and processing
- `useApprovalManagement.ts` - Approval workflow state
- `useInvoiceForm.ts` - Form state management
- `useMaterialRequestManagement.ts` - Material request operations

### Database Schema

**Critical**: All database operations must reference schema in `supabase/ai_context/`:
- `ai_tables_*.json` - Table structures
- `ai_functions_*.json` - Database functions
- `ai_relations.json` - Foreign key relationships
- `ai_manifest.json` - Schema metadata

Core tables:
- `invoices` - Main invoice records with status_id (FK to invoice_statuses)
- `payments` - Payment records with status_id (FK to payment_statuses)
- `invoice_payments` - M:N payment allocation
- `approval_routes` + `workflow_stages` - Configurable approval workflows
- `payment_approvals` + `approval_steps` - Approval instances and history
- `attachments` + entity-specific link tables - File metadata

Design principles:
- No RLS - security in application layer
- Cascade deletion for related records
- UUID for user tables, serial for others
- All timestamps use `timestamp with time zone`

### Status Management

**Invoice Statuses** (use exact IDs):
- `1` = draft (Черновик)
- `2` = pending (На согласовании)
- `3` = partial (Частично оплачен)
- `4` = paid (Оплачен)
- `5` = cancelled (Отменен)

**Payment Statuses** (use exact IDs):
- `1` = created (Создан)
- `2` = pending (На согласовании)
- `3` = approved (В оплате)
- `4` = paid (Оплачен)
- `5` = cancelled (Отменён)

### Key Patterns

#### Optimistic Updates
Implemented in hooks layer:
1. UI updates immediately
2. Database operation in background
3. Revert on error

#### File Upload System
- Storage bucket: `attachments`
- Path pattern: `{entity}/{id}/{timestamp}_{filename}`
- Metadata in `attachments` table
- Link tables: `invoice_attachments`, `contract_attachments`, `payment_attachments`
- Cascade deletion removes both storage and database records

#### Console Logging
```javascript
console.log('[ComponentName.methodName] Action:', { data });
```

### TypeScript Configuration

Strict mode with:
- Target: ES2022
- Module: ESNext with bundler resolution
- No unused locals/parameters
- No unchecked side effects

### Environment Configuration

Required `.env`:
```
VITE_SUPABASE_URL=http://31.128.51.210:8001
VITE_SUPABASE_ANON_KEY=[your_key]
VITE_STORAGE_BUCKET=http://31.128.51.210:8001/storage/v1
```