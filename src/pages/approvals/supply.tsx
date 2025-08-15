import { invoiceApi } from '@/entities';
import { ApprovalPage } from './components/approval-page';

export function SupplyApprovalPage() {
  return (
    <ApprovalPage
      title="Согласование Снабжения"
      queryKey="supply-invoices"
      fetchInvoices={() => invoiceApi.getByStatus('supply_review')}
      onApprove={(id: number) => invoiceApi.approve(id, 'supply_review')}
      onReject={(id: number, reason?: string) => invoiceApi.reject(id, 'supply_review', reason)}
      approveText="Передать в оплату"
      rejectText="Отклонить"
    />
  );
}