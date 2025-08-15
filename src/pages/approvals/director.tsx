import { invoiceApi } from '@/entities';
import { ApprovalPage } from './components/approval-page';

export function DirectorApprovalPage() {
  return (
    <ApprovalPage
      title="Согласование Директора"
      queryKey="director-invoices"
      fetchInvoices={() => invoiceApi.getByStatus('director_review')}
      onApprove={(id: number) => invoiceApi.approve(id, 'director_review')}
      onReject={(id: number, reason?: string) => invoiceApi.reject(id, 'director_review', reason)}
      approveText="Согласовать для Снабжения"
      rejectText="Отклонить"
    />
  );
}