import { supabase } from '@/shared/api/supabase';
import type { Payer } from '@/shared/types';

export const payerApi = {
  /**
   * Fetch all active payers
   */
  async getAll(): Promise<Payer[]> {
    const { data, error } = await supabase
      .from('payers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Failed to fetch payers:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get payer by ID
   */
  async getById(id: number): Promise<Payer | null> {
    const { data, error } = await supabase
      .from('payers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch payer:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new payer
   */
  async create(payer: Partial<Omit<Payer, 'id' | 'created_at'>>): Promise<Payer> {
    // Ensure required fields are present
    if (!payer.name || !payer.inn) {
      throw new Error('Название и ИНН обязательны для создания плательщика');
    }

    const { data, error } = await supabase
      .from('payers')
      .insert({
        name: payer.name,
        inn: payer.inn,
        created_by: payer.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create payer:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update an existing payer
   */
  async update(id: number, updates: Partial<Omit<Payer, 'id' | 'created_at'>>): Promise<Payer> {
    const { data, error } = await supabase
      .from('payers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update payer:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a payer (soft delete by setting is_active to false)
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('payers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Failed to delete payer:', error);
      throw error;
    }
  },
};