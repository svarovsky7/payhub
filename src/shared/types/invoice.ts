export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date?: string;
  contractor_id: number;
  payer_id: number;
  total_amount: number;
  description?: string;
  attachment_path?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  
  // Связанные данные
  contractor?: {
    id: number;
    name: string;
    inn?: string;
  };
  payer?: {
    id: number;
    name: string;
    inn?: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CreateInvoiceData {
  invoice_number: string;
  invoice_date?: string;
  contractor_id: number;
  payer_id: number;
  total_amount: number;
  description?: string;
  attachment_path?: string;
}

export interface UpdateInvoiceData {
  invoice_number?: string;
  invoice_date?: string;
  contractor_id?: number;
  payer_id?: number;
  total_amount?: number;
  description?: string;
  attachment_path?: string;
}

export interface InvoiceFilters {
  invoice_number?: string;
  contractor_id?: number;
  payer_id?: number;
  date_from?: string;
  date_to?: string;
  amount_from?: number;
  amount_to?: number;
  search?: string;
}