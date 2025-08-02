# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

- **Frontend**: TypeScript in strict mode, React 19, Vite 7 bundler
- **UI Library**: Ant Design 5.22+ as the single design system; wrapper components in **`shared/ui`**
- **Data Layer**: TanStack Query (react-query) 5.61+ + Supabase 2.46+ (RLS disabled as per requirement)
- **Routing**: React Router v6.28+ with type-safe navigation  
- **State Management**: Zustand 5.0+ for auth store, React Query for server state
- **Notifications**: Notistack 3.0+ for user feedback
- **Date handling**: Day.js 1.11+ for date formatting
- **File handling**: Excel import/export with xlsx 0.18+ library
- **Linting**: ESLint 9.30+ with TypeScript ESLint 8.35+
- **Formatting**: Prettier 3.3+ for code formatting

## 3. Core Business Logic

### User Roles
1. **PROCUREMENT_OFFICER** (Снабженец) - Creates and manages material requests
2. **CONSTRUCTION_MANAGER** (Руководитель строительства) - Approves payment amounts
3. **DIRECTOR** (Генеральный директор) - Final approval for payments
4. **ACCOUNTANT** (Бухгалтер) - Processes approved payments and uploads payment documents
5. **ADMIN** (Администратор) 

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

**🚨 КРИТИЧЕСКИ ВАЖНО**: Все данные о структуре базы данных, индексах и функциях строго берутся из следующих файлов:

### 📁 Справочные файлы базы данных:
- **`database_structure.json`** - полная актуальная структура БД (экспорт всех таблиц, колонок и типов данных)
- **`db_indexes.md`** - документация по всем индексам, их назначению и оптимизации  
- **`db_functions.md`** - документация по всем функциям БД и их исходному коду

### ⚠️ Обязательное правило:
При работе с базой данных **ВСЕГДА** используйте информацию из указанных файлов:
- Структуру таблиц смотрите в `database_structure.json`
- Индексы и их назначение смотрите в `db_indexes.md` 
- Функции и их код смотрите в `db_functions.md`
- **НЕ** полагайтесь на устаревшую информацию из других источников

### Основные таблицы (из database_structure.json):
- `material_requests` - основная таблица заявок на материалы
- `material_requests_with_details` - представление с объединенными данными
- `material_request_history` - история изменений заявок (аудит)
- `projects` - проекты
- `contractors` - контрагенты  
- `payers` - плательщики
- `responsible_persons` - материально ответственные лица
- `user_profiles` - профили пользователей
- `user_roles` - роли пользователей
- `user_projects` - связь пользователей и проектов
- `attachments` - файлы и документы
- `material_request_attachments` - связь заявок и файлов
- `custom_fields` - настраиваемые поля
- `material_request_custom_values` - значения настраиваемых полей
- `system_settings` - системные настройки

### Ключевые отличия от исходного дизайна:
- Роли пользователей вынесены в отдельную таблицу `user_roles` с связью по `role_id`
- Добавлена таблица `material_request_history` для аудита изменений
- Добавлено представление `material_requests_with_details` для удобных выборок
- Добавлена таблица `system_settings` для конфигурации

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

# Build (TypeScript compilation + Vite build)
npm run build

# Linting (ESLint with TypeScript rules)
npm run lint

# Code formatting (Prettier)
npm run format

# Preview production build
npm run preview
```

### Testing Commands
Currently no test scripts are configured in package.json. When implementing tests, add:
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Test coverage: `npm run test:coverage`

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

**Note**: No `.env` files are currently committed to the repository. Create `.env.local` for development environment variables.

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
│   ├── AdminPage/         # Admin management interface
│   ├── ApprovalsPage/     # Approval workflow interface
│   ├── MaterialRequestsPage/  # Main material requests page
│   ├── LoginPage/         # Authentication
│   ├── ProfilePage/       # User profile management
│   └── RegisterPage/      # User registration
├── entities/
│   ├── material-request/   # Material request entity
│   │   └── api/           # API layer
│   ├── reference-data/    # Reference data entity (projects, contractors, payers)
│   │   └── api/           # Reference data API
│   ├── user-roles/        # User roles management
│   │   └── api/           # User roles API
│   └── user/              # User entity
├── features/
│   └── auth/              # Authentication features
├── shared/
│   ├── api/               # Supabase client configuration
│   ├── config/            # Environment configuration
│   ├── store/             # Zustand auth store
│   ├── types/             # TypeScript type definitions
│   ├── ui/                # Shared UI components (AppLayout, ProtectedRoute, message)
│   └── utils/             # Utility functions
├── widgets/               # Complex UI widgets (currently empty)
└── utils/                 # Debug utilities
```

