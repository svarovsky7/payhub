import { supabase } from '@/shared/api';
import type { MaterialRequest, CreateMaterialRequestData, MaterialRequestFilters } from '@/shared/types';

// Временный API для работы с существующей схемой БД
export const materialRequestApi = {
  async getAll(filters?: MaterialRequestFilters) {
    let query = supabase
      .from('material_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`materials_description.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching material requests:', error);
      throw error;
    }

    // Преобразуем данные из старой схемы в новую
    const transformedData = (data || []).map(item => ({
      id: item.id,
      project_id: 1, // Заглушка, т.к. в старой схеме нет проектов
      construction_manager_id: item.requested_by,
      contractor_id: 1, // Заглушка
      payer_id: 1, // Заглушка
      responsible_person_id: 1, // Заглушка
      material_request_number: item.id?.toString(),
      invoice_number: '',
      materials_description: item.description || item.title || '',
      amount: item.estimated_cost || 0,
      comment: item.notes || '',
      status: item.status || 'pending',
      created_at: item.created_at,
      created_by: item.requested_by,
      updated_at: item.updated_at,
    }));

    return transformedData as MaterialRequest[];
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('material_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    // Преобразуем данные
    const transformed = {
      id: data.id,
      project_id: 1,
      construction_manager_id: data.requested_by,
      contractor_id: 1,
      payer_id: 1,
      responsible_person_id: 1,
      material_request_number: data.id?.toString(),
      invoice_number: '',
      materials_description: data.description || data.title || '',
      amount: data.estimated_cost || 0,
      comment: data.notes || '',
      status: data.status || 'pending',
      created_at: data.created_at,
      created_by: data.requested_by,
      updated_at: data.updated_at,
    };

    return transformed as MaterialRequest;
  },

  async create(data: CreateMaterialRequestData) {
    const { data: user } = await supabase.auth.getUser();
    
    // Преобразуем данные из новой схемы в старую
    const { data: newRequest, error } = await supabase
      .from('material_requests')
      .insert({
        title: data.materials_description.substring(0, 50), // Обрезаем для заголовка
        description: data.materials_description,
        quantity: 1, // Заглушка
        unit: 'шт', // Заглушка
        status: 'pending',
        priority: 'medium',
        requested_by: user?.user?.id,
        notes: data.comment,
        estimated_cost: data.amount,
        supplier: '',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating material request:', error);
      throw error;
    }

    // Преобразуем обратно
    const transformed = {
      id: newRequest.id,
      project_id: data.project_id,
      construction_manager_id: data.construction_manager_id,
      contractor_id: data.contractor_id,
      payer_id: data.payer_id,
      responsible_person_id: data.responsible_person_id,
      material_request_number: newRequest.id?.toString(),
      invoice_number: data.invoice_number || '',
      materials_description: newRequest.description,
      amount: newRequest.estimated_cost,
      comment: newRequest.notes,
      status: newRequest.status,
      created_at: newRequest.created_at,
      created_by: newRequest.requested_by,
      updated_at: newRequest.updated_at,
    };

    return transformed as MaterialRequest;
  },

  async update(id: number, data: Partial<MaterialRequest>) {
    const updateData: any = {};
    
    if (data.materials_description) {
      updateData.title = data.materials_description.substring(0, 50);
      updateData.description = data.materials_description;
    }
    if (data.amount !== undefined) {
      updateData.estimated_cost = data.amount;
    }
    if (data.comment !== undefined) {
      updateData.notes = data.comment;
    }
    if (data.status) {
      updateData.status = data.status;
    }

    const { data: updated, error } = await supabase
      .from('material_requests')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
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
        status: 'pending',
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