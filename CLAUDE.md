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

**Critical**: Always run `npm run lint` and `npm run build` before committing changes to ensure code quality and TypeScript compilation.

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

#### Directory Layout
```
src/
├── components/     # Reusable UI components grouped by feature
├── contexts/       # React context providers
├── hooks/          # Custom React hooks for state management
├── lib/           # External integrations (Supabase client)
├── pages/         # Route-level page components
├── services/      # Business logic and database operations
├── styles/        # Global styles and CSS modules
├── types/         # TypeScript type definitions
└── utils/         # Shared utility functions
```

#### Service Layer Pattern
**Critical**: Services **must** be split when exceeding 600 lines:
- Main service file (e.g., `invoiceOperations.ts`) re-exports from modules
- Create subdirectory with split modules by concern
- Examples:
  - `services/invoice/`: `invoiceCrud.ts`, `invoiceStatus.ts`, `invoiceFiles.ts`, `invoiceReferences.ts`
  - `services/approval/`: `approvalRoutes.ts`, `approvalActions.ts`, `approvalProcess.ts`, `approvalQueries.ts`
- Keep service files focused and maintainable

#### Hook-Service Separation
- **Hooks** (`src/hooks/`): React state management, UI interactions, optimistic updates
- **Services** (`src/services/`): Pure business logic, database operations, no React dependencies

### Database Schema

**Critical**: All database operations must reference schema in `supabase/ai_context/`:
- `ai_tables_min.json` / `ai_tables_full.json` - Table structures
- `ai_functions_min.json` / `ai_functions_full.json` - Database functions
- `ai_relations.json` - Foreign key relationships
- `ai_manifest.json` - Schema metadata
- `ai_enums_min.json` - Database enumerations
- `ai_triggers_min.json` - Database triggers

To regenerate AI context after database schema changes:
```bash
node scripts/generate-ai-context.cjs
```

Core tables:
- `invoices` - Main invoice records with status_id (FK to invoice_statuses)
- `payments` - Payment records with status_id (FK to payment_statuses)
- `invoice_payments` - M:N payment allocation
- `approval_routes` + `workflow_stages` - Configurable approval workflows
- `payment_approvals` + `approval_steps` - Approval instances and history
- `attachments` + entity-specific link tables - File metadata
- `material_requests` + `material_request_items` - Material requisitions with auto-counted items
- `material_classes` - Material classification hierarchy
- `material_nomenclature` - Material catalog and specifications

Design principles:
- No RLS - security in application layer
- Cascade deletion for related records
- UUID for user tables, serial for others
- All timestamps use `timestamp with time zone`

### Status Management

**Invoice Statuses** (use exact IDs):
- `1` = draft (Черновик)
- `2` = pending (На согласовании)
- `3` = paid (Оплачен)
- `4` = partial (Частично оплачен)
- `5` = cancelled (Отменен)

**Payment Statuses** (use exact IDs):
- `1` = created (Создан)
- `2` = pending (На согласовании)
- `3` = paid (Оплачен)
- `4` = cancelled (Отменён)
- `5` = approved (В оплате)

**Contract Statuses** (use exact IDs):
- `1` = draft (Черновик)
- `2` = active (Действующий)
- `3` = expired (Истёк срок)
- `4` = terminated (Расторгнут)

### Key Patterns

#### Optimistic Updates
Implemented in hooks layer:
1. UI updates immediately
2. Database operation in background
3. Revert on error

Example pattern in hooks:
```typescript
setData(optimisticData);
try {
  await serviceOperation();
} catch (error) {
  setData(previousData);
  throw error;
}
```

#### Database Triggers
Automatic field maintenance:
- `calculate_vat_amounts()` - Derives VAT splits on invoice rows
- `update_updated_at_column()` - Refreshes timestamps on UPDATE
- `update_material_request_items_count()` - Syncs parent item counts

#### File Upload System
- Storage bucket: `attachments` (**must be created first** - see `setup-storage-bucket.sql`)
- Path pattern: `{entity}/{id}/{timestamp}_{filename}`
- **File size limit: 50 MB** (enforced in all upload services)
- Metadata in `attachments` table
- Link tables: `invoice_attachments`, `contract_attachments`, `payment_attachments`, `material_request_attachments`
- Cascade deletion removes both storage and database records
- Universal component: `FileUploadBlock` (src/components/common/)
- Service: `fileAttachmentService.ts`, Hook: `useFileAttachment.ts`
- Upload implementations: `paymentOperations.ts::processPaymentFiles()`, `invoice/invoiceFiles.ts::processInvoiceFiles()`, `fileAttachmentService.ts::uploadFile()`
- **Troubleshooting**: If CORS errors occur, check `URGENT_STORAGE_ISSUE.md` and run `setup-storage-bucket.sql`

#### Bulk Data Import Pattern
Multi-step import modals for JSON/CSV data:
1. **Upload Step**: File selection and parsing
2. **Preview Step**: Display parsed data in table with validation
3. **Import Step**: Batch processing with progress bar
4. **Result Step**: Success/error summary

Example implementations:
- `ImportContractorsModal` - CSV contractor import
- `ImportNomenclatureModal` - JSON material nomenclature
- `ImportProjectsModal` - Bulk project creation

Common pattern:
- Parse file client-side
- Deduplicate records
- Check for existing records before insert
- Show progress during batch operations
- Report detailed results (created/skipped/errors)

#### Console Logging
```javascript
console.log('[ComponentName.methodName] Action:', { data });
```

#### Component Naming
- Pages: `{Feature}Page.tsx` (e.g., `InvoicesPage.tsx`)
- Modals: `{Action}{Entity}Modal.tsx` (e.g., `AddContractModal.tsx`)
- Forms: `{Entity}Form.tsx` (e.g., `InvoiceForm.tsx`)
- Tables: `{Entity}Table.tsx` (e.g., `PaymentsTable.tsx`)

### TypeScript Configuration

Strict mode with:
- Target: ES2022
- Module: ESNext with bundler resolution
- No unused locals/parameters
- No unchecked side effects
- No fallthrough in switch cases

### Environment Configuration

Required `.env`:
```
VITE_SUPABASE_URL=https://api-p1.fvds.ru
VITE_SUPABASE_ANON_KEY=[your_key]
```

**Note**: Storage URL is automatically derived from `VITE_SUPABASE_URL`. Do not add separate `VITE_STORAGE_BUCKET` variable.

### Windows Development Notes

This project is developed on Windows. Important considerations:
- Use forward slashes in file paths when possible for cross-platform compatibility
- Git line endings: Repository uses LF (`core.autocrlf=input` recommended)
- File operations: Use Node.js path utilities for path manipulation
- Bash scripts: May require Git Bash or WSL for execution
- Database connection: Direct IP connection to remote Supabase (no localhost)

### Code Quality Checks

Always run before committing:
```bash
npm run lint      # Check for linting errors
npm run build     # Verify TypeScript compilation and production build
```

### Common Development Patterns

#### Supabase Query Pattern
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*, related_table(*)')
  .eq('field', value);

if (error) throw error;
return data;
```

#### Status Updates
Always use exact status IDs from the Status Management section. Never hardcode status names or create new status values without updating the database enums.

#### Date Handling
Use Day.js with Russian locale for all date operations:
```typescript
import dayjs from 'dayjs';
dayjs(date).format('DD.MM.YYYY');
```