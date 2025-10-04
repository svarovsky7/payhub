import { useMemo } from 'react'
import { Card, Statistic, Space, Divider } from 'antd'
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons'

interface ApprovalWithPayment {
  id: string
  payment?: {
    amount?: number
  }
}

interface PaymentsSummaryCardProps {
  approvals: ApprovalWithPayment[]
  selectedIds: string[]
}

export const PaymentsSummaryCard: React.FC<PaymentsSummaryCardProps> = ({
  approvals,
  selectedIds
}) => {
  // Calculate total amount of all approvals
  const totalAmount = useMemo(() => {
    return approvals.reduce((sum, approval) => {
      const amount = approval.payment?.amount || 0
      return sum + amount
    }, 0)
  }, [approvals])

  // Calculate total amount of selected approvals
  const selectedAmount = useMemo(() => {
    if (selectedIds.length === 0) {
      return 0
    }
    return approvals
      .filter(approval => selectedIds.includes(approval.id))
      .reduce((sum, approval) => {
        const amount = approval.payment?.amount || 0
        return sum + amount
      }, 0)
  }, [approvals, selectedIds])

  // Count selected payments
  const selectedCount = selectedIds.length
  const totalCount = approvals.length

  return (
    <Card
      title="Расчет платежей"
      size="small"
      style={{
        position: 'sticky',
        top: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Total on approval */}
        <div>
          <Statistic
            title="На согласовании"
            value={totalAmount}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ fontSize: 20, color: '#1890ff' }}
          />
          <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
            Всего платежей: {totalCount}
          </div>
        </div>

        <Divider style={{ margin: 0 }} />

        {/* Selected for approval */}
        <div>
          <Statistic
            title="Выбрано для согласования"
            value={selectedAmount}
            precision={2}
            prefix={<CheckCircleOutlined />}
            suffix="₽"
            valueStyle={{
              fontSize: 20,
              color: selectedCount > 0 ? '#52c41a' : '#d9d9d9'
            }}
          />
          <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
            Выбрано платежей: {selectedCount}
          </div>
        </div>

        {/* Percentage if selected */}
        {selectedCount > 0 && (
          <>
            <Divider style={{ margin: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                Процент от общей суммы
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#595959' }}>
                {((selectedAmount / totalAmount) * 100).toFixed(1)}%
              </div>
            </div>
          </>
        )}
      </Space>
    </Card>
  )
}
