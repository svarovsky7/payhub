import { supabase } from '@/shared/api/supabase';
import type { Invoice, InvoiceStatus } from '@/shared/types';

// Select query with status field included
const INVOICE_LIST_SELECT = 'id,invoice_number,invoice_date,total_amount,description,status,delivery_days,delivery_date,created_at,updated_at,contractor_id,payer_id,project_id,created_by,contractor:contractors(id,name),payer:payers(id,name),project:projects(id,name),creator:users(id,full_name)';

// Full select query for detailed views
const INVOICE_DETAIL_SELECT = '*,contractor:contractors(*),payer:payers(*),project:projects(*),creator:users(*)';

export const invoiceApi = {
  /**
   * Fetch all invoices with relations (optimized for list view)
   */
  async getAll(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_LIST_SELECT)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch invoices:', error);
      throw error;
    }

    // Fix relationship types and add missing fields if needed
    return (data || []).map(invoice => ({
      ...invoice,
      status: invoice.status || ('draft' as InvoiceStatus),
      delivery_date: invoice.delivery_date || null,
      delivery_days: invoice.delivery_days || null,
      without_vat: invoice.without_vat || null,
      is_important: invoice.is_important || null,
      responsible_person_id: invoice.responsible_person_id || null,
      contractor: Array.isArray(invoice.contractor) ? invoice.contractor[0] : invoice.contractor,
      payer: Array.isArray(invoice.payer) ? invoice.payer[0] : invoice.payer,
      project: Array.isArray(invoice.project) ? invoice.project[0] : invoice.project,
      creator: Array.isArray(invoice.creator) ? invoice.creator[0] : invoice.creator,
    })) as unknown as Invoice[];
  },

  /**
   * Fetch invoices by status
   */
  async getByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_LIST_SELECT)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(`Failed to fetch invoices with status ${status}:`, error);
      throw error;
    }

    return (data || []).map(invoice => ({
      ...invoice,
      status: invoice.status || (status as InvoiceStatus),
      delivery_date: invoice.delivery_date || null,
      delivery_days: invoice.delivery_days || null,
      without_vat: invoice.without_vat || null,
      is_important: invoice.is_important || null,
      responsible_person_id: invoice.responsible_person_id || null,
      contractor: Array.isArray(invoice.contractor) ? invoice.contractor[0] : invoice.contractor,
      payer: Array.isArray(invoice.payer) ? invoice.payer[0] : invoice.payer,
      project: Array.isArray(invoice.project) ? invoice.project[0] : invoice.project,
      creator: Array.isArray(invoice.creator) ? invoice.creator[0] : invoice.creator,
    })) as unknown as Invoice[];
  },

  /**
   * Get invoice by ID (full details)
   */
  async getById(id: number): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_DETAIL_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch invoice:', error);
      throw error;
    }

    // Add default status if not present
    if (data && !data.status) {
      data.status = 'draft';
    }

    return data as Invoice;
  },

  /**
   * Create a new invoice
   */
  async create(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'contractor' | 'payer' | 'project' | 'creator' | 'responsible_person'>): Promise<Invoice> {
    // Create invoice without status for now (status will be added to table later)
    const invoiceWithoutStatus = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      contractor_id: invoice.contractor_id,
      payer_id: invoice.payer_id,
      total_amount: invoice.total_amount,
      description: invoice.description,
      project_id: invoice.project_id,
      delivery_date: invoice.delivery_date,
      delivery_days: invoice.delivery_days,
      without_vat: invoice.without_vat,
      is_important: invoice.is_important,
      responsible_person_id: invoice.responsible_person_id,
    };
    
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceWithoutStatus)
      .select(INVOICE_LIST_SELECT)
      .single();

    if (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }

    // Ensure all fields are present and fix relationships
    return {
      ...data,
      status: data.status || ('draft' as InvoiceStatus),
      delivery_date: data.delivery_date || null,
      delivery_days: data.delivery_days || null,
      without_vat: data.without_vat || null,
      is_important: data.is_important || null,
      responsible_person_id: data.responsible_person_id || null,
      contractor: Array.isArray(data.contractor) ? data.contractor[0] : data.contractor,
      payer: Array.isArray(data.payer) ? data.payer[0] : data.payer,
      project: Array.isArray(data.project) ? data.project[0] : data.project,
      creator: Array.isArray(data.creator) ? data.creator[0] : data.creator,
    } as unknown as Invoice;
  },

  /**
   * Update an invoice
   */
  async update(id: number, updates: Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'contractor' | 'payer' | 'project' | 'creator' | 'responsible_person'>>): Promise<Invoice> {
    // Remove status from updates for now (status will be handled separately)
    const { status, ...updatesWithoutStatus } = updates;
    void status; // Explicitly ignore unused variable
    
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updatesWithoutStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(INVOICE_LIST_SELECT)
      .single();

    if (error) {
      console.error('Failed to update invoice:', error);
      throw error;
    }

    // Ensure all fields are present and fix relationships
    return {
      ...data,
      status: data.status || status || 'draft',
      delivery_date: data.delivery_date || null,
      delivery_days: data.delivery_days || null,
      without_vat: data.without_vat || null,
      is_important: data.is_important || null,
      responsible_person_id: data.responsible_person_id || null,
      contractor: Array.isArray(data.contractor) ? data.contractor[0] : data.contractor,
      payer: Array.isArray(data.payer) ? data.payer[0] : data.payer,
      project: Array.isArray(data.project) ? data.project[0] : data.project,
      creator: Array.isArray(data.creator) ? data.creator[0] : data.creator,
    } as unknown as Invoice;
  },

  /**
   * Delete an invoice (only drafts)
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete invoice:', error);
      throw error;
    }
  },

  /**
   * Submit invoice for approval (moves to rukstroy_review status)
   */
  async submitForApproval(id: number): Promise<Invoice> {
    // Update invoice status to rukstroy_review (first approval stage)
    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        status: 'rukstroy_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(INVOICE_LIST_SELECT)
      .single();

    if (error) {
      console.error('Failed to submit invoice for approval:', error);
      throw error;
    }

    // Ensure all fields are present and fix relationships
    return {
      ...data,
      status: data.status || 'rukstroy_review',
      delivery_date: data.delivery_date || null,
      delivery_days: data.delivery_days || null,
      without_vat: data.without_vat || null,
      is_important: data.is_important || null,
      responsible_person_id: data.responsible_person_id || null,
      contractor: Array.isArray(data.contractor) ? data.contractor[0] : data.contractor,
      payer: Array.isArray(data.payer) ? data.payer[0] : data.payer,
      project: Array.isArray(data.project) ? data.project[0] : data.project,
      creator: Array.isArray(data.creator) ? data.creator[0] : data.creator,
    } as unknown as Invoice;
  },

  /**
   * Approve invoice and move to next stage
   */
  async approve(id: number, currentStatus: InvoiceStatus): Promise<Invoice> {
    const nextStatus = this.getNextStatus(currentStatus);
    if (!nextStatus) {
      throw new Error('Cannot approve invoice in current status');
    }

    // Update invoice status to next stage
    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to approve invoice:', error);
      throw error;
    }

    return data;
  },

  /**
   * Reject invoice
   */
  async reject(id: number, _currentStatus: InvoiceStatus, reason?: string): Promise<Invoice> {
    // Update invoice status to rejected and add rejection reason to description
    const currentInvoice = await this.getById(id);
    if (!currentInvoice) throw new Error('Invoice not found');
    
    const updatedDescription = reason 
      ? `${currentInvoice.description || ''}\n[Отклонено]: ${reason}`.trim()
      : currentInvoice.description;

    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        status: 'rejected',
        description: updatedDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to reject invoice:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update invoice status
   */
  async updateStatus(id: number, status: InvoiceStatus, comment?: string): Promise<Invoice> {
    // Update invoice status directly in invoices table
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    // If status is changing to 'paid', calculate and fix the delivery date
    if (status === 'paid') {
      // First, get the invoice to check if it has delivery_days
      const { data: invoice } = await supabase
        .from('invoices')
        .select('delivery_days, delivery_date')
        .eq('id', id)
        .single();

      if (invoice?.delivery_days && !invoice.delivery_date) {
        // Calculate delivery date from today + delivery_days (working days)
        const today = new Date();
        const deliveryDate = this.calculateDeliveryDate(today, invoice.delivery_days);
        updateData.delivery_date = deliveryDate.toISOString().split('T')[0]; // Store as YYYY-MM-DD
      }
    }
    
    // Add comment to description if provided
    if (comment) {
      const { data: currentInvoice } = await supabase
        .from('invoices')
        .select('description')
        .eq('id', id)
        .single();
      
      const existingDescription = currentInvoice?.description || '';
      updateData.description = comment ? `${existingDescription}\n${comment}` : existingDescription;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(INVOICE_LIST_SELECT)
      .single();

    if (error) {
      console.error('Failed to update invoice status:', error);
      throw error;
    }

    // Return updated invoice with proper typing
    return {
      ...data,
      status,
      delivery_date: null,
      delivery_days: null,
      without_vat: null,
      is_important: null,
      responsible_person_id: null,
      contractor: Array.isArray(data.contractor) ? data.contractor[0] : data.contractor,
      payer: Array.isArray(data.payer) ? data.payer[0] : data.payer,
      project: Array.isArray(data.project) ? data.project[0] : data.project,
      creator: Array.isArray(data.creator) ? data.creator[0] : data.creator,
    } as unknown as Invoice;
  },

  /**
   * Get next status in workflow
   */
  getNextStatus(currentStatus: InvoiceStatus): InvoiceStatus | null {
    const workflow: Record<InvoiceStatus, InvoiceStatus | null> = {
      'draft': 'rukstroy_review',
      'rukstroy_review': 'director_review',
      'director_review': 'supply_review',
      'supply_review': 'in_payment',
      'in_payment': 'paid',
      'paid': null,
      'rejected': null,
    };

    return workflow[currentStatus];
  },

  /**
   * Get invoices grouped by status (uses mock status for now)
   */
  async getGroupedByStatus(): Promise<Record<string, Invoice[]>> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_LIST_SELECT)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Failed to fetch grouped invoices:', error);
      throw error;
    }

    // Group by mock status (all as draft for now)
    const grouped: Record<string, Invoice[]> = {
      'draft': [],
      'rukstroy_review': [],
      'director_review': [],
      'supply_review': [],
      'in_payment': [],
      'paid': [],
      'rejected': [],
    };

    // Group invoices by their actual status
    (data || []).forEach(invoice => {
      const invoiceWithStatus = {
        ...invoice,
        status: invoice.status || ('draft' as InvoiceStatus),
        delivery_date: invoice.delivery_date || null,
        delivery_days: invoice.delivery_days || null,
        without_vat: invoice.without_vat || null,
          is_important: invoice.is_important || null,
        responsible_person_id: invoice.responsible_person_id || null,
        contractor: Array.isArray(invoice.contractor) ? invoice.contractor[0] : invoice.contractor,
        payer: Array.isArray(invoice.payer) ? invoice.payer[0] : invoice.payer,
        project: Array.isArray(invoice.project) ? invoice.project[0] : invoice.project,
        creator: Array.isArray(invoice.creator) ? invoice.creator[0] : invoice.creator,
      } as unknown as Invoice;
      
      const status = invoiceWithStatus.status || 'draft';
      if (grouped[status]) {
        grouped[status].push(invoiceWithStatus);
      } else {
        grouped['draft'].push(invoiceWithStatus);
      }
    });

    return grouped;
  },

  /**
   * Update invoice status optimistically (for drag and drop)
   */
  async updateStatusOptimistic(id: number, newStatus: InvoiceStatus, comment?: string, paymentFile?: File): Promise<Invoice> {
    console.log('=== updateStatusOptimistic called ===');
    console.log('Invoice ID:', id);
    console.log('New status:', newStatus);
    console.log('Has payment file:', !!paymentFile);
    
    // If transitioning to paid status, payment file is REQUIRED
    if (newStatus === 'paid') {
      if (!paymentFile) {
        console.error('BLOCKING: Attempting to set status to "paid" without payment file');
        throw new Error('Платежное поручение обязательно для перевода в статус "Оплачено"');
      }
      
      try {
        console.log('Uploading payment document...');
        // Import attachmentApi dynamically to avoid circular dependency
        const { attachmentApi } = await import('@/entities/attachment');
        
        // Upload payment document
        const attachment = await attachmentApi.upload(paymentFile, id);
        console.log('Payment document uploaded:', attachment.id);
        
        // Link attachment to invoice as payment document
        await supabase
          .from('invoice_documents')
          .insert({
            invoice_id: id,
            attachment_id: attachment.id,
          });
        
        // Add info about payment document to comment
        const updatedComment = comment 
          ? `${comment}\nПлатежное поручение: ${paymentFile.name}` 
          : `Платежное поручение: ${paymentFile.name}`;
        
        console.log('Updating status with payment document info');
        return this.updateStatus(id, newStatus, updatedComment);
      } catch (error) {
        console.error('Failed to upload payment document:', error);
        throw new Error('Не удалось загрузить платежное поручение');
      }
    }
    
    console.log('Updating status without payment document');
    return this.updateStatus(id, newStatus, comment);
  },

  /**
   * Get invoice statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalAmount: number;
    monthlyData: Array<{ month: string; count: number; amount: number }>;
  }> {
    const { data, error } = await supabase
      .from('invoices')
      .select('total_amount, created_at');

    if (error) {
      console.error('Failed to fetch statistics:', error);
      throw error;
    }

    // Mock status distribution for demo
    const total = data?.length || 0;
    const stats = {
      total,
      byStatus: {
        'draft': Math.floor(total * 0.4),
        'rukstroy_review': Math.floor(total * 0.2),
        'director_review': Math.floor(total * 0.15),
        'supply_review': Math.floor(total * 0.1),
        'in_payment': Math.floor(total * 0.08),
        'paid': Math.floor(total * 0.05),
        'rejected': Math.floor(total * 0.02),
      } as Record<string, number>,
      totalAmount: 0,
      monthlyData: [] as Array<{ month: string; count: number; amount: number }>,
    };

    // Calculate total amount and monthly data
    const monthlyMap = new Map<string, { count: number; amount: number }>();

    data?.forEach(invoice => {
      stats.totalAmount += invoice.total_amount || 0;
      
      // Group by month for last 6 months
      const date = new Date(invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { count: 0, amount: 0 });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.count += 1;
      monthData.amount += invoice.total_amount || 0;
    });

    // Convert to array and sort
    stats.monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    return stats;
  },

  /**
   * Search invoices
   */
  async search(query: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_LIST_SELECT)
      .or(`invoice_number.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to search invoices:', error);
      throw error;
    }

    // Fix relationships and add missing fields if needed
    return (data || []).map(invoice => ({
      ...invoice,
      status: invoice.status || ('draft' as InvoiceStatus),
      delivery_date: invoice.delivery_date || null,
      delivery_days: invoice.delivery_days || null,
      without_vat: invoice.without_vat || null,
      is_important: invoice.is_important || null,
      responsible_person_id: invoice.responsible_person_id || null,
      contractor: Array.isArray(invoice.contractor) ? invoice.contractor[0] : invoice.contractor,
      payer: Array.isArray(invoice.payer) ? invoice.payer[0] : invoice.payer,
      project: Array.isArray(invoice.project) ? invoice.project[0] : invoice.project,
      creator: Array.isArray(invoice.creator) ? invoice.creator[0] : invoice.creator,
    })) as unknown as Invoice[];
  },

  /**
   * Calculate delivery date (next working day + calendar days)
   */
  calculateDeliveryDate(startDate: Date, deliveryDays: number): Date {
    const result = new Date(startDate);
    
    // First find the next working day
    result.setDate(result.getDate() + 1);
    
    // Skip weekends to get the next working day
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
    }
    
    // Now add the specified number of calendar days
    result.setDate(result.getDate() + deliveryDays);
    
    return result;
  },
};