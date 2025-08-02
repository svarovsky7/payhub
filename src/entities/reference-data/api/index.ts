import { supabase } from '@/shared/api';

export const referenceDataApi = {
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getContractors() {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getPayers() {
    const { data, error } = await supabase
      .from('payers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getResponsiblePersons() {
    const { data, error } = await supabase
      .from('responsible_persons')
      .select('*')
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  async getConstructionManagers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role')
      .eq('role', 'CONSTRUCTION_MANAGER')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  async getUserProfiles() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, is_active')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },
};