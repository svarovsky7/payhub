# PayHub Project Definition

## Overview
PayHub is a construction materials procurement and payment approval system designed to streamline the workflow between procurement officers, construction managers, directors, and accountants. The system manages material requests, approval workflows, and payment tracking for construction projects.

## Role
You are a **Senior Full-Stack Engineer** (React + TypeScript + Supabase) working on the **PayHub** payment approval system for construction project materials management.

## 1. Architecture (Feature-Sliced Design)

Following the proven FSD architecture from GarantHUB:
- Maintain the canonical folder tree: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`
- Each slice exposes its public API via **`index.ts`**; internals stay private
- Use absolute imports via `@/`
- Co-locate UI and business logic inside the same slice

## 2. Tech Stack

- **Frontend**: TypeScript in strict mode, React 18, Vite bundler
- **UI Library**: Ant Design as the single design system; wrapper components in **`shared/ui`**
- **Data Layer**: TanStack Query (react-query) + Supabase (RLS disabled as per requirement)
- **Routing**: React Router v6 with type-safe navigation
- **State Management**: Zustand for auth store, React Query for server state
- **Notifications**: Notistack for user feedback
- **Date handling**: Day.js for date formatting
- **File handling**: Excel import/export with xlsx library

## 3. Core Business Logic

### User Roles
1. **PROCUREMENT_OFFICER** (Снабженец) - Creates and manages material requests
2. **CONSTRUCTION_MANAGER** (Руководитель строительства) - Approves payment amounts
3. **DIRECTOR** (Генеральный директор) - Final approval for payments
4. **ACCOUNTANT** (Бухгалтер) - Processes approved payments and uploads payment documents

### Material Request Fields
```typescript
interface MaterialRequest {
  id: number;
  project_id: number;                    // 1. Проект
  construction_manager_id: string;       // 2. Руководитель строительства
  contractor_id: number;                 // 3. Контрагент
  payer_id: number;                     // 4. Плательщик
  responsible_person_id: number;         // 5. МОЛ (Материально ответственное лицо)
  material_request_number: string;       // 6. Заявка на материалы
  invoice_number: string;                // 7. Счет на оплату
  materials_description: string;         // 8. Описание материалов
  amount: number;                        // 9. Сумма к оплате
  comment?: string;                      // 10. Комментарий
  
  // Approval workflow fields
  approved_amount?: number;              // Сумма согласованная руководителем
  manager_approved_at?: string;
  manager_approved_by?: string;
  director_approved_at?: string;
  director_approved_by?: string;
  payment_document_id?: number;          // Платежное поручение
  paid_at?: string;
  paid_by?: string;
  
  // Metadata
  created_at: string;
  created_by: string;
  updated_at: string;
  status: 'draft' | 'pending_manager' | 'pending_director' | 'approved' | 'paid';
}
```

### Workflow States
1. **draft** - Created by procurement officer, can be edited
2. **pending_manager** - Submitted for construction manager approval
3. **pending_director** - Manager approved, awaiting director approval
4. **approved** - Director approved, ready for payment
5. **paid** - Payment processed by accountant

## 4. Database Schema

```sql
-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractors table
CREATE TABLE contractors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  inn VARCHAR(12),
  kpp VARCHAR(9),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Payers table (legal entities that pay)
CREATE TABLE payers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  inn VARCHAR(12),
  kpp VARCHAR(9),
  bank_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Responsible persons (МОЛ)
