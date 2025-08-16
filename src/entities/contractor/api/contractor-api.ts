import { supabase } from '@/shared/api/supabase';
import type { Contractor } from '@/shared/types';

export const contractorApi = {
  /**
   * Fetch all active contractors
   */
  async getAll(): Promise<Contractor[]> {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('name');

    if (error) {
      console.error('Failed to fetch contractors:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get contractor by ID
   */
  async getById(id: number): Promise<Contractor | null> {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch contractor:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new contractor
   */
  async create(contractor: Partial<Omit<Contractor, 'id' | 'created_at'>>): Promise<Contractor> {
    // Ensure required fields are present
    if (!contractor.name || !contractor.inn) {
      throw new Error('Название и ИНН обязательны для создания поставщика');
    }

    const { data, error } = await supabase
      .from('contractors')
      .insert({
        name: contractor.name,
        inn: contractor.inn,
        created_by: contractor.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create contractor:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update an existing contractor
   */
  async update(id: number, updates: Partial<Omit<Contractor, 'id' | 'created_at'>>): Promise<Contractor> {
    const { data, error } = await supabase
      .from('contractors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update contractor:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a contractor (soft delete by setting is_active to false)
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('contractors')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Failed to delete contractor:', error);
      throw error;
    }
  },
};