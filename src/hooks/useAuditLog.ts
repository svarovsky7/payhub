import { useState, useEffect, useCallback } from 'react';
import type { AuditLogView, AuditEntityType } from '../types/audit';
import { getAuditLogForEntity } from '../services/auditLogService';
import { message } from 'antd';

/**
 * Хук для получения истории изменений сущности
 */
export function useAuditLog(entityType: AuditEntityType, entityId: string | undefined) {
  const [auditLog, setAuditLog] = useState<AuditLogView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadAuditLog = useCallback(async () => {
    if (!entityId) {
      setAuditLog([]);
      return;
    }

    console.log('[useAuditLog] Loading audit log for:', { entityType, entityId });
    setLoading(true);
    setError(null);

    try {
      const data = await getAuditLogForEntity(entityType, entityId);
      setAuditLog(data);
      console.log('[useAuditLog] Loaded audit log entries:', data.length);
    } catch (err) {
      console.error('[useAuditLog] Error loading audit log:', err);
      const error = err as Error;
      setError(error);
      message.error('Не удалось загрузить историю изменений');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  return {
    auditLog,
    loading,
    error,
    refresh: loadAuditLog,
  };
}
