import { Drawer, Tabs } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import AuditLogTimeline from '../common/AuditLogTimeline';
import { useAuditLog } from '../../hooks/useAuditLog';
import type { PaymentApproval } from '../../services/approvalOperations';

interface ChangeHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  approval: PaymentApproval | null;
}

export default function ChangeHistoryDrawer({
  visible,
  onClose,
  approval,
}: ChangeHistoryDrawerProps) {
  const paymentId = approval?.payment?.id;
  const invoiceId = approval?.payment?.invoice?.id;

  const { auditLog: paymentLog, loading: paymentLoading } = useAuditLog(
    'payment',
    paymentId
  );

  const { auditLog: invoiceLog, loading: invoiceLoading } = useAuditLog(
    'invoice',
    invoiceId
  );

  const tabItems = [
    {
      key: 'payment',
      label: 'История платежа',
      children: (
        <AuditLogTimeline auditLog={paymentLog} loading={paymentLoading} />
      ),
    },
    {
      key: 'invoice',
      label: 'История счета',
      children: (
        <AuditLogTimeline auditLog={invoiceLog} loading={invoiceLoading} />
      ),
    },
  ];

  return (
    <Drawer
      title={
        <span>
          <HistoryOutlined style={{ marginRight: 8 }} />
          История изменений
        </span>
      }
      open={visible}
      onClose={onClose}
      width={700}
    >
      {approval && (
        <div style={{ marginBottom: 16 }}>
          <div>
            <strong>Платеж:</strong> №{approval.payment?.payment_number}
          </div>
          <div>
            <strong>Счет:</strong> №{approval.payment?.invoice?.invoice_number}
          </div>
        </div>
      )}

      <Tabs items={tabItems} defaultActiveKey="payment" />
    </Drawer>
  );
}
