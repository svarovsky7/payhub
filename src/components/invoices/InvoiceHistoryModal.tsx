import { Modal, Tabs } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import AuditLogTimeline from '../common/AuditLogTimeline';
import { useAuditLog } from '../../hooks/useAuditLog';
import type { Invoice } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import type { AuditLogView } from '../../types/audit';

interface InvoiceHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export default function InvoiceHistoryModal({
  visible,
  onClose,
  invoice,
}: InvoiceHistoryModalProps) {
  const invoiceId = invoice?.id;

  // История счета
  const { auditLog: invoiceLog, loading: invoiceLoading } = useAuditLog(
    'invoice',
    invoiceId
  );

  // История связанных платежей
  const [paymentsLog, setPaymentsLog] = useState<AuditLogView[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    const loadPaymentsHistory = async () => {
      if (!invoiceId) {
        setPaymentsLog([]);
        return;
      }

      setPaymentsLoading(true);

      try {
        // Получаем все платежи для данного счета
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id')
          .eq('invoice_id', invoiceId);

        if (paymentsError) throw paymentsError;

        if (!payments || payments.length === 0) {
          setPaymentsLog([]);
          return;
        }

        const paymentIds = payments.map((p) => p.id);

        // Получаем историю для всех платежей
        const { data: logs, error: logsError } = await supabase
          .from('audit_log_view')
          .select('*')
          .eq('entity_type', 'payment')
          .in('entity_id', paymentIds)
          .order('created_at', { ascending: false });

        if (logsError) throw logsError;

        setPaymentsLog(logs || []);
      } catch (error) {
        console.error('[InvoiceHistoryModal] Error loading payments history:', error);
        setPaymentsLog([]);
      } finally {
        setPaymentsLoading(false);
      }
    };

    if (visible && invoiceId) {
      loadPaymentsHistory();
    }
  }, [visible, invoiceId]);

  const tabItems = [
    {
      key: 'invoice',
      label: 'История счета',
      children: (
        <AuditLogTimeline auditLog={invoiceLog} loading={invoiceLoading} />
      ),
    },
    {
      key: 'payments',
      label: `История платежей (${paymentsLog.length})`,
      children: (
        <AuditLogTimeline auditLog={paymentsLog} loading={paymentsLoading} />
      ),
    },
  ];

  return (
    <Modal
      title={
        <span>
          <HistoryOutlined style={{ marginRight: 8 }} />
          История изменений - Счет №{invoice?.invoice_number}
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 0 }
      }}
    >
      {invoice && (
        <div style={{
          marginBottom: 12,
          padding: '12px 16px',
          background: '#f5f5f5',
          borderRadius: 4,
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <span><strong>Счет:</strong> №{invoice.invoice_number}</span>
            {invoice.payer && (
              <span><strong>Плательщик:</strong> {invoice.payer.name}</span>
            )}
            {invoice.supplier && (
              <span><strong>Поставщик:</strong> {invoice.supplier.name}</span>
            )}
          </div>
        </div>
      )}

      <Tabs items={tabItems} defaultActiveKey="invoice" />
    </Modal>
  );
}
