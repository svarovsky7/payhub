import { Table, Space, Button, Typography, Empty, Spin } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Invoice, Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'

const { Text } = Typography

interface PaymentsExpandedProps {
  invoice: Invoice
  payments: Payment[]
  paymentTypes: PaymentType[]
  paymentStatuses: PaymentStatus[]
  loading: boolean
  onEditPayment: (payment: Payment) => void
  onDeletePayment: (paymentId: string) => void
}

export const PaymentsExpanded = ({
  invoice,
  payments,
  paymentTypes,
  paymentStatuses,
  loading,
  onEditPayment,
  onDeletePayment
}: PaymentsExpandedProps) => {
  // Get payment type name
  const getPaymentTypeName = (typeId?: number) => {
    if (!typeId) return '-'
    const type = paymentTypes.find(t => t.id === typeId)
    return type?.name || '-'
  }

  // Get payment status name
  const getPaymentStatusName = (statusId?: number) => {
    if (!statusId) return '-'
    const status = paymentStatuses.find(s => s.id === statusId)
    return status?.name || '-'
  }


  // Define columns for payments table
  const columns: ColumnsType<Payment> = [
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 100,
      render: (date: string | null) => date ? dayjs(date).format('DD.MM.YYYY') : '-'
    },
    {
      title: 'Номер',
      dataIndex: 'payment_number',
      key: 'payment_number',
      width: 100
    },
    {
      title: 'Тип',
      key: 'payment_type',
      width: 120,
      render: (_, record) => getPaymentTypeName(record.payment_type_id)
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const status = paymentStatuses.find(s => s.id === record.status_id)
        const statusName = getPaymentStatusName(record.status_id)
        return status?.color ? (
          <span style={{ color: status.color }}>{statusName}</span>
        ) : statusName
      }
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number | null) => amount ? `${formatAmount(amount)} ₽` : '-'
    },
    {
      title: 'Примечание',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string | null) => notes || '-'
    },
    {
      title: 'Файлы',
      key: 'attachments',
      width: 80,
      render: () => '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEditPayment(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onDeletePayment(record.id)}
            size="small"
            danger
          />
        </Space>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin tip="Загрузка платежей..." />
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <Empty
          description="Платежи не найдены"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  // Calculate total
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  const remainingAmount = (invoice.amount_with_vat || 0) - totalPaid

  return (
    <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text>
            <Text strong>Оплачено:</Text> {formatAmount(totalPaid)} ₽
          </Text>
          <Text>
            <Text strong>Остаток:</Text>{' '}
            <Text type={remainingAmount > 0 ? 'danger' : 'success'}>
              {formatAmount(remainingAmount)} ₽
            </Text>
          </Text>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={payments}
        rowKey="id"
        size="small"
        pagination={false}
      />
    </div>
  )
}