-- Fix user references to use auth.users consistently
-- This migration ensures all user references point to auth.users table
-- Run this migration in Supabase SQL Editor

-- First, ensure public.users has proper foreign key to auth.users
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey') THEN
        ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
    END IF;
    
    -- Add the correct foreign key constraint
    ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated public.users foreign key to auth.users';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating public.users: %', SQLERRM;
END $$;

-- Now update all other tables to reference auth.users directly instead of public.users

-- 1. Update attachments table
ALTER TABLE public.attachments
DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update contractors table
ALTER TABLE public.contractors
DROP CONSTRAINT IF EXISTS contractors_created_by_fkey;

ALTER TABLE public.contractors
ADD CONSTRAINT contractors_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Update invoices table
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Update payers table
ALTER TABLE public.payers
DROP CONSTRAINT IF EXISTS payers_created_by_fkey;

ALTER TABLE public.payers
ADD CONSTRAINT payers_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Update project_budgets table
ALTER TABLE public.project_budgets
DROP CONSTRAINT IF EXISTS project_budgets_created_by_fkey;

ALTER TABLE public.project_budgets
ADD CONSTRAINT project_budgets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Update budget_history table
ALTER TABLE public.budget_history
DROP CONSTRAINT IF EXISTS budget_history_created_by_fkey;

ALTER TABLE public.budget_history
ADD CONSTRAINT budget_history_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment to clarify the relationship
COMMENT ON TABLE public.users IS 'User profiles linked to auth.users - extends auth with app-specific fields';
COMMENT ON COLUMN public.users.id IS 'UUID matching auth.users.id - ensures 1:1 relationship';

-- Create or replace view to simplify user data access
CREATE OR REPLACE VIEW public.users_full AS
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

COMMENT ON VIEW public.users_full IS 'Comprehensive user view combining auth and profile data';

-- Grant appropriate permissions
GRANT SELECT ON public.users_full TO authenticated;
GRANT SELECT ON public.users_full TO anon;