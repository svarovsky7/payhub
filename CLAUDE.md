# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React application built with Vite, TypeScript, and modern tooling for invoice management and payment processing.

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
- **TypeScript 5.8** - Type safety
- **Vite 7.1** - Build tool and dev server
- **ESLint 9** - Code quality
- **Ant Design 5** - UI components
- **Supabase** - Backend and authentication
- **React Router 7** - Routing

### Project Structure
```
src/
├── components/    # Reusable components (Layout, ProtectedRoute)
├── contexts/      # React contexts (AuthContext)
├── lib/          # External library configs (supabase.ts)
├── pages/        # Page components (AuthPage, InvoicesPage)
├── App.tsx       # Main application with routing
└── main.tsx      # Application entry point
```

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

### TypeScript Configuration
Configured with strict type checking in `tsconfig.app.json`:
- Target: ES2022
- Strict mode enabled
- No unused locals/parameters
- No unchecked side effects in imports

### Authentication
- Supabase Auth for user management
- User profiles stored in `user_profiles` table
- Session management handled by AuthContext

## Database Schema

The application uses PostgreSQL via Supabase with two main tables:
- `user_profiles` - User information linked to auth.users
- `invoices` - Invoice records with status tracking

Database initialization SQL is in `database.sql`.

## Environment Variables

Required in `.env` file:
```
VITE_SUPABASE_URL=http://31.128.51.210:8001
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STORAGE_BUCKET=http://31.128.51.210:8001/storage/v1

```

## Console Logging

**IMPORTANT**: When developing and debugging functionality, always add detailed logging to the browser console:

1. **Log main actions**:
   - Start and completion of CRUD operations
   - API data loading
   - User action handling (clicks, form submissions)
   - Component state changes

2. **Logging format**:
   ```javascript
   console.log('[ComponentName.methodName] Action description:', {
     parameter1: value1,
     parameter2: value2,
     // detailed debugging information
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
   // In hooks
   console.log('[useCreateInvoice] Creating invoice:', data);

   // In components
   console.log('[InvoiceCreate.handleSubmit] Submitting form:', values);

   // For errors
   console.error('[InvoiceCreate.handleSubmit] Invoice creation error:', error);
   ```

This simplifies debugging and helps quickly identify issues in production environments.

## Getting Started

1. Install dependencies: `npm install`
2. Configure Supabase credentials in `.env`
3. Run database migrations from `database.sql`
4. Start development: `npm run dev`