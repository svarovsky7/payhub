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

**Build Optimization**: Vite is configured with manual chunk splitting to optimize bundle size:
- `react-vendor` chunk: React, React DOM, React Router
- `antd-vendor` chunk: Ant Design and icons
- `supabase-vendor` chunk: Supabase client
- Chunk size warning limit: 1500KB

**Critical**: Always run `npm run lint` and `npm run build` before committing changes to ensure code quality and TypeScript compilation.

**Note**: No test framework is currently configured.

## Architecture

### Technology Stack
- **React 19.1** with Ant Design 5.x (using `@ant-design/v5-patch-for-react-19` compatibility package)
- **TypeScript 5.8** with strict mode enabled
- **Vite 7.1** for build and dev server
- **Supabase** for backend (PostgreSQL + Storage for file uploads)
- **React Router 7** for client-side routing
- **Day.js** for date handling (Russian locale)
- **Additional libraries**: docxtemplater (Word templates), xlsx (Excel export), qrcode (QR generation), fuse.js (fuzzy search), lodash (utilities)

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
- Current split services:
  - `services/invoice/`: `invoiceCrud.ts`, `invoiceStatus.ts`, `invoiceFiles.ts`, `invoiceReferences.ts`, `invoiceArchive.ts`
  - `services/approval/`: `approvalRoutes.ts`, `approvalActions.ts`, `approvalProcess.ts`, `approvalQueries.ts`, `approvalBulk.ts`
- Keep service files focused and maintainable (each module should handle a single concern)

#### Hook-Service Separation
- **Hooks** (`src/hooks/`): React state management, UI interactions, optimistic updates
  - Naming pattern: `use{Feature}Management.ts` (e.g., `useInvoiceManagement.ts`)
  - Key hooks: `useInvoiceManagement`, `usePaymentManagement`, `useLetterManagement`, `useApprovalManagement`, `useMaterialRequestManagement`, `useBudgetManagement`
  - Specialized hooks: `useFileAttachment`, `useColumnSettings`, `useAuditLog`
- **Services** (`src/services/`): Pure business logic, database operations, no React dependencies
  - Naming pattern: `{feature}Operations.ts` (e.g., `invoiceOperations.ts`)
  - Services should not import React or use hooks
  - All Supabase operations should be in service layer

#### TypeScript Types
All database entity types are centralized in `src/lib/supabase.ts`:
- Export TypeScript interfaces for all major entities (Invoice, Payment, Contract, etc.)
- Import Supabase client from `src/lib/supabase` (never create new instances)
- Types mirror database schema structure with optional joined relations

#### Authentication & Authorization
**Authentication System**:
- `AuthContext` (`src/contexts/AuthContext.tsx`) - manages authentication state and user profile
- `AuthPage` (`src/pages/AuthPage.tsx`) - login and registration forms with project assignment
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) - route protection with role-based access control
- Supabase Auth integration with email/password (no password complexity requirements)
- User profile creation in `user_profiles` table on signup with `full_name` field
- Default clerk role (id=9, code='clerk') assigned on registration
- Project assignment during registration via `user_projects` link table

**Authorization System**:
- Role-based access control via `roles` table with `own_projects_only` flag and `allowed_pages` JSON field
- User roles stored in `user_profiles.role_id` (FK to roles.id)
- Page-level permissions checked in `ProtectedRoute` component
- Dynamic role switching in MainLayout header (users can switch between assigned roles)
- Role query functions: `get_user_role()`, `check_user_access()` (see `supabase/ai_context/ai_functions_*.json`)
- No RLS (Row Level Security) - all authorization implemented in application layer


### Database Schema

**Critical**: All database operations must reference schema in `supabase/ai_context/`:
- `ai_tables_min.json` / `ai_tables_full.json` - Table structures
- `ai_functions_min.json` / `ai_functions_full.json` - Database functions
- `ai_relations.json` - Foreign key relationships
- `ai_manifest.json` - Schema metadata and file hashes
- `ai_enums_min.json` - Database enumerations
- `ai_triggers_min.json` - Database triggers

To regenerate AI context after database schema changes:
```bash
node scripts/generate-ai-context.cjs
```

Core tables:
- `invoices` - Main invoice records with status_id (FK to invoice_statuses), includes VAT calculations and delivery tracking
- `payments` - Payment records with status_id (FK to payment_statuses)
- `invoice_payments` - M:N payment allocation linking invoices to payments
- `contracts` - Contract management with M:N project relationships via `contract_projects`
- `approval_routes` + `workflow_stages` - Configurable approval workflows
- `payment_approvals` + `approval_steps` - Approval instances and history
- `attachments` + entity-specific link tables (`invoice_attachments`, `payment_attachments`, `contract_attachments`, `letter_attachments`) - File metadata and relationships
- `material_requests` + `material_request_items` - Material requisitions with auto-counted items
- `material_classes` - Material classification hierarchy
- `material_nomenclature` - Material catalog and specifications
- `letters` + `letter_links` + `letter_attachments` - Letter management system with incoming/outgoing correspondence tracking

