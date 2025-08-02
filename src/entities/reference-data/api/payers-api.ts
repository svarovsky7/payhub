import { supabase } from '@/shared/api';

export interface Payer {
  id: number;
  name: string;
  inn?: string;
  created_at: string;
  created_by?: string;
}

export interface CreatePayerData {
  name: string;
  inn?: string;
}

export const payersApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('payers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Payer[];
  },

  async create(payerData: CreatePayerData) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('payers')
      .insert({
        ...payerData,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payer;
  },

  async update(id: number, payerData: Partial<CreatePayerData>) {
    const { data, error } = await supabase
      .from('payers')
      .update(payerData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Payer;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('payers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};