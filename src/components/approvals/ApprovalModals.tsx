import { Modal, Input, message } from 'antd'
import type { PaymentApproval } from '../../services/approvalOperations'

const { TextArea } = Input

interface ApprovalModalsProps {
  approveModalVisible: boolean
  rejectModalVisible: boolean
  selectedApproval: PaymentApproval | null
  comment: string
  processing: boolean
  onCommentChange: (value: string) => void
  onApproveConfirm: () => void
  onRejectConfirm: () => void
  onApproveCancel: () => void
  onRejectCancel: () => void
}

export const ApprovalModals: React.FC<ApprovalModalsProps> = ({
  approveModalVisible,
  rejectModalVisible,
  selectedApproval,
  comment,
  processing,
  onCommentChange,
  onApproveConfirm,
  onRejectConfirm,
  onApproveCancel,
  onRejectCancel
}) => {
  const handleRejectConfirm = () => {
    if (!comment.trim()) {
      message.error('Укажите причину отклонения')
      return
    }
    onRejectConfirm()
  }

  return (
    <>
      {/* Approval Modal */}
      <Modal
        title={`Согласовать счёт №${selectedApproval?.invoice?.invoice_number || '-'}`}
        open={approveModalVisible}
        onOk={onApproveConfirm}
        onCancel={onApproveCancel}
        okText="Согласовать"
        cancelText="Отмена"
        confirmLoading={processing}
      >
        <p>Вы уверены, что хотите согласовать этот счёт?</p>
        <p>
          <strong>Поставщик:</strong> {selectedApproval?.invoice?.supplier?.name || '-'}
        </p>
        <p>
          <strong>Сумма:</strong> {selectedApproval?.invoice?.amount_with_vat
            ? `${new Intl.NumberFormat('ru-RU').format(selectedApproval.invoice.amount_with_vat)} ₽`
            : '-'}
        </p>
        <div style={{ marginTop: 16 }}>
          <TextArea
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={`Отклонить счёт №${selectedApproval?.invoice?.invoice_number || '-'}`}
        open={rejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={onRejectCancel}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        confirmLoading={processing}
      >
        <p>Вы уверены, что хотите отклонить этот счёт?</p>
        <p>
          <strong>Поставщик:</strong> {selectedApproval?.invoice?.supplier?.name || '-'}
        </p>
        <p>
          <strong>Сумма:</strong> {selectedApproval?.invoice?.amount_with_vat
            ? `${new Intl.NumberFormat('ru-RU').format(selectedApproval.invoice.amount_with_vat)} ₽`
            : '-'}
        </p>
        <div style={{ marginTop: 16 }}>
          <TextArea
            placeholder="Укажите причину отклонения (обязательно)"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={4}
            required
          />
        </div>
      </Modal>
    </>
  )
}