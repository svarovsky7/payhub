import { supabase } from '@/shared/api';
import type { 
  MaterialRequestStatus, 
  CreateMaterialRequestStatusData,
  UpdateMaterialRequestStatusData 
} from '@/shared/types/material-request-status';

class MaterialRequestStatusApi {
  /**
   * Получить все статусы
   */
  async getAll(): Promise<MaterialRequestStatus[]> {
    const { data, error } = await supabase
      .from('material_request_statuses')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching material request statuses:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Получить только активные статусы
   */
  async getActive(): Promise<MaterialRequestStatus[]> {
    const { data, error } = await supabase
      .from('material_request_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching active material request statuses:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Получить статус по коду
   */
  async getByCode(code: string): Promise<MaterialRequestStatus | null> {
    const { data, error } = await supabase
      .from('material_request_statuses')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Не найдено
      }
      console.error('Error fetching material request status by code:', error);
      throw error;
    }

    return data;
  }

  /**
   * Создать новый статус
   */
  async create(statusData: CreateMaterialRequestStatusData): Promise<MaterialRequestStatus> {
    const { data, error } = await supabase
      .from('material_request_statuses')
      .insert([statusData])
      .select()
      .single();

    if (error) {
      console.error('Error creating material request status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Обновить статус
   */
  async update(id: number, statusData: UpdateMaterialRequestStatusData): Promise<MaterialRequestStatus> {
    const { data, error } = await supabase
      .from('material_request_statuses')
      .update(statusData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating material request status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Удалить статус
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('material_request_statuses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting material request status:', error);
      throw error;
    }
  }

  /**
   * Изменить статус заявки
   */
  async updateMaterialRequestStatus(requestId: number, statusCode: string): Promise<void> {
    const { error } = await supabase
      .from('material_requests')
      .update({ status: statusCode })
      .eq('id', requestId);

    if (error) {
      console.error('Error updating material request status:', error);
      throw error;
    }
  }
}

export const materialRequestStatusApi = new MaterialRequestStatusApi();