CREATE TABLE responsible_persons (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles with roles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('PROCUREMENT_OFFICER', 'CONSTRUCTION_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'ADMIN')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project assignments (which managers can see which projects)
CREATE TABLE user_projects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id INTEGER REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Main material requests table
CREATE TABLE material_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) NOT NULL,
  construction_manager_id UUID REFERENCES auth.users(id) NOT NULL,
  contractor_id INTEGER REFERENCES contractors(id) NOT NULL,
  payer_id INTEGER REFERENCES payers(id) NOT NULL,
  responsible_person_id INTEGER REFERENCES responsible_persons(id) NOT NULL,
  material_request_number VARCHAR(100),
  invoice_number VARCHAR(100),
  materials_description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  comment TEXT,
  
  -- Approval workflow
  approved_amount DECIMAL(15,2),
  manager_approved_at TIMESTAMPTZ,
  manager_approved_by UUID REFERENCES auth.users(id),
  director_approved_at TIMESTAMPTZ,
  director_approved_by UUID REFERENCES auth.users(id),
  payment_document_id INTEGER,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  
  -- Status and metadata
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_manager', 'pending_director', 'approved', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments table for documents
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Link attachments to material requests
CREATE TABLE material_request_attachments (
  id SERIAL PRIMARY KEY,
  material_request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
  attachment_id INTEGER REFERENCES attachments(id) ON DELETE CASCADE,
  attachment_type VARCHAR(50) CHECK (attachment_type IN ('material_request', 'invoice', 'payment_document', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_request_id, attachment_id)
);

-- Custom fields configuration (for dynamic columns)
CREATE TABLE custom_fields (
  id SERIAL PRIMARY KEY,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select')),
  field_label VARCHAR(255) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER,
  options JSONB, -- For select fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Custom field values for material requests
CREATE TABLE material_request_custom_values (
  id SERIAL PRIMARY KEY,
  material_request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
  custom_field_id INTEGER REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_request_id, custom_field_id)
);

-- Indexes for performance
CREATE INDEX idx_material_requests_project ON material_requests(project_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_manager ON material_requests(construction_manager_id);
CREATE INDEX idx_material_requests_created ON material_requests(created_at DESC);
CREATE INDEX idx_user_projects_user ON user_projects(user_id);
CREATE INDEX idx_user_projects_project ON user_projects(project_id);
CREATE INDEX idx_custom_values_request ON material_request_custom_values(material_request_id);
```

## 5. Key Features

### 1. Excel Import/Export
- Import material requests from Excel templates
- Export filtered data to Excel
- Maintain formatting and data validation

### 2. Dynamic Table Configuration
- Add/remove custom fields via admin interface
- Reorder columns
- Set field validation rules

### 3. Approval Workflow
- Construction managers see only their project requests
- Directors and accountants see all company requests
- Email notifications for status changes

### 4. Document Management
- Upload material request documents
- Upload invoices
- Upload payment confirmations
- File preview capabilities

### 5. Real-time Updates
- Live status updates
- Collaborative editing prevention
- Optimistic UI updates

## 6. UI/UX Guidelines

### Table View
- Sortable and filterable columns
- Inline editing for procurement officers
- Status badges with colors
- Row actions based on permissions
- Pagination for large datasets

### Forms
- Multi-step form for material request creation
- Auto-save drafts
- Field validation
- File drag-and-drop

### Dashboard
- Summary cards by status
- Project-wise breakdown
- Pending approvals count
- Recent activities

## 7. Security & Permissions

### Role-based Access
```typescript
const permissions = {
  PROCUREMENT_OFFICER: [
    'create_request',
    'edit_draft_request',
    'delete_draft_request',
    'submit_request',
    'view_all_requests',
    'export_data',
    'import_excel'
  ],
  CONSTRUCTION_MANAGER: [
    'view_project_requests',
    'approve_request_amount',
    'add_comment',
    'export_data'
  ],
  DIRECTOR: [
    'view_all_requests',
    'approve_payment',
    'reject_request',
    'export_data'
  ],
  ACCOUNTANT: [
    'view_approved_requests',
    'mark_as_paid',
    'upload_payment_document',
    'export_data'
  ],
  ADMIN: ['*'] // All permissions
};
```

### Data Access Rules
- Construction managers only see requests for their assigned projects
- Other roles see all company data
- Audit trail for all actions

## 8. Performance Considerations

### Database Optimization
- Composite indexes for common queries
- Materialized views for dashboard stats
- Pagination for large result sets

### Frontend Optimization
- Virtual scrolling for large tables
- Lazy loading for file previews
- Debounced search inputs
- Memoized expensive calculations

## 9. Integration Points

### Email Notifications
- Request submitted for approval
- Request approved by manager
- Request approved by director
- Payment processed

### Excel Integration
- Template generation
- Data validation on import
- Error reporting
- Batch operations

### File Storage
- Supabase Storage for documents
- Automatic file compression
- Virus scanning before storage
- Secure download URLs

## 10. Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build

# Run tests
npm run test
```

## 11. Testing Strategy

### Unit Tests
- Business logic functions
- Validation rules
- Permission checks

### Integration Tests
- API endpoints
- Database operations
- File uploads

### E2E Tests
- Complete workflows
- Role-based scenarios
- Error handling

## 12. Deployment Considerations

### Environment Variables
```env
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your project's anon key>
VITE_STORAGE_BUCKET=<your STORAGE BUCKET URL>

```

### Database Migrations
- Version control for schema changes
- Rollback procedures
- Data migration scripts

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- User analytics
- Database query performance

## 14. Current Project Structure

```
src/
├── app/
│   ├── providers/          # App providers (Auth, Query, Notifications)
│   └── router/            # Application routing
├── pages/
│   └── MaterialRequestsPage/  # Main material requests page
├── entities/
│   ├── material-request/   # Material request entity
│   │   └── api/           # API layer
│   └── reference-data/    # Reference data entity
│       └── api/           # Reference data API
├── shared/
│   ├── api/               # Supabase client configuration
│   ├── config/            # Environment configuration
│   ├── store/             # Zustand auth store
│   ├── types/             # TypeScript type definitions
│   └── ui/                # Shared UI components (message wrapper)
```

## 15. Database Files Structure

```
/project-root/
├── database_structure.json    # Current DB structure export
```

## Critical Success Factors

1. **Intuitive workflow** - Users should understand the approval process
2. **Fast performance** - Sub-second response times with React Query caching
3. **Data integrity** - Centralized user management prevents data inconsistencies
4. **Audit trail** - Complete history tracking via material_request_history
5. **Mobile responsive** - Ant Design responsive components
6. **Excel compatibility** - Working export, import planned
7. **Scalability** - Optimized indexes and query patterns