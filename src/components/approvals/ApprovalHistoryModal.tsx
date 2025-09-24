import { Modal, Timeline, Tag, Typography, Spin } from 'antd'
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
  approval: PaymentApproval | null
  onClose: () => void
}

export const ApprovalHistoryModal: React.FC<ApprovalHistoryModalProps> = ({
  visible,
  approval,
  onClose
}) => {
  const getTimelineItemColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'green'
      case 'rejected':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'approved':
        return <Tag color="success">Согласовано</Tag>
      case 'rejected':
        return <Tag color="error">Отклонено</Tag>
      case 'created':
        return <Tag color="default">Создано</Tag>
      default:
        return <Tag>{action}</Tag>
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircleOutlined />
      case 'rejected':
        return <CloseCircleOutlined />
      default:
        return <ClockCircleOutlined />
    }
  }

  return (
    <Modal
      title={`История согласования счёта №${approval?.invoice?.invoice_number || '-'}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {approval ? (
        <Timeline mode="left">
          {approval.approval_steps && approval.approval_steps.length > 0 ? (
            approval.approval_steps.map((step: ApprovalStep) => (
              <Timeline.Item
                key={step.id}
                color={getTimelineItemColor(step.action)}
                dot={getActionIcon(step.action)}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text strong>{step.user?.user_metadata?.full_name || step.user?.email || 'Неизвестный пользователь'}</Text>
                  <br />
                  <Text type="secondary">
                    Роль: {step.role?.name || 'Не определена'}
                  </Text>
                  <br />
                  <Text type="secondary">
                    Этап: {step.stage_index !== null ? `${step.stage_index + 1}. ${step.stage_name || 'Без названия'}` : 'Не определён'}
                  </Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  {getActionLabel(step.action)}
                </div>
                {step.comment && (
                  <div style={{
                    marginTop: 8,
                    padding: 8,
                    background: '#f5f5f5',
                    borderRadius: 4
                  }}>
                    <Text italic>{step.comment}</Text>
                  </div>
                )}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(step.created_at).format('DD.MM.YYYY HH:mm')}
                </Text>
              </Timeline.Item>
            ))
          ) : (
            <Timeline.Item color="gray">
              <Text type="secondary">История согласования пуста</Text>
            </Timeline.Item>
          )}
        </Timeline>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      )}
    </Modal>
  )
}