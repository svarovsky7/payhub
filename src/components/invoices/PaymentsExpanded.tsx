import { Table, Space, Button, Typography, Empty, Spin, Tag, Tooltip, message as antdMessage } from 'antd'
import { EditOutlined, DeleteOutlined, SendOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Invoice, Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'
import { useApprovalManagement } from '../../hooks/useApprovalManagement'
import { ApprovalHistoryModal } from '../approvals/ApprovalHistoryModal'
import { SelectRouteModal } from '../approvals/SelectRouteModal'
import { useEffect, useState, useMemo, memo } from 'react'
import { type PaymentApproval, loadApprovalRoutes } from '../../services/approvalOperations'

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

interface ApprovalRoute {
  id: number
  name: string
  description?: string
  invoice_type_id: number
  is_active: boolean
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
  const { handleStartApproval, checkApprovalStatus, getApprovalHistory } = useApprovalManagement()
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, any>>({})
  const [loadingApproval, setLoadingApproval] = useState<string | null>(null)
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [selectedApprovals, setSelectedApprovals] = useState<PaymentApproval[]>([])

  // Route selection modal state
  const [routeModalVisible, setRouteModalVisible] = useState(false)
  const [availableRoutes, setAvailableRoutes] = useState<ApprovalRoute[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [selectedPaymentForApproval, setSelectedPaymentForApproval] = useState<Payment | null>(null)

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

  // Handle send to approval - shows route selection modal
  const handleSendToApproval = async (payment: Payment) => {
    if (!invoice.invoice_type_id) {
      antdMessage.warning('Не указан тип счёта')
      return
    }

    console.log('[PaymentsExpanded.handleSendToApproval] Loading routes for invoice type:', invoice.invoice_type_id)

    // Load available routes
    setLoadingRoutes(true)
    setSelectedPaymentForApproval(payment)

    try {
      const routes = await loadApprovalRoutes(invoice.invoice_type_id)

      if (routes.length === 0) {
        antdMessage.info('Для данного типа счёта нет активных маршрутов согласования')
        setSelectedPaymentForApproval(null)
        return
      }

      if (routes.length === 1) {
        // If only one route, use it directly
        console.log('[PaymentsExpanded.handleSendToApproval] Only one route found, starting approval directly')
        await handleRouteSelected(routes[0].id, payment)
      } else {
        // Show route selection modal
        console.log('[PaymentsExpanded.handleSendToApproval] Multiple routes found, showing selection modal')
        setAvailableRoutes(routes)
        setRouteModalVisible(true)
      }
    } catch (error) {
      console.error('[PaymentsExpanded.handleSendToApproval] Error loading routes:', error)
      antdMessage.error('Ошибка загрузки маршрутов согласования')
      setSelectedPaymentForApproval(null)
    } finally {
      setLoadingRoutes(false)
    }
  }

  // Handle route selected from modal
  const handleRouteSelected = async (routeId: number, payment?: Payment) => {
    const targetPayment = payment || selectedPaymentForApproval
    if (!targetPayment) {
      console.error('[PaymentsExpanded.handleRouteSelected] No payment selected')
      return
    }

    console.log('[PaymentsExpanded.handleRouteSelected] Starting approval with route:', routeId)
    setLoadingApproval(targetPayment.id)

    try {
      const success = await handleStartApproval(targetPayment.id, routeId)
      if (success) {
        // Reload approval status
        const status = await checkApprovalStatus(targetPayment.id)
        setApprovalStatuses(prev => ({ ...prev, [targetPayment.id]: status }))
        // Обновляем данные счетов для отображения нового статуса
        if (onApprovalStarted) {
          onApprovalStarted()
        }
      }
    } catch (error) {
      console.error('[PaymentsExpanded.handleRouteSelected] Error:', error)
    } finally {
      setLoadingApproval(null)
      setSelectedPaymentForApproval(null)
    }
  }

  // Handle history view
  const handleHistoryClick = async (payment: Payment) => {
    console.log('[PaymentsExpanded.handleHistoryClick] Loading history for payment:', payment.id)

    // Загружаем полную историю
    const history = await getApprovalHistory(payment.id)
    console.log('[PaymentsExpanded.handleHistoryClick] History loaded:', history)

    if (history && history.length > 0) {
      setSelectedApprovals(history)
    } else {
      // Если истории нет, создаём пустой массив
      setSelectedApprovals([])
    }

    setHistoryModalVisible(true)
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
      title: 'Действия',
      key: 'actions',
      render: (_, record) => {
        const approvalStatus = approvalStatuses[record.id]
        // Разрешаем отправку для статусов: 1 (Создан) и 4 (Отменён)
        const canSendToApproval = !approvalStatus?.isInApproval && (record.status_id === 1 || record.status_id === 4)

        return (
          <Space size="small">
            {canSendToApproval && (
              <Tooltip title={record.status_id === 4 ? "Повторно отправить на согласование" : "Отправить на согласование"}>
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  onClick={() => handleSendToApproval(record)}
                  size="small"
                  loading={loadingApproval === record.id}
                  style={{ color: record.status_id === 4 ? '#fa8c16' : '#1890ff' }}
                />
              </Tooltip>
            )}
            <Tooltip title="История согласования">
              <Button
                type="text"
                icon={<HistoryOutlined />}
                onClick={() => handleHistoryClick(record)}
                size="small"
              />
            </Tooltip>
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
    handleHistoryClick,
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

  // Calculate total (include delivery cost in invoice total)
  // Only count payments with status "Оплачен" (3) or "В оплате" (5)
  const PAID_STATUS_ID = 3  // Оплачен (paid)
  const APPROVED_STATUS_ID = 5  // В оплате (approved)

  const totalPaid = payments.reduce((sum, payment) => {
    if (payment.status_id === PAID_STATUS_ID || payment.status_id === APPROVED_STATUS_ID) {
      return sum + (payment.amount || 0)
    }
    return sum
  }, 0)

  const invoiceTotalWithDelivery = (invoice.amount_with_vat || 0) + (invoice.delivery_cost || 0)
  const remainingAmount = invoiceTotalWithDelivery - totalPaid

  return (
    <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text>
            <Text strong>Сумма счёта:</Text> {formatAmount(invoice.amount_with_vat || 0)} ₽
            {invoice.delivery_cost && invoice.delivery_cost > 0 && (
              <Text type="secondary"> + {formatAmount(invoice.delivery_cost)} ₽ (доставка)</Text>
            )}
          </Text>
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

      <ApprovalHistoryModal
        visible={historyModalVisible}
        onClose={() => {
          setHistoryModalVisible(false)
          setSelectedApprovals([])
        }}
        approvals={selectedApprovals}
      />

      {/* Route Selection Modal */}
      <SelectRouteModal
        open={routeModalVisible}
        onClose={() => {
          setRouteModalVisible(false)
          setSelectedPaymentForApproval(null)
        }}
        onSelect={handleRouteSelected}
        routes={availableRoutes}
        loading={loadingRoutes}
      />
    </div>
  )
})