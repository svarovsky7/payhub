import { supabase } from '../lib/supabase';
import type {
  AuditLog,
  AuditLogView,
  AuditLogFilter,
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
 * Получить историю изменений с фильтрами
 */
export async function getAuditLog(
  filter: AuditLogFilter = {}
): Promise<AuditLogView[]> {
  console.log('[auditLogService.getAuditLog] Fetching with filter:', filter);

  let query = supabase.from('audit_log_view').select('*');

  if (filter.entity_type) {
    query = query.eq('entity_type', filter.entity_type);
  }

  if (filter.entity_id) {
    query = query.eq('entity_id', filter.entity_id);
  }

  if (filter.action) {
    query = query.eq('action', filter.action);
  }

  if (filter.user_id) {
    query = query.eq('user_id', filter.user_id);
  }

  if (filter.date_from) {
    query = query.gte('created_at', filter.date_from);
  }

  if (filter.date_to) {
    query = query.lte('created_at', filter.date_to);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[auditLogService.getAuditLog] Error:', error);
    throw error;
  }

  console.log('[auditLogService.getAuditLog] Found records:', data?.length);
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

/**
 * Установить текущего пользователя для сессии
 * (используется триггерами БД для определения user_id)
 */
export async function setCurrentUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('set_config', {
    setting_name: 'app.current_user_id',
    setting_value: userId,
    is_local: true,
  });

  if (error) {
    console.error('[auditLogService.setCurrentUser] Error:', error);
    // Не выбрасываем ошибку, так как это вспомогательная функция
  }
}

/**
 * Получить последние N записей для пользователя
 */
export async function getUserRecentActivity(
  userId: string,
  limit = 50
): Promise<AuditLogView[]> {
  console.log('[auditLogService.getUserRecentActivity] Fetching for user:', userId);

  const { data, error } = await supabase
    .from('audit_log_view')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[auditLogService.getUserRecentActivity] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Получить статистику по изменениям за период
 */
export async function getAuditStatistics(
  entityType: AuditEntityType,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totalChanges: number;
  changesByAction: Record<string, number>;
  changesByUser: Record<string, number>;
}> {
  console.log('[auditLogService.getAuditStatistics] Fetching statistics:', {
    entityType,
    dateFrom,
    dateTo,
  });

  let query = supabase
    .from('audit_log_view')
    .select('action, user_name')
    .eq('entity_type', entityType);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[auditLogService.getAuditStatistics] Error:', error);
    throw error;
  }

  const changesByAction: Record<string, number> = {};
  const changesByUser: Record<string, number> = {};

  data?.forEach((entry) => {
    changesByAction[entry.action] = (changesByAction[entry.action] || 0) + 1;
    changesByUser[entry.user_name] = (changesByUser[entry.user_name] || 0) + 1;
  });

  return {
    totalChanges: data?.length || 0,
    changesByAction,
    changesByUser,
  };
}
