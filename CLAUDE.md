# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PayHub - Invoice management and payment processing React application built with Vite, TypeScript, and Supabase. The application features Russian localization and uses Ant Design components for the UI.

## Development Commands

```bash
npm run dev       # Start development server on http://localhost:5173
npm run build     # TypeScript check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
node scripts/generate-ai-context.cjs  # Regenerate database AI context files
```

## Testing

**Note**: No test framework is currently configured. Tests referenced in AGENTS.md (`npm test`, Vitest) are not yet implemented.

## Architecture

### Technology Stack
- **React 19.1** with React 19 compatibility patch for Ant Design
- **TypeScript 5.8** with strict type checking
- **Vite 7.1** build tool and dev server
- **Ant Design 5** UI components (Russian localized)
- **Supabase** backend services and PostgreSQL database
- **React Router 7** client-side routing
- **Day.js** date manipulation (Russian locale)

### Core Application Structure

#### Hooks Layer (`src/hooks/`)
- `useInvoiceManagement.ts` - Invoice CRUD operations with optimistic updates
- `usePaymentManagement.ts` - Payment operations for invoices
- `useApprovalManagement.ts` - Approval workflow management
- `useInvoiceForm.ts` - Form state management for invoice creation/editing
- `useMaterialRequestManagement.ts` - Material request operations

#### Services Layer (`src/services/`)
**Primary service files:**
- `invoiceOperations.ts` - Main invoice business logic and calculations
- `paymentOperations.ts` - Payment processing and allocation
- `approvalOperations.ts` - Approval workflow orchestration
- `employeeOperations.ts` - Employee management operations
- `contractOperations.ts` - Contract management
- `materialClassOperations.ts` - Material classification
- `materialRequestOperations.ts` - Material request management

**Modular service subdirectories:**
- `services/invoice/` - Invoice-specific operations split into modules:
  - `invoiceCrud.ts` - Create, read, update, delete operations
  - `invoiceStatus.ts` - Status calculation and management
  - `invoiceFiles.ts` - File attachment handling
  - `invoiceReferences.ts` - Reference data loading
- `services/approval/` - Approval workflow modules:
  - `approvalRoutes.ts` - Route configuration management
  - `approvalActions.ts` - Approval/rejection actions
  - `approvalProcess.ts` - Workflow process orchestration
  - `approvalQueries.ts` - Database queries for approvals

#### Utilities (`src/utils/`)
- `invoiceStatusCalculator.ts` - Invoice status computation based on payments
- `vatCalculator.ts` - VAT calculation utilities
- `invoiceFilters.ts` - Invoice filtering logic
- `invoiceHelpers.ts` - General invoice helper functions
- `storageDebug.ts` - Storage debugging utilities

#### Component Organization
- `components/admin/` - Admin panel tabs (users, roles, projects, contractors, approval routes)
- `components/invoices/` - Invoice management components with tabbed interface
- `components/materialRequests/` - Material request components (form modal, items table, view modal)
- `pages/` - Route-level components (AuthPage, InvoicesPage, ApprovalsPage, AdminPage, ContractsPage, MaterialRequestsPage)
- `contexts/AuthContext.tsx` - Authentication state management

### Routing Structure
- `/login` - Authentication
- `/invoices` - Invoice management
- `/approvals` - Approval workflows
- `/admin/*` - Admin panel with nested routes
- `/contracts` - Contract management
- `/material-requests` - Material requests
- `/` - Redirects to login

## Database Architecture

### Schema Reference Files
All database queries must reference the auto-generated context files in `supabase/ai_context/`:
- `ai_tables_min.json` / `ai_tables_full.json` - Table structures
- `ai_relations.json` - Foreign key relationships
- `ai_functions_min.json` / `ai_functions_full.json` - Database functions
- `ai_triggers_min.json` - Triggers
- `ai_enums_min.json` - Enum types
- `ai_examples.sql` - SQL query patterns
- `ai_manifest.json` - Schema metadata with file hashes

**Critical**:
- Never invent database fields or functions not present in these files
- These files are generated from `supabase/exports/` JSON files using `node scripts/generate-ai-context.cjs`
- Regenerate after any database schema changes to keep context synchronized

### Core Tables
- **user_profiles** - User information (UUID, linked to auth.users)
- **invoices** - Invoice records with status tracking and employee assignment
- **payments** - Payment records
- **invoice_payments** - Payment allocation to invoices
- **projects** - Project grouping for invoices
- **contractors** - Contractor records with INN validation
- **employees** - Employee directory with positions and departments
- **departments** - Organizational departments
- **positions** - Employee positions
- **approval_routes** - Approval workflows per invoice type
- **workflow_stages** - Approval route stages with sequential ordering
- **payment_approvals** - Active approval instances
- **approval_steps** - Approval action history
- **attachments** / **invoice_attachments** - File storage metadata with descriptions
- **material_requests** - Material request headers
- **material_request_items** - Line items for material requests

