import { supabase } from '@/shared/api';
import type { UserRoleEntity } from '@/shared/types';

export type { UserRoleEntity };

export const userRolesApi = {
  getAll: async (): Promise<UserRoleEntity[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching user roles:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  getById: async (id: number): Promise<UserRoleEntity | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      throw new Error(error.message);
    }

    return data;
  },

  getByCode: async (code: string): Promise<UserRoleEntity | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      console.error('Error fetching user role by code:', error);
      throw new Error(error.message);
    }

    return data;
  },
};