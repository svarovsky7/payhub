import { Button, Space, Tooltip } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  EditOutlined,
  FileAddOutlined,
  DollarOutlined
} from '@ant-design/icons'
import type { PaymentApproval } from '../../services/approvalOperations'

interface ApprovalActionButtonsProps {
  record: PaymentApproval
  permissions: {
    can_edit_invoice: boolean
    can_add_files: boolean
    can_edit_amount: boolean
  }
  onApprove: (approval: PaymentApproval) => void
  onReject: (approval: PaymentApproval) => void
  onEditInvoice: (approval: PaymentApproval) => void
  onAddFiles: (approval: PaymentApproval) => void
  onEditAmount: (approval: PaymentApproval) => void
  onViewHistory: (approval: PaymentApproval) => void
}

export const ApprovalActionButtons: React.FC<ApprovalActionButtonsProps> = ({
  record,
  permissions,
  onApprove,
  onReject,
  onEditInvoice,
  onAddFiles,
  onEditAmount,
  onViewHistory
}) => {
  return (
    <Space size={4}>
      <Tooltip title="Согласовать">
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          onClick={() => onApprove(record)}
          style={{ padding: '0 6px' }}
        />
      </Tooltip>
      <Tooltip title="Отклонить">
        <Button
          size="small"
          danger
          icon={<CloseOutlined />}
          onClick={() => onReject(record)}
          style={{ padding: '0 6px' }}
        />
      </Tooltip>
      {permissions.can_edit_invoice && (
        <Tooltip title="Редактировать счёт">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditInvoice(record)}
            style={{ padding: '0 6px', color: '#1890ff' }}
          />
        </Tooltip>
      )}
      {permissions.can_add_files && (
        <Tooltip title="Добавить файлы">
          <Button
            size="small"
            icon={<FileAddOutlined />}
            onClick={() => onAddFiles(record)}
            style={{ padding: '0 6px', color: '#52c41a' }}
          />
        </Tooltip>
      )}
      {permissions.can_edit_amount && (
        <Tooltip title="Изменить сумму платежа">
          <Button
            size="small"
            icon={<DollarOutlined />}
            onClick={() => onEditAmount(record)}
            style={{ padding: '0 6px', color: '#fa8c16' }}
          />
        </Tooltip>
      )}
      <Tooltip title="История">
        <Button
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => onViewHistory(record)}
          style={{ padding: '0 6px' }}
        />
      </Tooltip>
    </Space>
  )
}