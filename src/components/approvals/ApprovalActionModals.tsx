import { Modal, Space, Typography } from 'antd'
import { Input } from 'antd'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'
import type { PaymentApproval } from '../../services/approvalOperations'

const { Text } = Typography
const { TextArea } = Input

interface ApprovalActionModalsProps {
  // Approval modal
  approveModalVisible: boolean
  setApproveModalVisible: (visible: boolean) => void
  onApprove: () => void
  // Reject modal
  rejectModalVisible: boolean
  setRejectModalVisible: (visible: boolean) => void
  onReject: () => void
  // Common props
  selectedApproval: PaymentApproval | null
  comment: string
  setComment: (comment: string) => void
  processing?: boolean
  onCancel: () => void
}

export const ApprovalActionModals = ({
  approveModalVisible,
  onApprove,
  rejectModalVisible,
  onReject,
  selectedApproval,
  comment,
  setComment,
  processing,
  onCancel
}: ApprovalActionModalsProps) => {
  return (
    <>
      {/* Modal for approval */}
      <Modal
        title="Согласование платежа"
        open={approveModalVisible}
        onOk={onApprove}
        onCancel={onCancel}
        okText="Согласовать"
        cancelText="Отмена"
        confirmLoading={processing}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Вы согласовываете платеж:</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>
                № {selectedApproval?.payment?.payment_number} от{' '}
                {selectedApproval?.payment?.payment_date
                  ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
                  : '-'}
              </Text>
              <br />
              <Text>Сумма: {formatAmount(selectedApproval?.payment?.amount || 0)} ₽</Text>
            </div>
          </div>

          <div>
            <Text>Комментарий (необязательно):</Text>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Введите комментарий..."
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal for rejection */}
      <Modal
        title="Отклонение платежа"
        open={rejectModalVisible}
        onOk={onReject}
        onCancel={onCancel}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        confirmLoading={processing}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Вы отклоняете платеж:</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>
                № {selectedApproval?.payment?.payment_number} от{' '}
                {selectedApproval?.payment?.payment_date
                  ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
                  : '-'}
              </Text>
              <br />
              <Text>Сумма: {formatAmount(selectedApproval?.payment?.amount || 0)} ₽</Text>
            </div>
          </div>

          <div>
            <Text>
              <Text type="danger">*</Text> Причина отклонения:
            </Text>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Укажите причину отклонения..."
              style={{ marginTop: 8 }}
              required
            />
          </div>
        </Space>
      </Modal>
    </>
  )
}