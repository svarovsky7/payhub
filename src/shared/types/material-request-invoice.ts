export interface MaterialRequestInvoice {
  id: number;
  material_request_id: number;
  invoice_id: number;
  allocated_amount?: number;
  created_at: string;
  
  // Связанные данные
  material_request?: {
    id: number;
    material_request_number?: string;
    materials_description: string;
    requested_amount: number;
  };
  invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
    invoice_date?: string;
  };
}

export interface CreateMaterialRequestInvoiceData {
  material_request_id: number;
  invoice_id: number;
  allocated_amount?: number;
}

export interface UpdateMaterialRequestInvoiceData {
  allocated_amount?: number;
}

export interface MaterialRequestInvoiceFilters {
  material_request_id?: number;
  invoice_id?: number;
}