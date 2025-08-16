-- Simple migration to standardize user references
-- Run this in Supabase SQL Editor

-- 1. Update public.users to reference auth.users
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Update attachments table
ALTER TABLE public.attachments 
DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;

ALTER TABLE public.attachments 
ADD CONSTRAINT attachments_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Update contractors table
ALTER TABLE public.contractors 
DROP CONSTRAINT IF EXISTS contractors_created_by_fkey;

ALTER TABLE public.contractors 
ADD CONSTRAINT contractors_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Update invoices table
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Update payers table
ALTER TABLE public.payers 
DROP CONSTRAINT IF EXISTS payers_created_by_fkey;

ALTER TABLE public.payers 
ADD CONSTRAINT payers_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Update project_budgets table
ALTER TABLE public.project_budgets 
DROP CONSTRAINT IF EXISTS project_budgets_created_by_fkey;

ALTER TABLE public.project_budgets 
ADD CONSTRAINT project_budgets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Update budget_history table
ALTER TABLE public.budget_history 
DROP CONSTRAINT IF EXISTS budget_history_created_by_fkey;

ALTER TABLE public.budget_history 
ADD CONSTRAINT budget_history_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. Create comprehensive user view
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

-- 9. Update comments
COMMENT ON TABLE public.users IS 'User profiles extending auth.users with app-specific fields (1:1 relationship)';
COMMENT ON COLUMN public.users.id IS 'UUID matching auth.users.id for 1:1 relationship';
COMMENT ON VIEW public.users_full IS 'Comprehensive user view combining auth and profile data';

-- 10. Grant permissions
GRANT SELECT ON public.users_full TO authenticated;
GRANT SELECT ON public.users_full TO anon;

-- Verify the changes
DO $$
DECLARE
    v_count integer;
BEGIN
    -- Check how many foreign keys now point to auth.users
    SELECT COUNT(*) INTO v_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Found % foreign keys pointing to auth.users', v_count;
    RAISE NOTICE 'All user references now standardized';
    RAISE NOTICE '==============================================';
END $$;