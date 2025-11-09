// Типы для системы аудита (истории изменений)

export type AuditEntityType =
  | 'invoice'
  | 'payment'
  | 'invoice_attachment'
  | 'payment_attachment'
  | 'approval'
  | 'letter'
  | 'letter_attachment';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'file_add'
  | 'file_delete'
  | 'status_change'
  | 'approval_action'
  | 'view';

export interface AuditLog {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  user_id: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogView extends AuditLog {
  user_name: string;
  user_email: string;
}

export interface AuditLogFilter {
  entity_type?: AuditEntityType;
  entity_id?: string;
  action?: AuditAction;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

// Расширенные типы для метаданных разных типов действий

export interface FileAuditMetadata {
  file_id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
}

export interface StatusChangeMetadata {
  old_status_name: string;
  new_status_name: string;
}

export interface ApprovalActionMetadata {
  approval_action: string;
  stage_id: number;
  comment?: string;
  acted_at?: string;
}

export interface CreateInvoiceMetadata {
  invoice_number: string;
  amount?: number;
}

export interface CreatePaymentMetadata {
  payment_number: number;
  amount: number;
  invoice_id: string;
}
