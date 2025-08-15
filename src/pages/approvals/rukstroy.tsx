import { invoiceApi } from '@/entities';
import { ApprovalPage } from './components/approval-page';

export function RukstroyApprovalPage() {
  return (
    <ApprovalPage
      title="Согласование Рукстроя"
      queryKey="rukstroy-invoices"
      fetchInvoices={() => invoiceApi.getByStatus('rukstroy_review')}
      onApprove={(id: number) => invoiceApi.approve(id, 'rukstroy_review')}
      onReject={(id: number, reason?: string) => invoiceApi.reject(id, 'rukstroy_review', reason)}
      approveText="Согласовать для Директора"
      rejectText="Отклонить"
    />
  );
}