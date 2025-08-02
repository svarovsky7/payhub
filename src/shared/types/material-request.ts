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

// Цвета приоритетов
export const PriorityColors = {
  [RequestPriority.LOW]: '#52c41a',
  [RequestPriority.MEDIUM]: '#1890ff', 
  [RequestPriority.HIGH]: '#faad14',
  [RequestPriority.URGENT]: '#ff4d4f',
};

// Названия приоритетов
export const PriorityLabels = {
  [RequestPriority.LOW]: 'Низкий',
  [RequestPriority.MEDIUM]: 'Средний',
  [RequestPriority.HIGH]: 'Высокий', 
  [RequestPriority.URGENT]: 'Срочный',
};

export interface MaterialRequest {
  id: number;
  project_id: number;
  construction_manager_id: string;
  responsible_person_id?: number;
  material_request_number?: string;
  materials_description: string;
  requested_amount: number;
  priority: RequestPriority;
  delivery_deadline?: string;
  notes?: string;
  
  // Metadata
  created_at: string;
  created_by: string;
  updated_at: string;
  
  // Связанные данные
  project?: {
    id: number;
    name: string;
    code: string;
  };
  construction_manager?: {
    id: string;
    full_name: string;
    email: string;
  };
  responsible_person?: {
    id: number;
    full_name: string;
    position: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  // Связанные счета
  invoices?: Array<{
    id: number;
    invoice_number: string;
    total_amount: number;
    allocated_amount?: number;
    approval?: {
      status?: {
        code: string;
        name: string;
        color: string;
      };
    };
  }>;
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
  responsible_person_id?: number;
  material_request_number?: string;
  materials_description: string;
  requested_amount: number;
  priority?: RequestPriority;
  delivery_deadline?: string;
  notes?: string;
}