export interface InvoiceApproval {
  id: number;
  invoice_id: number;
  
  // Согласование руководителем строительства
  manager_approved_at?: string;
  manager_approved_by?: string;
  manager_approved_amount?: number;
  manager_comment?: string;
  
  // Согласование директором
  director_approved_at?: string;
  director_approved_by?: string;
  director_comment?: string;
  
  // Обработка бухгалтером
  accountant_processed_at?: string;
  accountant_processed_by?: string;
  payment_document_id?: number;
  paid_at?: string;
  paid_amount?: number;
  accountant_comment?: string;
  
  status_id?: number;
  created_at: string;
  updated_at: string;
  
  // Связанные данные
  invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
  };
  status?: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
  manager_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  director_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  accountant_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CreateInvoiceApprovalData {
  invoice_id: number;
  status_id?: number;
}

export interface UpdateInvoiceApprovalData {
  // Согласование руководителем
  manager_approved_amount?: number;
  manager_comment?: string;
  
  // Согласование директором
  director_comment?: string;
  
  // Обработка бухгалтером
  payment_document_id?: number;
  paid_amount?: number;
  accountant_comment?: string;
  
  status_id?: number;
}

// Действия по согласованию
export interface ManagerApprovalData {
  approved_amount: number;
  comment?: string;
}

export interface DirectorApprovalData {
  comment?: string;
}

export interface AccountantProcessingData {
  payment_document_id?: number;
  paid_amount: number;
  comment?: string;
}

export interface ApprovalFilters {
  invoice_id?: number;
  status_id?: number;
  manager_approved_by?: string;
  director_approved_by?: string;
  accountant_processed_by?: string;
  date_from?: string;
  date_to?: string;
}

// Типы действий в workflow
export const ApprovalAction = {
  MANAGER_APPROVE: 'manager_approve',
  MANAGER_REJECT: 'manager_reject',
  DIRECTOR_APPROVE: 'director_approve',
  DIRECTOR_REJECT: 'director_reject',
  ACCOUNTANT_PROCESS: 'accountant_process',
  ACCOUNTANT_MARK_PAID: 'accountant_mark_paid',
} as const;

export type ApprovalAction = typeof ApprovalAction[keyof typeof ApprovalAction];