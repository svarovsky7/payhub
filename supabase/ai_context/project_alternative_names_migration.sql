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
