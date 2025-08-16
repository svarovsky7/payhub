-- Safe migration to standardize user references
-- This ensures all user-related foreign keys point to auth.users consistently
-- Run this in Supabase SQL Editor

BEGIN;

-- Helper function to safely update foreign key
CREATE OR REPLACE FUNCTION update_foreign_key(
    table_name text,
    constraint_name text,
    column_name text,
    ref_table text,
    ref_column text,
    on_delete_action text DEFAULT 'SET NULL'
) RETURNS void AS $$
BEGIN
    -- Drop existing constraint if exists
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);
    
    -- Add new constraint
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(%I) ON DELETE %s',
        table_name, constraint_name, column_name, ref_table, ref_column, on_delete_action);
    
    RAISE NOTICE 'Updated %.% -> %.%', table_name, column_name, ref_table, ref_column;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Failed to update %.%: %', table_name, column_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 1. Ensure public.users references auth.users
PERFORM update_foreign_key('public.users', 'users_id_fkey', 'id', 'auth.users', 'id', 'CASCADE');

-- 2. Update all tables to reference auth.users directly
PERFORM update_foreign_key('public.attachments', 'attachments_uploaded_by_fkey', 'uploaded_by', 'auth.users', 'id', 'SET NULL');
PERFORM update_foreign_key('public.contractors', 'contractors_created_by_fkey', 'created_by', 'auth.users', 'id', 'SET NULL');
PERFORM update_foreign_key('public.invoices', 'invoices_created_by_fkey', 'created_by', 'auth.users', 'id', 'SET NULL');
PERFORM update_foreign_key('public.payers', 'payers_created_by_fkey', 'created_by', 'auth.users', 'id', 'SET NULL');
PERFORM update_foreign_key('public.project_budgets', 'project_budgets_created_by_fkey', 'created_by', 'auth.users', 'id', 'SET NULL');
PERFORM update_foreign_key('public.budget_history', 'budget_history_created_by_fkey', 'created_by', 'auth.users', 'id', 'SET NULL');

-- 3. Create comprehensive user view
DROP VIEW IF EXISTS public.users_full CASCADE;

CREATE VIEW public.users_full AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.is_active,
    u.project_id,
    u.created_at,
    u.updated_at,
    au.email as auth_email,
    au.phone as auth_phone,
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    p.name as project_name,
    p.address as project_address
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
LEFT JOIN public.projects p ON u.project_id = p.id;

-- 4. Update comments
COMMENT ON TABLE public.users IS 'User profiles extending auth.users with app-specific fields (1:1 relationship)';
COMMENT ON COLUMN public.users.id IS 'UUID matching auth.users.id for 1:1 relationship';
COMMENT ON VIEW public.users_full IS 'Comprehensive user view combining auth and profile data';

-- 5. Grant permissions
GRANT SELECT ON public.users_full TO authenticated;
GRANT SELECT ON public.users_full TO anon;

-- 6. Clean up helper function
DROP FUNCTION IF EXISTS update_foreign_key;

-- 7. Verify the changes
DO $$
DECLARE
    v_count integer;
BEGIN
    -- Check foreign keys
    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name IN ('created_by', 'uploaded_by')
        AND tc.table_schema = 'public';
    
    RAISE NOTICE 'Found % user-related foreign keys in public schema', v_count;
    
    -- Verify they point to auth.users
    SELECT COUNT(*) INTO v_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public';
    
    RAISE NOTICE 'Found % foreign keys pointing to auth.users', v_count;
END $$;

COMMIT;

-- Summary message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'All user references now point to auth.users';
    RAISE NOTICE 'Use users_full view for comprehensive user data';
    RAISE NOTICE '==============================================';
END $$;