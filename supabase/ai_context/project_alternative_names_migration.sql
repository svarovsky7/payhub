-- Migration: Add project alternative names support
-- Description: Create table for storing alternative names for projects
-- Created: 2025-10-23

-- Create table for project alternative names
CREATE TABLE IF NOT EXISTS public.project_alternative_names (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  alternative_name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_alternative_names_project_id ON public.project_alternative_names(project_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_alternative_names_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_alternative_names_updated_at
BEFORE UPDATE ON public.project_alternative_names
FOR EACH ROW
EXECUTE FUNCTION update_project_alternative_names_updated_at();

-- Example data (optional)
-- INSERT INTO public.project_alternative_names (project_id, alternative_name, sort_order)
-- VALUES
--   (1, 'Проект Альтернативное имя 1', 0),
--   (1, 'Проект Alt Name', 1),
--   (2, 'Второй проект алиас', 0);

-- Migration for Contractor Alternative Names
-- Execute this script to add support for multiple contractor names per INN

-- Drop existing table if it has issues
DROP TABLE IF EXISTS public.contractor_alternative_names CASCADE;

-- Create contractor alternative names table with correct structure
CREATE TABLE public.contractor_alternative_names (
  id BIGSERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  alternative_name CHARACTER VARYING NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_id, alternative_name)
);

-- Add primary_name_id to contractors table (drop and recreate if exists)
ALTER TABLE public.contractors 
DROP COLUMN IF EXISTS primary_name_id;

ALTER TABLE public.contractors 
ADD COLUMN primary_name_id BIGINT REFERENCES public.contractor_alternative_names(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_contractor_alternative_names_contractor_id 
ON public.contractor_alternative_names(contractor_id);

CREATE INDEX idx_contractor_alternative_names_is_primary 
ON public.contractor_alternative_names(contractor_id, is_primary);

-- Migrate existing contractor names to alternative_names table
-- This adds each existing contractor's name as the primary alternative name
INSERT INTO public.contractor_alternative_names (contractor_id, alternative_name, is_primary)
SELECT id, name, true
FROM public.contractors c
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_alternative_names 
  WHERE contractor_id = c.id
)
ON CONFLICT (contractor_id, alternative_name) DO NOTHING;

-- Update contractors.primary_name_id to point to the primary alternative name
UPDATE public.contractors c
SET primary_name_id = (
  SELECT id FROM public.contractor_alternative_names 
  WHERE contractor_id = c.id AND is_primary = true
  LIMIT 1
)
WHERE primary_name_id IS NULL;