import { Modal, Button, Space, Typography, Timeline, Tag } from 'antd'
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { PaymentApproval, ApprovalStep } from '../../services/approvalOperations'

const { Text } = Typography

interface ApprovalHistoryModalProps {
  visible: boolean
  onClose: () => void
  approval: PaymentApproval | null
}

export const ApprovalHistoryModal = ({
  visible,
  onClose,
  approval
}: ApprovalHistoryModalProps) => {
  // Render approval history
  const renderApprovalHistory = (approval: PaymentApproval) => {
    const steps = approval.steps || []
    const sortedSteps = [...steps].sort((a, b) => {
      const orderA = a.stage?.order_index ?? 999
      const orderB = b.stage?.order_index ?? 999
      return orderA - orderB
    })

    console.log('[ApprovalHistoryModal] Rendering steps:', {
      totalSteps: steps.length,
      sortedSteps: sortedSteps.map(s => ({
        id: s.id,
        action: s.action,
        order_index: s.stage?.order_index,
        role_name: s.stage?.role?.name,
        stage_name: s.stage?.name
      }))
    })

    return (
      <Timeline>
        {sortedSteps.map((step: ApprovalStep) => {
          let icon = <ClockCircleOutlined />
          let color = 'gray'

          if (step.action === 'approved') {
            icon = <CheckCircleOutlined />
            color = 'green'
          } else if (step.action === 'rejected') {
            icon = <CloseCircleOutlined />
            color = 'red'
          }

          const stageNumber = step.stage?.order_index !== undefined ? step.stage.order_index + 1 : '?'
          const roleName = step.stage?.role?.name || 'Не указана роль'

          return (
            <Timeline.Item key={step.id} dot={icon} color={color}>
              <div>
                <Text strong>
                  Этап {stageNumber}: {roleName}
                </Text>
                {step.stage?.name && (
                  <Text type="secondary"> ({step.stage.name})</Text>
                )}
              </div>
              <div>
                {step.action === 'pending' && (
                  <Tag color="processing">Ожидает согласования</Tag>
                )}
                {step.action === 'approved' && (
                  <>
                    <Tag color="success">Согласовано</Tag>
                    <Text type="secondary">
                      {step.actor?.full_name || 'Неизвестный пользователь'}
                      {step.acted_at && ` • ${dayjs(step.acted_at).format('DD.MM.YYYY HH:mm')}`}
                    </Text>
                  </>
                )}
                {step.action === 'rejected' && (
                  <>
                    <Tag color="error">Отклонено</Tag>
                    <Text type="secondary">
                      {step.actor?.full_name || 'Неизвестный пользователь'}
                      {step.acted_at && ` • ${dayjs(step.acted_at).format('DD.MM.YYYY HH:mm')}`}
                    </Text>
                  </>
                )}
              </div>
              {step.comment && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" italic>Комментарий: {step.comment}</Text>
                </div>
              )}
            </Timeline.Item>
          )
        })}
      </Timeline>
    )
  }

  return (
    <Modal
      title="История согласования"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>
      ]}
      width={700}
    >
      {approval && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>
              Платеж № {approval.payment?.payment_number} от{' '}
              {approval.payment?.payment_date
                ? dayjs(approval.payment.payment_date).format('DD.MM.YYYY')
                : '-'}
            </Text>
            <br />
            <Text>Маршрут: {approval.route?.name}</Text>
          </div>

          {renderApprovalHistory(approval)}
        </Space>
      )}
    </Modal>
  )
}