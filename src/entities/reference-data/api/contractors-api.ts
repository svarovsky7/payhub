import { supabase } from '@/shared/api';

export interface Contractor {
  id: number;
  name: string;
  inn?: string;
  kpp?: string;
  address?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateContractorData {
  name: string;
  inn?: string;
  kpp?: string;
  address?: string;
}

export const contractorsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Contractor[];
  },

  async create(contractorData: CreateContractorData) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('contractors')
      .insert({
        ...contractorData,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Contractor;
  },

  async update(id: number, contractorData: Partial<CreateContractorData>) {
    const { data, error } = await supabase
      .from('contractors')
      .update(contractorData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Contractor;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('contractors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};