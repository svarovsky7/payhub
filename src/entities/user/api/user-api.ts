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
      .single();

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
      .single();

    if (error) {
      console.error('Failed to update user:', error);
      throw error;
    }

    return data;
  },

  async assignProjects(userId: string, projectIds: number[]): Promise<void> {
    // First, remove existing assignments
    const { error: deleteError } = await supabase
      .from('user_projects')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to remove existing project assignments:', deleteError);
      throw deleteError;
    }

    // Then add new assignments
    if (projectIds.length > 0) {
      const assignments = projectIds.map(projectId => ({
        user_id: userId,
        project_id: projectId,
      }));

      const { error: insertError } = await supabase
        .from('user_projects')
        .insert(assignments);

      if (insertError) {
        console.error('Failed to assign projects:', insertError);
        throw insertError;
      }
    }
  },

  async getUserProjects(userId: string): Promise<number[]> {
    const { data, error } = await supabase
      .from('user_projects')
      .select('project_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch user projects:', error);
      throw error;
    }

    return data?.map(item => item.project_id) || [];
  },
};