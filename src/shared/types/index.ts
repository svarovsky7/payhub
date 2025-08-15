export * from './database.types';

// Invoice Status Enum
export const InvoiceStatus = {
  DRAFT: 'draft',
  RUKSTROY_REVIEW: 'rukstroy_review',
  DIRECTOR_REVIEW: 'director_review',
  SUPPLY_REVIEW: 'supply_review',
  IN_PAYMENT: 'in_payment',
  PAID: 'paid',
  REJECTED: 'rejected',
} as const;

export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

// Approval Stage Enum
export const ApprovalStage = {
  RUKSTROY: 'rukstroy',
  DIRECTOR: 'director',
  SUPPLY: 'supply',
  PAYMENT: 'payment',
  COMPLETED: 'completed',
} as const;

export type ApprovalStage = typeof ApprovalStage[keyof typeof ApprovalStage];

// User Interface
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  project_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  device_preference?: 'auto' | 'desktop' | 'tablet';
}

// Project Interface
export interface Project {
  id: number;
  name: string;
  address?: string | null;
}

// Invoice Interface with relations
export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string | null;
  contractor_id: number;
  payer_id: number;
  project_id: number | null;
  responsible_person_id: number | null;
  total_amount: number;
  vat_amount: number | null;
  without_vat: number | null;
  description: string | null;
  delivery_date: string | null;
  delivery_days: number | null;
  is_important: boolean | null;
  status: InvoiceStatus | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  contractor?: Contractor;
  payer?: Payer;
  project?: Project;
  creator?: User;
  responsible_person?: ResponsiblePerson;
}

// Invoice Item Interface - NOT EXISTS IN DB
// This table is referenced in functions but not actually created
export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number | null;
  delivery_days: number | null;
  sort_order: number | null;
  created_at: string;
}

// Contractor Interface
export interface Contractor {
  id: number;
  name: string;
  inn: string | null;
  kpp: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Payer Interface
export interface Payer {
  id: number;
  name: string;
  inn: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Unit Interface (for invoice items)
export interface Unit {
  id: number;
  name: string;
  abbreviation: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// Attachment Interface
export interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  attachment_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// Responsible Person Interface
export interface ResponsiblePerson {
  id: number;
  full_name: string;
  position: string | null;
  email: string | null;
}

// Auth State Interface
export interface AuthState {
  user: User | null;
  session: unknown | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshSession?: () => Promise<void>;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Common query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams extends PaginationParams, SortParams {
  search?: string;
}