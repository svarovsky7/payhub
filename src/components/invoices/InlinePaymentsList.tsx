import { Table, Button, Space, Tag, Empty, Spin } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'

interface InlinePaymentsListProps {
  payments: Payment[]
  loading: boolean
  invoiceId: string
  remainingAmount: number
  onAddPayment: () => void
  onEditPayment: (payment: Payment) => void
  onDeletePayment: (paymentId: string) => void
}

export const InlinePaymentsList: React.FC<InlinePaymentsListProps> = ({
  payments,
  loading,
  invoiceId,
  remainingAmount,
  onAddPayment,
  onEditPayment,
  onDeletePayment
}) => {
  const columns: ColumnsType<Payment> = [
    {
      title: '№',
      dataIndex: 'payment_number',
      key: 'payment_number',
      width: 60,
      render: (num: number) => `#${num}`
    },
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 500, color: '#52c41a' }}>
          {formatAmount(amount)} ₽
        </span>
      )
    },
    {
      title: 'Тип',
      dataIndex: 'payment_type',
      key: 'payment_type',
      width: 120,
      render: (type: PaymentType | undefined) => type?.name || '-'
    },
    {
      title: 'Статус',
      key: 'status',
      width: 100,
      render: (_: any, record: Payment) => {
        const status = record.payment_status
        if (!status) return '-'
        return <Tag color={status.color || 'default'} style={{ fontSize: '11px' }}>{status.name}</Tag>
      }
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: Payment) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEditPayment(record)}
            title="Редактировать"
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => onDeletePayment(record.id)}
            title="Удалить"
          />
        </Space>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="small" />
        <span style={{ marginLeft: 8 }}>Загрузка платежей...</span>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#fafafa',
      border: '1px solid #f0f0f0',
      borderRadius: '6px',
      padding: '12px',
      margin: '8px 0'
    }}>
      <div style={{
        marginBottom: '12px'
      }}>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>
          Платежи по счёту ({payments.length})
        </span>
      </div>

      {payments.length > 0 ? (
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          pagination={false}
          size="small"
          style={{
            backgroundColor: 'white',
            borderRadius: '4px'
          }}
        />
      ) : (
        <Empty
          description="Нет платежей"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '20px 0' }}
        />
      )}
    </div>
  )
}