import { supabase } from '@/shared/api';
import type { 
  InvoiceApproval, 
  CreateInvoiceApprovalData,
  UpdateInvoiceApprovalData,
  ManagerApprovalData,
  DirectorApprovalData,
  AccountantProcessingData,
  ApprovalFilters 
} from '@/shared/types';

class InvoiceApprovalApi {
  /**
   * Получить все согласования с фильтрацией
   */
  async getAll(filters?: ApprovalFilters): Promise<InvoiceApproval[]> {
    let query = supabase
      .from('invoice_approvals')
      .select(`
        *,
        invoice:invoices(id, invoice_number, total_amount),
        status:material_request_statuses(id, code, name, color),
        manager_profile:user_profiles!manager_approved_by(id, full_name, email),
        director_profile:user_profiles!director_approved_by(id, full_name, email),
        accountant_profile:user_profiles!accountant_processed_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id);
    }

    if (filters?.status_id) {
      query = query.eq('status_id', filters.status_id);
    }

    if (filters?.manager_approved_by) {
      query = query.eq('manager_approved_by', filters.manager_approved_by);
    }

    if (filters?.director_approved_by) {
      query = query.eq('director_approved_by', filters.director_approved_by);
    }

    if (filters?.accountant_processed_by) {
      query = query.eq('accountant_processed_by', filters.accountant_processed_by);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoice approvals:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Получить согласование по ID счета
   */
  async getByInvoiceId(invoiceId: number): Promise<InvoiceApproval | null> {
    const { data, error } = await supabase
      .from('invoice_approvals')
      .select(`
        *,
        invoice:invoices(id, invoice_number, total_amount),
        status:material_request_statuses(id, code, name, color),
        manager_profile:user_profiles!manager_approved_by(id, full_name, email),
        director_profile:user_profiles!director_approved_by(id, full_name, email),
        accountant_profile:user_profiles!accountant_processed_by(id, full_name, email)
      `)
      .eq('invoice_id', invoiceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Не найдено
      }
      console.error('Error fetching invoice approval:', error);
      throw error;
    }

    return data;
  }

  /**
   * Создать новое согласование
   */
  async create(approvalData: CreateInvoiceApprovalData): Promise<InvoiceApproval> {
    const { data, error } = await supabase
      .from('invoice_approvals')
      .insert([approvalData])
      .select(`
        *,
        invoice:invoices(id, invoice_number, total_amount),
        status:material_request_statuses(id, code, name, color)
      `)
      .single();

    if (error) {
      console.error('Error creating invoice approval:', error);
      throw error;
    }

    return data;
  }

  /**
   * Обновить согласование
   */
  async update(id: number, approvalData: UpdateInvoiceApprovalData): Promise<InvoiceApproval> {
    const { data, error } = await supabase
      .from('invoice_approvals')
      .update(approvalData)
      .eq('id', id)
      .select(`
        *,
        invoice:invoices(id, invoice_number, total_amount),
        status:material_request_statuses(id, code, name, color),
        manager_profile:user_profiles!manager_approved_by(id, full_name, email),
        director_profile:user_profiles!director_approved_by(id, full_name, email),
        accountant_profile:user_profiles!accountant_processed_by(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating invoice approval:', error);
      throw error;
    }

    return data;
  }

  /**
   * Согласование руководителем строительства
   */
  async approveByManager(invoiceId: number, approvalData: ManagerApprovalData): Promise<InvoiceApproval> {
    const updateData: UpdateInvoiceApprovalData = {
      manager_approved_amount: approvalData.approved_amount,
      manager_comment: approvalData.comment,
    };

    // Сначала пытаемся обновить существующее согласование
    let approval = await this.getByInvoiceId(invoiceId);
    
    if (!approval) {
      // Если согласования нет, создаем новое
      approval = await this.create({ invoice_id: invoiceId });
    }

    // Добавляем системные поля
    const finalUpdateData = {
      ...updateData,
      manager_approved_at: new Date().toISOString(),
      manager_approved_by: (await supabase.auth.getUser()).data.user?.id,
    };

    return this.update(approval.id, finalUpdateData);
  }

  /**
   * Согласование директором
   */
  async approveByDirector(invoiceId: number, approvalData: DirectorApprovalData): Promise<InvoiceApproval> {
    const approval = await this.getByInvoiceId(invoiceId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    const updateData = {
      director_comment: approvalData.comment,
      director_approved_at: new Date().toISOString(),
      director_approved_by: (await supabase.auth.getUser()).data.user?.id,
    };

    return this.update(approval.id, updateData);
  }

  /**
   * Обработка бухгалтером
   */
  async processPayment(invoiceId: number, processingData: AccountantProcessingData): Promise<InvoiceApproval> {
    const approval = await this.getByInvoiceId(invoiceId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    const updateData = {
      payment_document_id: processingData.payment_document_id,
      paid_amount: processingData.paid_amount,
      accountant_comment: processingData.comment,
      accountant_processed_at: new Date().toISOString(),
      accountant_processed_by: (await supabase.auth.getUser()).data.user?.id,
    };

    return this.update(approval.id, updateData);
  }

  /**
   * Отметить как оплаченное
   */
  async markAsPaid(invoiceId: number, paidAmount: number): Promise<InvoiceApproval> {
    const approval = await this.getByInvoiceId(invoiceId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    const updateData = {
      paid_at: new Date().toISOString(),
      paid_amount: paidAmount,
    };

    return this.update(approval.id, updateData);
  }

  /**
   * Отклонить на любом этапе
   */
  async reject(invoiceId: number, comment: string, rejectedBy: 'manager' | 'director'): Promise<InvoiceApproval> {
    const approval = await this.getByInvoiceId(invoiceId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    const currentUser = (await supabase.auth.getUser()).data.user?.id;
    const updateData: UpdateInvoiceApprovalData = {};

    if (rejectedBy === 'manager') {
      updateData.manager_comment = comment;
      updateData.manager_approved_by = currentUser;
    } else {
      updateData.director_comment = comment;
      updateData.director_approved_by = currentUser;
    }

    // Устанавливаем статус "отклонено"
    const rejectedStatus = await supabase
      .from('material_request_statuses')
      .select('id')
      .eq('code', 'rejected')
      .single();

    if (rejectedStatus.data) {
      updateData.status_id = rejectedStatus.data.id;
    }

    return this.update(approval.id, updateData);
  }

  /**
   * Получить согласования, ожидающие действий пользователя
   */
  async getPendingForUser(userId: string, role: string): Promise<InvoiceApproval[]> {
    let query = supabase
      .from('invoice_approvals')
      .select(`
        *,
        invoice:invoices(id, invoice_number, total_amount),
        status:material_request_statuses(id, code, name, color)
      `);

    // Фильтруем по ролям и статусам
    if (role === 'CONSTRUCTION_MANAGER') {
      query = query.is('manager_approved_at', null);
    } else if (role === 'DIRECTOR') {
      query = query.not('manager_approved_at', 'is', null)
                   .is('director_approved_at', null);
    } else if (role === 'ACCOUNTANT') {
      query = query.not('director_approved_at', 'is', null)
                   .is('accountant_processed_at', null);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }

    return data || [];
  }
}

export const invoiceApprovalApi = new InvoiceApprovalApi();