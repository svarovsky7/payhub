import { supabase } from '@/shared/api';
import type { 
  Invoice, 
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceFilters 
} from '@/shared/types';

class InvoiceApi {
  /**
   * Получить все счета с фильтрацией
   */
  async getAll(filters?: InvoiceFilters): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        contractors(id, name, inn),
        payers(id, name, inn),
        created_by_profile:user_profiles!created_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.invoice_number) {
      query = query.ilike('invoice_number', `%${filters.invoice_number}%`);
    }

    if (filters?.contractor_id) {
      query = query.eq('contractor_id', filters.contractor_id);
    }

    if (filters?.payer_id) {
      query = query.eq('payer_id', filters.payer_id);
    }

    if (filters?.date_from) {
      query = query.gte('invoice_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('invoice_date', filters.date_to);
    }

    if (filters?.amount_from) {
      query = query.gte('total_amount', filters.amount_from);
    }

    if (filters?.amount_to) {
      query = query.lte('total_amount', filters.amount_to);
    }

    if (filters?.search) {
      query = query.or(`
        invoice_number.ilike.%${filters.search}%,
        description.ilike.%${filters.search}%
      `);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Получить счет по ID
   */
  async getById(id: number): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contractors(id, name, inn),
        payers(id, name, inn),
        created_by_profile:user_profiles!created_by(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Не найдено
      }
      console.error('Error fetching invoice:', error);
      throw error;
    }

    return data;
  }

  /**
   * Создать новый счет
   */
  async create(invoiceData: CreateInvoiceData): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select(`
        *,
        contractors(id, name, inn),
        payers(id, name, inn),
        created_by_profile:user_profiles!created_by(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }

    return data;
  }

  /**
   * Обновить счет
   */
  async update(id: number, invoiceData: UpdateInvoiceData): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', id)
      .select(`
        *,
        contractors(id, name, inn),
        payers(id, name, inn),
        created_by_profile:user_profiles!created_by(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }

    return data;
  }

  /**
   * Удалить счет
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Получить счета по номеру заявки
   */
  async getByMaterialRequestId(materialRequestId: number): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('material_request_invoices')
      .select(`
        invoice_id,
        allocated_amount,
        invoices(
          *,
          contractors(id, name, inn),
          payers(id, name, inn)
        )
      `)
      .eq('material_request_id', materialRequestId);

    if (error) {
      console.error('Error fetching invoices by material request:', error);
      throw error;
    }

    return data?.map(item => ({
      ...item.invoices,
      allocated_amount: item.allocated_amount
    })) || [];
  }

  /**
   * Поиск счетов по номеру
   */
  async searchByNumber(invoiceNumber: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contractors(id, name, inn),
        payers(id, name, inn)
      `)
      .ilike('invoice_number', `%${invoiceNumber}%`)
      .limit(10);

    if (error) {
      console.error('Error searching invoices:', error);
      throw error;
    }

    return data || [];
  }
}

export const invoiceApi = new InvoiceApi();