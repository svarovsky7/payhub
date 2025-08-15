import { supabase } from '@/shared/api/supabase';
import type { Project } from '@/shared/types';

export const projectApi = {
  /**
   * Fetch all active projects
   */
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');

    if (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get project by ID
   */
  async getById(id: number): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch project:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new project
   */
  async create(project: Partial<Omit<Project, 'id'>>): Promise<Project> {
    if (!project.name) {
      throw new Error('Название проекта обязательно');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        address: project.address || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update an existing project
   */
  async update(id: number, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update project:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a project (soft delete by setting is_active to false)
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  },
};