## 15. Database Files Structure

**🗂️ Критически важные справочные файлы базы данных:**

```
/project-root/
├── database_structure.json    # 📊 Полная структура БД (таблицы, колонки, типы данных)
├── db_indexes.md              # 🚀 Документация по всем индексам и оптимизации
└── db_functions.md            # ⚙️ Документация по всем функциям БД и их коду
```

### 📋 Описание файлов:

#### `database_structure.json`
- **Назначение**: Экспорт всех таблиц, колонок и их типов данных из реальной Supabase БД
- **Использование**: Единственный источник правды о структуре базы данных
- **Обновление**: При изменениях схемы БД

#### `db_indexes.md` 
- **Назначение**: Полная документация всех индексов, их назначения и рекомендаций по оптимизации
- **Содержание**: Анализ производительности, покрытие запросов, рекомендации по новым индексам
- **Использование**: При оптимизации запросов и планировании производительности

#### `db_functions.md`
- **Назначение**: Документация всех функций PostgreSQL с их исходным кодом
- **Содержание**: Назначение функций, параметры, примеры использования, интеграция с приложением
- **Использование**: При работе с триггерами, RPC вызовами и бизнес-логикой БД

### ⚠️ Важное правило:
**ВСЕГДА** используйте эти файлы как единственный источник правды о базе данных. Не полагайтесь на устаревшую информацию из других источников.

## Critical Success Factors

1. **Intuitive workflow** - Users should understand the approval process
2. **Fast performance** - Sub-second response times with React Query caching
3. **Data integrity** - Centralized user management prevents data inconsistencies
4. **Audit trail** - Complete history tracking via material_request_history
5. **Mobile responsive** - Ant Design responsive components
6. **Excel compatibility** - Working export, import planned
7. **Scalability** - Optimized indexes and query patterns

## 16. Key Architectural Notes

### Path Aliases
The project uses TypeScript path mapping configured in both `tsconfig.app.json` and `vite.config.ts`:
- `@/` → `src/`
- `@/app/*` → `src/app/*`  
- `@/pages/*` → `src/pages/*`
- `@/widgets/*` → `src/widgets/*`
- `@/features/*` → `src/features/*`
- `@/entities/*` → `src/entities/*`
- `@/shared/*` → `src/shared/*`

### TypeScript Configuration
- **Strict mode enabled** with additional linting rules
- React JSX transform configured (`jsx: "react-jsx"`)
- ES2022 target with DOM libraries
- No emit mode (handled by Vite)
- Build info file: `./node_modules/.tmp/tsconfig.app.tsbuildinfo`

### API Pattern
Material request API (`src/entities/material-request/api/current-schema-api.ts`) demonstrates the standard pattern:
- Complex Supabase joins for relational data
- Role-based filtering
- Workflow state management methods
- Error handling with console logging

### ESLint Configuration
- Uses flat config format (`eslint.config.js`) with TypeScript ESLint
- Includes React hooks and React refresh plugins
- Configured for browser globals and ES2020
- Ignores `dist` directory
- Strict TypeScript linting with recommended rules

### Current Development Status
The application is actively developed with a solid foundation:
- **Routing**: Complete React Router structure with protected routes
- **Authentication**: Fully implemented with Zustand store and Supabase auth
- **Entity Layer**: Material requests, reference data, and user roles APIs implemented
- **Admin Interface**: Management interfaces for projects, contractors, payers
- **User Workflow**: Multiple page components for different user types (approvals, material requests)
- **Database**: Full schema implemented with detailed structure in `database_structure.json`

### Key Implementation Details
- Material request API with full CRUD operations and approval workflow methods
- Complex Supabase queries with table joins for relational data
- Role-based access control with user roles stored in separate table
- Comprehensive type definitions in `@/shared/types`

## 17. Important Instructions

### Code Quality Requirements
- **ALWAYS** run `npm run lint` after making changes to ensure code quality
- Use `npm run format` to maintain consistent code formatting
- TypeScript strict mode is enabled - all type errors must be resolved
- Follow the established FSD architecture patterns
- Additional TypeScript strictness: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

### File Creation Guidelines
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- Follow the existing project structure and naming conventions

### Development Workflow
- **ALWAYS** use absolute imports with the configured path aliases (@/, @/app/, etc.)
- Maintain the public API pattern with index.ts files in each slice
- Follow Ant Design component patterns for UI consistency
- Use React Query for all server state management
- Use Zustand only for client-side auth state
- When working with the material request API, follow the established pattern in `current-schema-api.ts`
- All Supabase queries should include proper error handling and console logging