Design principles:
- No RLS - security in application layer
- Cascade deletion for related records
- UUID primary keys for main entities, serial for reference/lookup tables
- All timestamps use `timestamp with time zone`
- Automatic trigger maintenance for `updated_at`, VAT calculations, and item counts

#### Database Migration Workflow
Migrations stored in `supabase/migrations/`:
- `prod.sql` - Complete production schema (primary source of truth, ~212KB)
- After schema changes, export updated metadata from Supabase to `supabase/exports/tables.json`
- Run `node scripts/generate-ai-context.cjs` to regenerate AI context files in `supabase/ai_context/`
- Apply migrations via Supabase SQL Editor or database client

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
- Storage bucket: `attachments` (must be created in Supabase Storage)
- Path pattern: `{entity}/{id}/{timestamp}_{filename}`
- **File size limit: 50 MB** (enforced in `fileAttachmentService.ts:43`)
- Metadata in `attachments` table with `created_by` field
- Link tables: `invoice_attachments`, `contract_attachments`, `payment_attachments`, `letter_attachments`
- Cascade deletion removes both storage and database records
- Universal component: `FileUploadBlock` (`src/components/common/`)
- Service: `fileAttachmentService.ts` (centralized upload/download/delete operations)
- Hook: `useFileAttachment.ts` (state management for file operations)
- Supported entity types: `invoice`, `payment`, `contract`, `material_request`, `letter`

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

#### Component Organization
**Naming Conventions**:
- Pages: `{Feature}Page.tsx` (e.g., `InvoicesPage.tsx`)
- Modals: `{Action}{Entity}Modal.tsx` (e.g., `AddContractModal.tsx`)
- Forms: `{Entity}Form.tsx` (e.g., `InvoiceForm.tsx`)
- Tables: `{Entity}Table.tsx` (e.g., `PaymentsTable.tsx`)
- Filters: `{Entity}Filters.tsx` (e.g., `LetterFilters.tsx`)

**Component Structure**:
- `components/common/` - Reusable UI components (FileUploadBlock, etc.)
- `components/{feature}/` - Feature-specific components grouped by domain:
  - `admin/` - Admin panel components (tabs for contractors, projects, roles, etc.)
  - `approvals/` - Approval workflow components
  - `contracts/` - Contract management components
  - `invoices/` - Invoice management components
  - `letters/` - Letter management components
  - `materialRequests/` - Material request components
  - `projects/` - Project-related components
- `Layout.tsx` - Main application layout with header, navigation
- `ProtectedRoute.tsx` - Route guard component

**Main Application Routes** (defined in `App.tsx`):
- `/login` - AuthPage (public)
- `/invoices` - InvoicesPage (protected)
- `/admin/*` - AdminPage with nested tabs (protected)
- `/approvals` - ApprovalsPage (protected)
- `/contracts` - ContractsPage (protected)
- `/material-requests` - MaterialRequestsPage (protected)
- `/project-budgets` - ProjectBudgetsPage (protected)
- `/letters` - LettersPage (protected)
- `/` - Redirects to `/login`

### TypeScript Configuration

Strict mode with:
- Target: ES2022
- Module: ESNext with bundler resolution
- No unused locals/parameters
- No unchecked side effects
- No fallthrough in switch cases

### Environment Configuration

Required `.env` (see `.env` file in root):
```
VITE_SUPABASE_URL=https://api-p1.fvds.ru
VITE_SUPABASE_ANON_KEY=[your_key]
```

**Important Notes**:
- Storage URL is automatically derived from `VITE_SUPABASE_URL` following the pattern `{SUPABASE_URL}/storage/v1/object/public/attachments/`
- Do not add separate `VITE_STORAGE_BUCKET` variable
- Supabase client is initialized in `src/lib/supabase.ts` with persistent session and auto-refresh enabled

### Windows Development Notes

This project is developed on Windows. Important considerations:
- Use forward slashes in file paths when possible for cross-platform compatibility
- Git line endings: Repository uses LF (`core.autocrlf=input` recommended)
- File operations: Use Node.js path utilities for path manipulation
- Bash scripts: May require Git Bash or WSL for execution (e.g., `scripts/generate-ai-context.cjs`)
- Database connection: Direct connection to remote Supabase instance (no localhost)

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