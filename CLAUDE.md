# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PayHub - An invoice management and payment processing React application built with Vite and TypeScript. The application uses Supabase for backend services and authentication, with Ant Design components for the UI.

## Development Commands

```bash
npm run dev       # Start development server on http://localhost:5173
npm run build     # TypeScript check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

## Architecture

### Technology Stack
- **React 19.1** - UI framework
- **TypeScript 5.8** - Type safety with strict mode
- **Vite 7.1** - Build tool and dev server
- **ESLint 9** - Code quality
- **Ant Design 5** - UI components (localized to Russian)
- **Supabase** - Backend, authentication, and PostgreSQL database
- **React Router 7** - Client-side routing
- **Day.js** - Date manipulation library (with Russian locale)

### Project Structure
```
src/
├── components/
│   ├── admin/              # Admin panel tabs
│   │   ├── UsersTab.tsx
│   │   ├── RolesTab.tsx
│   │   ├── ProjectsTab.tsx
│   │   ├── ContractorsTab.tsx
│   │   ├── ContractorTypesTab.tsx
│   │   ├── InvoiceTypesTab.tsx
│   │   └── InvoiceStatusesTab.tsx
│   ├── invoices/           # Invoice components
│   │   ├── InvoiceFormModal.tsx    # Create invoice modal
│   │   └── InvoiceView.tsx         # View/edit invoice with tabs
│   ├── Layout.tsx          # Main app layout with navigation
│   └── ProtectedRoute.tsx  # Authentication guard
├── contexts/
│   └── AuthContext.tsx     # Authentication state management
├── lib/
│   └── supabase.ts         # Supabase client configuration
├── pages/
│   ├── AuthPage.tsx        # Login/registration
│   ├── InvoicesPage.tsx    # Invoice management
│   └── AdminPage.tsx       # Admin dashboard with tabs
├── utils/
│   ├── invoiceHelpers.ts   # Invoice calculations and date utilities
│   └── storageDebug.ts     # Storage debugging utilities
├── App.tsx                 # Main routing configuration
└── main.tsx               # Application entry point
```

### Routing Structure
- `/login` - Authentication page
- `/invoices` - Invoice management
- `/admin/*` - Admin panel with nested routes (users, roles, projects, contractors, etc.)
- `/` - Redirects to login

## Important Development Rules

### Code Organization
- **Maximum 600 lines per file** - Split larger files into smaller modules
- **No Row Level Security (RLS)** - Handle security in application layer, not database
- **Business logic in code** - Functions and triggers should be implemented in application code
- **Database functions only when necessary** - Create Supabase functions/triggers only with strong justification

### Database Approach
- Use direct queries without RLS policies
- Implement access control in the application layer
- Keep database schema simple and straightforward
- Avoid complex database-level logic
- All timestamps use `timestamp with time zone`
- `updated_at` columns are managed via database triggers

### TypeScript Configuration
Configured with strict type checking in `tsconfig.app.json`:
- Target: ES2022
- Strict mode enabled
- No unused locals/parameters
- No unchecked side effects in imports
- Module resolution: bundler mode
- JSX: react-jsx

### Authentication
- Supabase Auth for user management
- User profiles auto-created via `handle_new_user()` trigger
- User profiles stored in `user_profiles` table
- Session management handled by AuthContext
- Authentication required for all routes except `/login`

## Database Schema Reference Files

For all database-related queries (table structures, indexes, triggers, functions, enums, SQL examples), use **only** the following files in `supabase/ai_context`:
- `ai_tables_min.json` / `ai_tables_full.json` - Table definitions with columns, constraints, indexes
- `ai_relations.json` - Foreign key relationships between tables
- `ai_functions_min.json` / `ai_functions_full.json` - Database functions and procedures
- `ai_triggers_min.json` - Database triggers
- `ai_enums_min.json` - Enum type definitions
- `ai_examples.sql` - Example SQL queries and patterns
- `ai_manifest.json` - Schema manifest and metadata

**Important**: Never invent fields, functions, or triggers not present in these files. If information is insufficient, request an update to these files rather than making assumptions.

## Database Schema

PostgreSQL database via Supabase with the following core tables:

### Main Tables
- **user_profiles** - User information linked to auth.users
- **invoices** - Invoice records with status tracking
- **invoice_types** - Invoice type categories
- **invoice_statuses** - Invoice status definitions (default: draft)
- **projects** - Project management
- **contractors** - Contractor records with INN validation
- **contractor_types** - Contractor categories
- **roles** - User roles
- **user_projects** - Many-to-many relationship between users and projects
- **attachments** - File storage metadata
- **invoice_attachments** - Many-to-many relationship between invoices and attachments

### Database Features
- Auto-updating `updated_at` timestamps via triggers
- UUID generation for user-related tables
- Unique constraints on codes, emails, and INN
- Indexes on frequently queried columns
- Foreign key relationships maintained

Database schema is in `supabase/migrations/prod.sql`

## Environment Variables

Required in `.env` file:
```
VITE_SUPABASE_URL=http://31.128.51.210:8001
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STORAGE_BUCKET=http://31.128.51.210:8001/storage/v1
```

## Console Logging

When developing and debugging functionality, always add detailed logging to the browser console:

1. **Log main actions**:
   - Start and completion of CRUD operations
   - API data loading
   - User action handling (clicks, form submissions)
   - Component state changes

2. **Logging format**:
   ```javascript
   console.log('[ComponentName.methodName] Action description:', {
     parameter1: value1,
     parameter2: value2
   });
   ```

3. **Required logging locations**:
   - API requests and responses
   - Error handling
   - Form validation
   - File upload and processing
   - Navigation and routing
   - State store changes

4. **Logging examples**:
   ```javascript
   console.log('[useCreateInvoice] Creating invoice:', data);
   console.log('[InvoiceCreate.handleSubmit] Submitting form:', values);
   console.error('[InvoiceCreate.handleSubmit] Invoice creation error:', error);
   ```

## Key Integration Patterns

### File Upload and Storage
- Files are stored in Supabase Storage bucket `attachments`
- Storage path pattern: `invoices/{invoice_id}/{timestamp}_{filename}`
- File metadata tracked in `attachments` table
- Many-to-many relationship via `invoice_attachments` table
- Cascade deletion: invoice deletion removes all linked files

### Invoice Management
- Invoice creation modal: `InvoiceFormModal`
- Invoice view/edit: `InvoiceView` with tabbed interface
- Tabs include "Основная информация" and "Прикрепленные файлы"
- Tab routing persists in URL via query parameters
- VAT calculations: automatic based on amount and rate
- Delivery date calculations: supports working/calendar days

### UI/UX Patterns
- Floating action buttons for save/cancel operations
- Modal windows for file preview (images and PDFs)
- Russian localization throughout the interface
- Ant Design message component for notifications
- App.useApp() hook for React 19 modal compatibility

## Getting Started

1. Install dependencies: `npm install`
2. Configure Supabase credentials in `.env`
3. Run database migrations from `supabase/migrations/prod.sql`
4. Start development: `npm run dev`
5. Access at `http://localhost:5173`