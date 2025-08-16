# User References Migration

## Problem
The database had inconsistent foreign key references where some tables referenced `public.users` while ideally all user references should go through `auth.users` for consistency.

## Solution
This migration standardizes all user references to point to `auth.users`:

### Architecture
```
auth.users (Supabase Auth)
    ↓
public.users (Profile data, 1:1 relationship)
    ↓
All other tables reference auth.users directly
```

### Changes Made:
1. **public.users** - Now has proper foreign key to auth.users with CASCADE DELETE
2. **All created_by/uploaded_by fields** - Now reference auth.users directly
3. **New view `users_full`** - Combines auth and profile data for easy access

### Benefits:
- Single source of truth for user identity (auth.users)
- Consistent foreign key relationships
- Automatic cleanup on user deletion (CASCADE)
- Simplified user data access through users_full view

### Usage:
```sql
-- Get full user info
SELECT * FROM users_full WHERE id = 'user-uuid';

-- Join with user data
SELECT 
    i.*,
    u.full_name as creator_name
FROM invoices i
LEFT JOIN public.users u ON i.created_by = u.id;
```

### Migration Command:
```bash
# Run in Supabase SQL Editor or via CLI
psql -h your-db-host -U postgres -d postgres -f fix_user_references.sql
```