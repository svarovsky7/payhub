import { Drawer } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import AuditLogTimeline from './AuditLogTimeline';
import { useAuditLog } from '../../hooks/useAuditLog';
import type { AuditEntityType } from '../../types/audit';

interface AuditLogDrawerProps {
  visible: boolean;
  onClose: () => void;
  entityType: AuditEntityType;
  entityId: string | undefined;
  title?: string;
}

export default function AuditLogDrawer({
  visible,
  onClose,
  entityType,
  entityId,
  title = 'История изменений',
}: AuditLogDrawerProps) {
  const { auditLog, loading } = useAuditLog(entityType, entityId);

  return (
    <Drawer
      title={
        <span>
          <HistoryOutlined style={{ marginRight: 8 }} />
          {title}
        </span>
      }
      open={visible}
      onClose={onClose}
      width={600}
    >
      <AuditLogTimeline auditLog={auditLog} loading={loading} />
    </Drawer>
  );
}
