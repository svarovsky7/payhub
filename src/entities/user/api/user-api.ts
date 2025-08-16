import { supabase } from '@/shared/api/supabase';
import type { User } from '@/shared/types';

export const userApi = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: updates.full_name,
        project_id: updates.project_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to update user:', error);
      throw error;
    }

    if (!data) {
      throw new Error('User not found');
    }

    return data;
  },

  async assignProjects(userId: string, projectIds: number[]): Promise<void> {
    // Update user's project_id (can only be assigned to one project)
    const projectId = projectIds.length > 0 ? projectIds[0] : null;
    
    const { error } = await supabase
      .from('users')
      .update({ project_id: projectId })
      .eq('id', userId);

    if (error) {
      console.error('Failed to assign project:', error);
      throw error;
    }
  },

  async getUserProjects(userId: string): Promise<number[]> {
    const { data, error } = await supabase
      .from('users')
      .select('project_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch user project:', error);
      return [];
    }

    return data?.project_id ? [data.project_id] : [];
  },
};