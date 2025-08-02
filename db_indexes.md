# Database Indexes Summary - PayHub

## Overview
This document provides a comprehensive overview of all database indexes in the PayHub system based on the actual database export from the updated architecture.

## Index Statistics
- **Total indexes**: 72 indexes
- **Primary key indexes**: 16  
- **Unique constraint indexes**: 10
- **Performance indexes**: 46
- **Tables indexed**: 16

## Tables and Their Indexes

### attachments (3 indexes)
- `attachments_pkey` - **PRIMARY KEY** `id`
- `idx_attachments_created_at` - `created_at`
- `idx_attachments_created_by` - `created_by`

### contractors (3 indexes)
- `contractors_pkey` - **PRIMARY KEY** `id`
- `idx_contractors_inn` - `inn`
- `idx_contractors_name` - `name`

### custom_fields (2 indexes)
- `custom_fields_pkey` - **PRIMARY KEY** `id`
- `custom_fields_field_name_key` - **UNIQUE** `field_name`

### invoice_approvals (10 indexes)
- `invoice_approvals_pkey` - **PRIMARY KEY** `id`
- `invoice_approvals_invoice_id_key` - **UNIQUE** `invoice_id`
- `idx_invoice_approvals_invoice_id` - `invoice_id`
- `idx_invoice_approvals_status_id` - `status_id`
- `idx_invoice_approvals_manager_approved_by` - `manager_approved_by`
- `idx_invoice_approvals_director_approved_by` - `director_approved_by`
- `idx_invoice_approvals_accountant_processed_by` - `accountant_processed_by`
- `idx_invoice_approvals_manager_approved_at` - `manager_approved_at`
- `idx_invoice_approvals_director_approved_at` - `director_approved_at`
- `idx_invoice_approvals_paid_at` - `paid_at`
- `idx_invoice_approvals_status_updated` - **COMPOSITE** `(status_id, updated_at)`

### invoices (8 indexes)
- `invoices_pkey` - **PRIMARY KEY** `id`
- `invoices_invoice_number_contractor_id_key` - **UNIQUE** `(invoice_number, contractor_id)`
- `idx_invoices_contractor_id` - `contractor_id`
- `idx_invoices_payer_id` - `payer_id`
- `idx_invoices_invoice_date` - `invoice_date`
- `idx_invoices_total_amount` - `total_amount`
- `idx_invoices_created_at` - `created_at`
- `idx_invoices_number` - `invoice_number`
- `idx_invoices_contractor_date` - **COMPOSITE** `(contractor_id, invoice_date)`

### material_request_attachments (4 indexes)
- `material_request_attachments_pkey` - **PRIMARY KEY** `id`
- `idx_material_request_attachments_request_id` - `material_request_id`
- `idx_material_request_attachments_attachment_id` - `attachment_id`
- `idx_material_request_attachments_type` - `attachment_type`

### material_request_custom_values (2 indexes)
- `material_request_custom_values_pkey` - **PRIMARY KEY** `id`
- `material_request_custom_value_material_request_id_custom_fi_key` - **UNIQUE** `(material_request_id, custom_field_id)`

### material_request_history (5 indexes)
- `material_request_history_pkey` - **PRIMARY KEY** `id`
- `idx_material_request_history_request_id` - `material_request_id`
- `idx_material_request_history_action` - `action`
- `idx_material_request_history_created_at` - `created_at`
- `idx_material_request_history_created_by` - `created_by`

### material_request_invoices (4 indexes)
- `material_request_invoices_pkey` - **PRIMARY KEY** `id`
- `material_request_invoices_material_request_id_invoice_id_key` - **UNIQUE** `(material_request_id, invoice_id)`
- `idx_material_request_invoices_request_id` - `material_request_id`
- `idx_material_request_invoices_invoice_id` - `invoice_id`

### material_request_statuses (4 indexes)
- `material_request_statuses_pkey` - **PRIMARY KEY** `id`
- `material_request_statuses_code_key` - **UNIQUE** `code`
- `idx_material_request_statuses_code` - `code`
- `idx_material_request_statuses_order_index` - `order_index`

