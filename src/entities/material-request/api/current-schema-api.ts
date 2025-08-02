import { supabase } from '@/shared/api';
import type { MaterialRequest, CreateMaterialRequestData, MaterialRequestFilters } from '@/shared/types';

export const materialRequestApi = {
  async getAll(filters?: MaterialRequestFilters) {
    let query = supabase
      .from('material_requests')
      .select(`
        *,
        projects(id, name, code),
        contractors(id, name, inn),
        payers(id, name, inn),
        responsible_persons(id, full_name, position),
        user_profiles!construction_manager_id(id, full_name, email, role_id, user_roles(id, code, name)),
        created_by_profile:user_profiles!created_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters?.constructionManagerId) {
      query = query.eq('construction_manager_id', filters.constructionManagerId);
    }

    if (filters?.contractorId) {
      query = query.eq('contractor_id', filters.contractorId);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`materials_description.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%,material_request_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching material requests:', error);
      throw error;
    }

    return data as MaterialRequest[];
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('material_requests')
      .select(`
        *,
        projects(id, name, code),
        contractors(id, name, inn),
        payers(id, name, inn),
        responsible_persons(id, full_name, position),
        user_profiles!construction_manager_id(id, full_name, email, role_id, user_roles(id, code, name))
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data as MaterialRequest;
  },

  async create(data: CreateMaterialRequestData) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data: newRequest, error } = await supabase
      .from('material_requests')
      .insert({
        ...data,
        created_by: user?.user?.id,
        status: 'draft',
      })
      .select(`
        *,
        projects(id, name, code),
        contractors(id, name, inn),
        payers(id, name, inn),
        responsible_persons(id, full_name, position),
        user_profiles!construction_manager_id(id, full_name, email, role_id, user_roles(id, code, name))
      `)
      .single();

    if (error) {
      console.error('Error creating material request:', error);
      throw error;
    }

    return newRequest as MaterialRequest;
  },

  async update(id: number, data: Partial<MaterialRequest>) {
    const { data: updated, error } = await supabase
      .from('material_requests')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        projects(id, name, code),
        contractors(id, name, inn),
        payers(id, name, inn),
        responsible_persons(id, full_name, position),
        user_profiles!construction_manager_id(id, full_name, email, role_id, user_roles(id, code, name))
      `)
      .single();

    if (error) {
      throw error;
    }

    return updated as MaterialRequest;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('material_requests')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async submitForApproval(id: number) {
    const { data, error } = await supabase
      .from('material_requests')
      .update({
        status: 'pending_manager',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        projects(id, name, code),
        contractors(id, name, inn),
        payers(id, name, inn),
        responsible_persons(id, full_name, position),
        user_profiles!construction_manager_id(id, full_name, email, role_id, user_roles(id, code, name))
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as MaterialRequest;
  },

  async approveByManager(id: number, approvedAmount: number, comment?: string) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('material_requests')
      .update({
        status: 'pending_director',
        approved_amount: approvedAmount,
        manager_approved_at: new Date().toISOString(),
        manager_approved_by: user?.user?.id,
        comment: comment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MaterialRequest;
  },

  async approveByDirector(id: number, comment?: string) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('material_requests')
      .update({
        status: 'approved',
        director_approved_at: new Date().toISOString(),
        director_approved_by: user?.user?.id,
        comment: comment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MaterialRequest;
  },

  async markAsPaid(id: number, _paidAmount: number, paymentDocumentId?: number) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('material_requests')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: user?.user?.id,
        payment_document_id: paymentDocumentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MaterialRequest;
  },
};