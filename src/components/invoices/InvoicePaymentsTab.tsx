import { Table, Button, Space, Tag, Empty } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'

interface InvoicePaymentsTabProps {
  payments: Payment[]
  loadingPayments: boolean
  invoiceAmount: number
  totalPaid: number
  remainingAmount: number
  onCreatePayment: () => void
  onEditPayment: (payment: Payment) => void
  onDeletePayment: (paymentId: string) => void
}

export const InvoicePaymentsTab: React.FC<InvoicePaymentsTabProps> = ({
  payments,
  loadingPayments,
  invoiceAmount,
  totalPaid,
  remainingAmount,
  onCreatePayment,
  onEditPayment,
  onDeletePayment
}) => {
  const columns: ColumnsType<Payment> = [
    {
      title: '№',
      dataIndex: 'payment_number',
      key: 'payment_number',
      width: 80
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
      width: 150,
      render: (amount: number) => `${formatAmount(amount)} ₽`
    },
    {
      title: 'Тип',
      dataIndex: 'payment_type',
      key: 'payment_type',
      render: (type: PaymentType | undefined) => type?.name || '-'
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_: any, record: Payment) => {
        const status = record.payment_status
        if (!status) return '-'
        return <Tag color={status.color || 'default'}>{status.name}</Tag>
      }
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
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

  return (
    <div>
      <div style={{
        marginBottom: 16,
        padding: '16px',
        backgroundColor: '#fafafa',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>
            Сумма счёта: <span style={{ color: '#1890ff' }}>{formatAmount(invoiceAmount)} ₽</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 500, marginTop: '8px' }}>
            Оплачено: <span style={{ color: '#52c41a' }}>{formatAmount(totalPaid)} ₽</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 500, marginTop: '8px' }}>
            Остаток: <span style={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {formatAmount(Math.abs(remainingAmount))} ₽
            </span>
            {remainingAmount < 0 && ' (переплата)'}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreatePayment}
        >
          Добавить платёж
        </Button>
      </div>

      {loadingPayments ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка платежей...</div>
      ) : payments.length > 0 ? (
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          pagination={false}
        />
      ) : (
        <Empty description="Нет платежей" />
      )}
    </div>
  )
}