### material_requests (10 indexes)
- `material_requests_pkey` - **PRIMARY KEY** `id`
- `idx_material_requests_project_id` - `project_id`
- `idx_material_requests_construction_manager_id` - `construction_manager_id`
- `idx_material_requests_responsible_person_id` - `responsible_person_id`
- `idx_material_requests_priority` - `priority`
- `idx_material_requests_delivery_deadline` - `delivery_deadline`
- `idx_material_requests_created_by` - `created_by`
- `idx_material_requests_created_at` - `created_at`
- `idx_material_requests_number` - `material_request_number`
- `idx_material_requests_manager_project` - **COMPOSITE** `(construction_manager_id, project_id)`

### payers (3 indexes)
- `payers_pkey` - **PRIMARY KEY** `id`
- `idx_payers_inn` - `inn`
- `idx_payers_name` - `name`

### projects (3 indexes)
- `projects_pkey` - **PRIMARY KEY** `id`
- `projects_code_key` - **UNIQUE** `code`
- `idx_projects_code` - `code`

### responsible_persons (1 index)
- `responsible_persons_pkey` - **PRIMARY KEY** `id`

### system_settings (2 indexes)
- `system_settings_pkey` - **PRIMARY KEY** `id`
- `system_settings_setting_key_key` - **UNIQUE** `setting_key`

### user_profiles (5 indexes)
- `user_profiles_pkey` - **PRIMARY KEY** `id`
- `user_profiles_email_key` - **UNIQUE** `email`
- `idx_user_profiles_role_id` - `role_id`
- `idx_user_profiles_email` - `email`
- `idx_user_profiles_is_active` - `is_active`

### user_projects (4 indexes)
- `user_projects_pkey` - **PRIMARY KEY** `id`
- `user_projects_user_id_project_id_key` - **UNIQUE** `(user_id, project_id)`
- `idx_user_projects_user_id` - `user_id`
- `idx_user_projects_project_id` - `project_id`

### user_roles (3 indexes)
- `user_roles_pkey` - **PRIMARY KEY** `id`
- `user_roles_code_key` - **UNIQUE** `code`
- `idx_user_roles_code` - `code`

## Index Types Analysis

### Primary Key Indexes (16)
Every table has a primary key index for unique identification:
- All main entity tables have `*_pkey` indexes on `id` column
- Essential for fast single-record lookups and joins

### Unique Constraint Indexes (10)
Business logic constraints that also serve as performance indexes:
- **Invoice uniqueness**: `(invoice_number, contractor_id)` - prevents duplicate invoices
- **User email uniqueness**: `email` - ensures unique user identification
- **Role code uniqueness**: `code` - unique role identifiers (PROCUREMENT_OFFICER, etc.)
- **Project code uniqueness**: `code` - unique project codes
- **System setting uniqueness**: `setting_key` - prevents duplicate settings
- **Junction table uniqueness**: Composite keys for many-to-many relationships

### Performance Indexes (46)
Optimized for common query patterns:

#### Workflow-Based Indexes
- **Material Request filtering**:
  - `construction_manager_id` - Manager's assigned requests
  - `project_id` - Project-based filtering
  - `priority` - Priority-based filtering
  - `delivery_deadline` - Deadline-based queries
  - `created_at` - Temporal filtering

#### Approval Workflow Indexes
- **Invoice Approvals**:
  - `manager_approved_by` - Manager approval tracking
  - `director_approved_by` - Director approval tracking
  - `accountant_processed_by` - Accountant processing tracking
  - `manager_approved_at` - Approval date queries
  - `director_approved_at` - Director approval date queries
  - `paid_at` - Payment date queries
  - `status_id` - Status-based filtering

#### Financial Indexes
- **Invoices**:
  - `contractor_id` - Contractor-based queries
  - `payer_id` - Payer-based queries
  - `total_amount` - Amount-based filtering
  - `invoice_date` - Date-based queries
  - `invoice_number` - Number-based lookups

#### Reference Data Indexes
- **Contractors/Payers**: `inn` and `name` for search functionality
- **User Management**: `role_id` and `is_active` for access control

### Composite Indexes (3)
Multi-column indexes for complex queries:
1. `idx_material_requests_manager_project` - `(construction_manager_id, project_id)`
2. `idx_invoices_contractor_date` - `(contractor_id, invoice_date)`
3. `idx_invoice_approvals_status_updated` - `(status_id, updated_at)`

