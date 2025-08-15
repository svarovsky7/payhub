import { invoiceApi } from '@/entities';
import { ApprovalPage } from './components/approval-page';

export function PaidPage() {
  return (
    <ApprovalPage
      title="Оплачено"
      queryKey="paid-invoices"
      fetchInvoices={() => invoiceApi.getByStatus('paid')}
      onApprove={async (id: number) => { void id; throw new Error('No actions available for paid invoices'); }} // No actions for paid invoices
      onReject={async (id: number, reason?: string) => { void id; void reason; throw new Error('No actions available for paid invoices'); }} // No actions for paid invoices
      showApprovalActions={false}
    />
  );
}