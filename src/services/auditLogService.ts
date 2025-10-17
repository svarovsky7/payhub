import { supabase } from '../lib/supabase';
import type {
  AuditLog,
  AuditLogView,
  AuditEntityType,
  AuditAction,
} from '../types/audit';

/**
 * Сервис для работы с системой аудита (историей изменений)
 */

/**
 * Получить историю изменений для конкретной сущности
 */
export async function getAuditLogForEntity(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditLogView[]> {
  console.log('[auditLogService.getAuditLogForEntity] Fetching audit log:', {
    entityType,
    entityId,
  });

  const { data, error } = await supabase
    .from('audit_log_view')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[auditLogService.getAuditLogForEntity] Error:', error);
    throw error;
  }

  console.log('[auditLogService.getAuditLogForEntity] Found records:', data?.length);
  return data || [];
}

/**
 * Ручное создание записи в audit log
 * (В большинстве случаев записи создаются автоматически через триггеры БД)
 */
export async function createAuditLogEntry(
  entityType: AuditEntityType,
  entityId: string,
  action: AuditAction,
  userId: string,
  options?: {
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<AuditLog> {
  console.log('[auditLogService.createAuditLogEntry] Creating entry:', {
    entityType,
    entityId,
    action,
    userId,
    options,
  });

  const entry: Partial<AuditLog> = {
    entity_type: entityType,
    entity_id: entityId,
    action,
    user_id: userId,
    field_name: options?.fieldName,
    old_value: options?.oldValue,
    new_value: options?.newValue,
    metadata: options?.metadata,
  };

  const { data, error } = await supabase
    .from('audit_log')
    .insert([entry])
    .select()
    .single();

  if (error) {
    console.error('[auditLogService.createAuditLogEntry] Error:', error);
    throw error;
  }

  console.log('[auditLogService.createAuditLogEntry] Created entry:', data.id);
  return data;
}