## Query Patterns Optimized

### 1. Material Request Management
- **Manager Dashboard**: Fast filtering by `construction_manager_id`
- **Project View**: Efficient filtering by `project_id`
- **Priority Management**: Quick priority-based queries
- **Deadline Tracking**: Delivery deadline filtering
- **Creator History**: User's own requests via `created_by`

### 2. Approval Workflow
- **Pending Approvals**: Status-based filtering with `status_id`
- **Approval History**: Date-based queries with approval timestamps
- **Approver Tracking**: Fast lookups by approver IDs
- **Status Updates**: Composite index on `(status_id, updated_at)`

### 3. Financial Management
- **Invoice Processing**: Contractor and payer-based filtering
- **Amount Analysis**: Total amount-based queries
- **Payment Tracking**: Payment date and status queries
- **Duplicate Prevention**: Unique constraint on invoice numbers per contractor

### 4. Audit and History
- **Change Tracking**: Material request history by request ID
- **Action Filtering**: History by action type
- **Temporal Analysis**: Created date-based queries
- **User Activity**: History by user (created_by)

### 5. Reference Data Access
- **Search Functionality**: Name and INN-based searches for contractors/payers
- **User Management**: Role-based access control
- **Project Management**: Code-based project lookups

## Performance Characteristics

### Excellent Coverage ✅
- **Primary key lookups**: All tables optimized
- **Foreign key joins**: All FK columns indexed
- **Workflow queries**: Manager, project, status filtering
- **Search operations**: Name and identifier-based searches
- **Audit trails**: Comprehensive history indexing
- **Business constraints**: Unique constraints prevent data issues

### Storage Efficiency
- **Multi-purpose indexes**: Unique constraints serve as performance indexes
- **Composite indexes**: Single index covers multiple query patterns
- **Selective indexing**: Only commonly queried columns indexed

## Monitoring Queries

### Index Usage Analysis
```sql
-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as "Times Used",
    idx_tup_read as "Tuples Read",
    idx_tup_fetch as "Tuples Fetched"
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
ORDER BY idx_scan DESC;

-- Identify unused indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
```

### Performance Monitoring
```sql
-- Check table access patterns
SELECT 
    schemaname,
    tablename,
    seq_scan as "Sequential Scans",
    seq_tup_read as "Sequential Tuples Read",
    idx_scan as "Index Scans",
    idx_tup_fetch as "Index Tuples Fetched"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- Index efficiency ratio
SELECT 
    schemaname,
    tablename,
    indexname,
    CASE 
        WHEN idx_tup_read = 0 THEN 0
        ELSE round((idx_tup_fetch::numeric / idx_tup_read) * 100, 2)
    END as "Efficiency %"
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND idx_tup_read > 0
ORDER BY "Efficiency %" DESC;
```

## Maintenance Recommendations

### Regular Tasks
1. **ANALYZE** tables after bulk operations
2. **Monitor** index usage statistics
3. **VACUUM** tables regularly for optimal performance
4. **REINDEX** if index bloat detected

### Performance Tuning
1. Monitor slow queries with `pg_stat_statements`
2. Check for missing indexes on frequently filtered columns
3. Evaluate composite index opportunities for common query patterns
4. Consider partial indexes for selective filtering

### Capacity Planning
Current index structure supports:
- **Small to medium scale**: 10K-100K material requests
- **Multi-user concurrent access**: Role-based filtering optimized
- **Complex reporting**: Financial and audit queries optimized
- **Real-time workflow**: Approval process queries optimized

## Architecture Benefits

### Data Integrity
- Unique constraints prevent duplicate data
- Foreign key indexes ensure referential integrity
- Composite unique constraints maintain business rules

### Query Performance
- All common access patterns indexed
- Workflow-specific optimizations in place
- Financial reporting queries optimized
- Audit trail queries efficient

### Scalability
- Index structure supports growth
- Composite indexes reduce index count
- Foreign key indexes support complex joins
- Status-based filtering optimized for workflow

## Notes
- All indexes follow PostgreSQL naming conventions (`idx_` prefix)
- Unique constraints serve dual purpose as performance indexes
- Current structure optimized for PayHub's approval workflow
- Index monitoring should be implemented in production
- Regular maintenance required for optimal performance