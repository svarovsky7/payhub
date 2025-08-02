export const RequestStatus = {
  DRAFT: 'draft',
  PENDING_MANAGER: 'pending_manager',
  PENDING_DIRECTOR: 'pending_director', 
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

export const RequestPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type RequestPriority = typeof RequestPriority[keyof typeof RequestPriority];

export interface MaterialRequest {
  id: number;
  project_id: number;
  construction_manager_id: string;
  contractor_id: number;
  payer_id: number;
  responsible_person_id: number;
  material_request_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  materials_description: string;
  amount: number;
  comment?: string;
  
  // Workflow fields
  approved_amount?: number;
  manager_comment?: string;
  manager_approved_at?: string;
  manager_approved_by?: string;
  director_comment?: string;
  director_approved_at?: string;
  director_approved_by?: string;
  
  // Payment fields
  payment_document_number?: string;
  payment_date?: string;
  paid_amount?: number;
  paid_at?: string;
  paid_by?: string;
  accountant_comment?: string;
  
  // Metadata
  status: RequestStatus;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface MaterialRequestFilters {
  status?: RequestStatus;
  projectId?: number;
  constructionManagerId?: string;
  contractorId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateMaterialRequestData {
  project_id: number;
  construction_manager_id: string;
  contractor_id: number;
  payer_id: number;
  responsible_person_id: number;
  material_request_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  materials_description: string;
  amount: number;
  comment?: string;
}