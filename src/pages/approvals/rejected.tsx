import { invoiceApi } from '@/entities';
import { ApprovalPage } from './components/approval-page';

export function RejectedPage() {
  return (
    <ApprovalPage
      title="Отказано"
      queryKey="rejected-invoices"
      fetchInvoices={() => invoiceApi.getByStatus('rejected')}
      onApprove={async (id: number) => { void id; throw new Error('No actions available for rejected invoices'); }} // No actions for rejected invoices
      onReject={async (id: number, reason?: string) => { void id; void reason; throw new Error('No actions available for rejected invoices'); }} // No actions for rejected invoices
      showApprovalActions={false}
    />
  );
}