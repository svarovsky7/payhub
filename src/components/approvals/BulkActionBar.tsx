import { Button, Space, Card, Typography, Checkbox } from 'antd'
import { CheckOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons'
import { formatAmount } from '../../utils/invoiceHelpers'
import type { PaymentApproval } from '../../services/approvalOperations'
import '../../styles/bulk-action-bar.css'

const { Text } = Typography

interface BulkActionBarProps {
  selectedIds: string[]
  approvals: PaymentApproval[]
  onApproveAll: () => void
  onRejectAll: () => void
  onClearSelection: () => void
  onSelectAll: (checked: boolean) => void
  processing: boolean
}

export const BulkActionBar = ({
  selectedIds,
  approvals,
  onApproveAll,
  onRejectAll,
  onClearSelection,
  onSelectAll,
  processing
}: BulkActionBarProps) => {
  const selectedCount = selectedIds.length
  const totalCount = approvals.length
  const isAllSelected = selectedCount === totalCount && totalCount > 0
  const isSomeSelected = selectedCount > 0 && selectedCount < totalCount

  // Calculate total amount of selected payments
  const selectedAmount = approvals
    .filter(a => selectedIds.includes(a.id))
    .reduce((sum, a) => sum + (a.payment?.amount || 0), 0)

  if (selectedCount === 0) {
    return (
      <Card className="bulk-action-bar bulk-action-bar-empty">
        <div className="bulk-action-content">
          <div className="bulk-action-left">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
            >
              <Text strong>Выбрать все платежи ({totalCount})</Text>
            </Checkbox>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bulk-action-bar bulk-action-bar-active">
      <div className="bulk-action-content">
        <div className="bulk-action-left">
          <Checkbox
            checked={isAllSelected}
            indeterminate={isSomeSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          <div className="bulk-action-info">
            <Text strong className="bulk-action-count">
              Выбрано: {selectedCount} {selectedCount === 1 ? 'платёж' : selectedCount < 5 ? 'платежа' : 'платежей'}
            </Text>
            <Text type="secondary" className="bulk-action-amount">
              Общая сумма: {formatAmount(selectedAmount)} ₽
            </Text>
          </div>
        </div>
        <div className="bulk-action-right">
          <Space size={12}>
            <Button
              size="middle"
              icon={<ClearOutlined />}
              onClick={onClearSelection}
              disabled={processing}
              className="bulk-action-btn bulk-action-btn-clear"
            >
              Очистить
            </Button>
            <Button
              type="primary"
              danger
              size="middle"
              icon={<CloseOutlined />}
              onClick={onRejectAll}
              disabled={processing}
              className="bulk-action-btn bulk-action-btn-reject"
            >
              Отклонить выбранные ({selectedCount})
            </Button>
            <Button
              type="primary"
              size="middle"
              icon={<CheckOutlined />}
              onClick={onApproveAll}
              disabled={processing}
              loading={processing}
              className="bulk-action-btn bulk-action-btn-approve"
            >
              Согласовать выбранные ({selectedCount})
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  )
}
