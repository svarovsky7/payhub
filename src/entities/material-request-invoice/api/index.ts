import { supabase } from '@/shared/api';
import type { 
  MaterialRequestInvoice, 
  CreateMaterialRequestInvoiceData,
  UpdateMaterialRequestInvoiceData,
  MaterialRequestInvoiceFilters 
} from '@/shared/types';

class MaterialRequestInvoiceApi {
  /**
   * Получить все связи с фильтрацией
   */
  async getAll(filters?: MaterialRequestInvoiceFilters): Promise<MaterialRequestInvoice[]> {
    let query = supabase
      .from('material_request_invoices')
      .select(`
        *,
        material_request:material_requests(
          id, 
          material_request_number, 
          materials_description, 
          requested_amount
        ),
        invoice:invoices(
          id, 
          invoice_number, 
          total_amount, 
          invoice_date
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.material_request_id) {
      query = query.eq('material_request_id', filters.material_request_id);
    }

    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching material request invoices:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Получить связи по ID заявки
   */
  async getByMaterialRequestId(materialRequestId: number): Promise<MaterialRequestInvoice[]> {
    return this.getAll({ material_request_id: materialRequestId });
  }

  /**
   * Получить связи по ID счета
   */
  async getByInvoiceId(invoiceId: number): Promise<MaterialRequestInvoice[]> {
    return this.getAll({ invoice_id: invoiceId });
  }

  /**
   * Создать новую связь
   */
  async create(linkData: CreateMaterialRequestInvoiceData): Promise<MaterialRequestInvoice> {
    const { data, error } = await supabase
      .from('material_request_invoices')
      .insert([linkData])
      .select(`
        *,
        material_request:material_requests(
          id, 
          material_request_number, 
          materials_description, 
          requested_amount
        ),
        invoice:invoices(
          id, 
          invoice_number, 
          total_amount, 
          invoice_date
        )
      `)
      .single();

    if (error) {
      console.error('Error creating material request invoice link:', error);
      throw error;
    }

    return data;
  }

  /**
   * Обновить связь
   */
  async update(id: number, linkData: UpdateMaterialRequestInvoiceData): Promise<MaterialRequestInvoice> {
    const { data, error } = await supabase
      .from('material_request_invoices')
      .update(linkData)
      .eq('id', id)
      .select(`
        *,
        material_request:material_requests(
          id, 
          material_request_number, 
          materials_description, 
          requested_amount
        ),
        invoice:invoices(
          id, 
          invoice_number, 
          total_amount, 
          invoice_date
        )
      `)
      .single();

    if (error) {
      console.error('Error updating material request invoice link:', error);
      throw error;
    }

    return data;
  }

  /**
   * Удалить связь
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('material_request_invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting material request invoice link:', error);
      throw error;
    }
  }

  /**
   * Удалить связь по заявке и счету
   */
  async deleteByIds(materialRequestId: number, invoiceId: number): Promise<void> {
    const { error } = await supabase
      .from('material_request_invoices')
      .delete()
      .eq('material_request_id', materialRequestId)
      .eq('invoice_id', invoiceId);

    if (error) {
      console.error('Error deleting material request invoice link by IDs:', error);
      throw error;
    }
  }

  /**
   * Связать заявку со счетом
   */
  async linkMaterialRequestToInvoice(
    materialRequestId: number, 
    invoiceId: number, 
    allocatedAmount?: number
  ): Promise<MaterialRequestInvoice> {
    return this.create({
      material_request_id: materialRequestId,
      invoice_id: invoiceId,
      allocated_amount: allocatedAmount,
    });
  }

  /**
   * Обновить выделенную сумму
   */
  async updateAllocatedAmount(
    materialRequestId: number, 
    invoiceId: number, 
    allocatedAmount: number
  ): Promise<MaterialRequestInvoice> {
    // Сначала находим связь
    const { data: link, error: findError } = await supabase
      .from('material_request_invoices')
      .select('id')
      .eq('material_request_id', materialRequestId)
      .eq('invoice_id', invoiceId)
      .single();

    if (findError || !link) {
      throw new Error('Material request invoice link not found');
    }

    return this.update(link.id, { allocated_amount: allocatedAmount });
  }

  /**
   * Получить сводную информацию по заявке
   */
  async getMaterialRequestSummary(materialRequestId: number): Promise<{
    total_allocated: number;
    invoices_count: number;
    invoices: Array<{
      id: number;
      invoice_number: string;
      total_amount: number;
      allocated_amount: number;
    }>;
  }> {
    const links = await this.getByMaterialRequestId(materialRequestId);
    
    const invoices = links.map(link => ({
      id: link.invoice?.id || 0,
      invoice_number: link.invoice?.invoice_number || '',
      total_amount: link.invoice?.total_amount || 0,
      allocated_amount: link.allocated_amount || 0,
    }));

    const total_allocated = invoices.reduce((sum, inv) => sum + inv.allocated_amount, 0);

    return {
      total_allocated,
      invoices_count: invoices.length,
      invoices,
    };
  }

  /**
   * Получить сводную информацию по счету
   */
  async getInvoiceSummary(invoiceId: number): Promise<{
    total_allocated: number;
    requests_count: number;
    remaining_amount: number;
    requests: Array<{
      id: number;
      material_request_number: string;
      materials_description: string;
      allocated_amount: number;
    }>;
  }> {
    const links = await this.getByInvoiceId(invoiceId);
    
    const requests = links.map(link => ({
      id: link.material_request?.id || 0,
      material_request_number: link.material_request?.material_request_number || '',
      materials_description: link.material_request?.materials_description || '',
      allocated_amount: link.allocated_amount || 0,
    }));

    const total_allocated = requests.reduce((sum, req) => sum + req.allocated_amount, 0);
    
    // Получаем общую сумму счета
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', invoiceId)
      .single();

    const invoice_total = invoice?.total_amount || 0;
    const remaining_amount = invoice_total - total_allocated;

    return {
      total_allocated,
      requests_count: requests.length,
      remaining_amount,
      requests,
    };
  }
}

export const materialRequestInvoiceApi = new MaterialRequestInvoiceApi();