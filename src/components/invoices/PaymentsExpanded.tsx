import { Table, Space, Button, Typography, Empty, Spin, Tag, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, SendOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Invoice, Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'
import { useApprovalManagement } from '../../hooks/useApprovalManagement'
import { useEffect, useState, useMemo, memo } from 'react'

const { Text } = Typography

interface PaymentsExpandedProps {
  invoice: Invoice
  payments: Payment[]
  paymentTypes: PaymentType[]
  paymentStatuses: PaymentStatus[]
  loading: boolean
  onEditPayment: (payment: Payment) => void
  onDeletePayment: (paymentId: string) => void
  onApprovalStarted?: () => void
}

export const PaymentsExpanded = memo(({
  invoice,
  payments,
  paymentTypes,
  paymentStatuses,
  loading,
  onEditPayment,
  onDeletePayment,
  onApprovalStarted
}: PaymentsExpandedProps) => {
  const { handleStartApproval, checkApprovalStatus } = useApprovalManagement()
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, any>>({})
  const [loadingApproval, setLoadingApproval] = useState<string | null>(null)

  // Load approval statuses for payments
  useEffect(() => {
    const loadApprovalStatuses = async () => {
      const statuses: Record<string, any> = {}
      for (const payment of payments) {
        const status = await checkApprovalStatus(payment.id)
        statuses[payment.id] = status
      }
      setApprovalStatuses(statuses)
    }

    if (payments.length > 0) {
      loadApprovalStatuses()
    }
  }, [payments, checkApprovalStatus])

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

  // Handle send to approval
  const handleSendToApproval = async (payment: Payment) => {
    if (!invoice.invoice_type_id) {
      return
    }

    setLoadingApproval(payment.id)

    try {
      const success = await handleStartApproval(payment.id, invoice.invoice_type_id)
      if (success) {
        // Reload approval status
        const status = await checkApprovalStatus(payment.id)
        setApprovalStatuses(prev => ({ ...prev, [payment.id]: status }))
        // Обновляем данные счетов для отображения нового статуса
        if (onApprovalStarted) {
          onApprovalStarted()
        }
      }
    } finally {
      setLoadingApproval(null)
    }
  }


  // Define columns for payments table
  const columns: ColumnsType<Payment> = useMemo(() => [
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string | null) => date ? dayjs(date).format('DD.MM.YYYY') : '-'
    },
    {
      title: 'Номер',
      dataIndex: 'payment_number',
      key: 'payment_number'
    },
    {
      title: 'Тип',
      key: 'payment_type',
      render: (_, record) => getPaymentTypeName(record.payment_type_id)
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, record) => {
        const status = paymentStatuses.find(s => s.id === record.status_id)
        const statusName = getPaymentStatusName(record.status_id)
        const approvalStatus = approvalStatuses[record.id]

        // Определяем цвет тега на основе статуса
        let tagColor = 'default'
        if (status) {
          if (status.name === 'Создан' || status.name === 'Черновик' || status.name === 'Новый') {
            tagColor = 'default'
          } else if (status.name === 'На согласовании' || status.name === 'В процессе') {
            tagColor = 'processing'
          } else if (status.name === 'Согласован' || status.name === 'Утвержден' || status.name === 'Одобрен') {
            tagColor = 'success'
          } else if (status.name === 'Отклонен' || status.name === 'Отменен') {
            tagColor = 'error'
          } else if (status.name === 'Оплачен' || status.name === 'Проведен' || status.name === 'Выполнен') {
            tagColor = 'green'
          } else if (status.color) {
            // Если есть цвет в базе, используем его
            tagColor = status.color
          }
        }

        return (
          <Space size="small">
            <Tag color={tagColor} style={{ margin: 0 }}>
              {statusName}
            </Tag>
            {approvalStatus?.isInApproval && (
              <Tooltip title="На согласовании">
                <Tag icon={<ClockCircleOutlined />} color="processing" style={{ margin: 0 }}>
                  Этап {approvalStatus.current_stage_index + 1}
                </Tag>
              </Tooltip>
            )}
          </Space>
        )
      }
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
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
      render: () => '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => {
        const approvalStatus = approvalStatuses[record.id]
        const canSendToApproval = !approvalStatus?.isInApproval && record.status_id === 1 // created (Создан)

        return (
          <Space size="small">
            {canSendToApproval && (
              <Tooltip title="Отправить на согласование">
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  onClick={() => handleSendToApproval(record)}
                  size="small"
                  loading={loadingApproval === record.id}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>
            )}
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEditPayment(record)}
              size="small"
              disabled={approvalStatus?.isInApproval}
            />
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeletePayment(record.id)}
              size="small"
              danger
              disabled={approvalStatus?.isInApproval}
            />
          </Space>
        )
      }
    }
  ], [
    approvalStatuses,
    getPaymentTypeName,
    getPaymentStatusName,
    handleSendToApproval,
    loadingApproval,
    onEditPayment,
    onDeletePayment,
    paymentStatuses
  ])

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
        tableLayout="auto"
      />
    </div>
  )
})