### Database Design Principles
- No Row Level Security (RLS) - security handled in application layer
- Auto-updating `updated_at` timestamps via triggers
- Cascade deletion for related records
- All timestamps use `timestamp with time zone`
- UUID for user-related tables, serial IDs for others

## TypeScript Configuration

Strict mode enabled in `tsconfig.app.json`:
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx
- No unused locals/parameters
- No unchecked side effects in imports

## Key Integration Patterns

### Invoice Status Management
Invoice statuses are automatically calculated based on:
1. Presence of payments
2. Payment amounts vs invoice totals
3. Manual status overrides
4. Approval workflow states

### Payment Allocation
- Multiple payments can be allocated to single invoice
- Single payment can be split across multiple invoices
- Automatic remaining amount calculation
- Overpayment handling

### File Upload System
- Supabase Storage bucket: `attachments`
- Path pattern: `invoices/{invoice_id}/{timestamp}_{filename}`
- Metadata tracked in `attachments` table
- Cascade deletion on invoice removal
- Support for images, PDFs, and documents

### Approval Workflows
- Configurable routes per invoice type
- Sequential stage ordering
- Sequential approval process
- Action history tracking
- Email notifications (when configured)

## UI/UX Patterns

### Component Patterns
- Modal forms for create/edit operations
- Drawer components for quick actions
- Tabbed interfaces with URL persistence
- Floating action buttons for save/cancel
- Inline expandable tables for related data

### Form Handling
- Ant Design Form with validation rules
- Optimistic updates for better UX
- Error boundary handling
- Loading states during operations

### Localization
- Russian language throughout
- Date formatting with Day.js Russian locale
- Currency formatting for RUB
- Localized validation messages

## Environment Configuration

Required `.env` variables:
```
VITE_SUPABASE_URL=http://31.128.51.210:8001
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STORAGE_BUCKET=http://31.128.51.210:8001/storage/v1
```

## Development Guidelines

### Code Organization Rules
- Maximum 600 lines per file
- Separation between hooks (React state) and services (business logic)
- Component-specific styles in separate CSS modules
- Shared utilities in `utils/` directory
- Follow patterns in existing components for consistency

### Database Development
- Implement business logic in application code, not database
- Use database functions/triggers only when necessary
- Direct queries without RLS policies
- Access control in application layer
- Always reference `supabase/ai_context/` files for schema information

## Status Management

### Payment Statuses
**IMPORTANT**: Only use these exact status IDs and names for payments throughout the codebase:
- **id=1** - `created` (Создан)
- **id=2** - `pending` (На согласовании)
- **id=3** - `approved` (В оплате)
- **id=4** - `paid` (Оплачен)
- **id=5** - `cancelled` (Отменён)

### Invoice Statuses
**IMPORTANT**: Only use these exact status IDs and names for invoices throughout the codebase:
- **id=1** - `draft` (Черновик)
- **id=2** - `pending` (На согласовании)
- **id=3** - `partial` (Частично оплачен)
- **id=4** - `paid` (Оплачен)
- **id=5** - `cancelled` (Отменен)

**Never use hardcoded status strings or incorrect IDs. Always reference these official definitions.**

## Key Architectural Patterns

### Service Modularization Pattern
When a service file exceeds 600 lines, it's split into a subdirectory with focused modules:
- Main service file (e.g., `invoiceOperations.ts`) remains for backward compatibility
- Subdirectory modules handle specific concerns (CRUD, status, files, etc.)
- Each module exports focused functions that the main file re-exports

### Hook-Service Separation
- **Hooks** (`src/hooks/`): Manage React state, handle UI interactions, call services
- **Services** (`src/services/`): Pure business logic, database operations, no React dependencies
- This separation enables testing business logic independently from UI

### Optimistic Updates Pattern
Invoice and payment operations use optimistic updates:
1. UI updates immediately with expected result
2. Database operation runs in background
3. On error, UI reverts to previous state
4. Implemented in hooks layer, not services

### Console Logging Pattern
```javascript
console.log('[ComponentName.methodName] Action:', {
  parameter1: value1,
  parameter2: value2
});
```

Required logging points:
- API requests/responses
- User actions (clicks, submissions)
- State changes
- Error handling
- File operations