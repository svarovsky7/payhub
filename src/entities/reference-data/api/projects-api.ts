import { supabase } from '@/shared/api';

export interface Project {
  id: number;
  name: string;
  code?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  code?: string;
}

export const projectsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  },

  async create(projectData: CreateProjectData) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  async update(id: number, projectData: Partial<CreateProjectData>) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...projectData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};