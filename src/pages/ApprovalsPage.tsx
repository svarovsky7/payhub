import { useState } from 'react'
import { Table, Button, Space, Card, Tag, Modal, Input, message, Empty, Spin, Typography, Timeline, Tooltip } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useApprovalManagement } from '../hooks/useApprovalManagement'
import { formatAmount } from '../utils/invoiceHelpers'
import dayjs from 'dayjs'
import type { PaymentApproval, ApprovalStep } from '../services/approvalOperations'
import '../styles/compact-table.css'

const { Title, Text } = Typography
const { TextArea } = Input

export const ApprovalsPage = () => {
  const {
    pendingApprovals,
    loadingApprovals,
    userRole,
    handleApprove,
    handleReject,
    loadPendingApprovals
  } = useApprovalManagement()

  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<PaymentApproval | null>(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  // Handle approve action
  const handleApproveClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    setComment('')
    setApproveModalVisible(true)
  }

  // Handle reject action
  const handleRejectClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    setComment('')
    setRejectModalVisible(true)
  }

  // Handle history view
  const handleHistoryClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    setHistoryModalVisible(true)
  }

  // Submit approval
  const submitApproval = async () => {
    if (!selectedApproval) return

    setProcessing(true)
    console.log('[ApprovalsPage.submitApproval] Approving:', selectedApproval.id)

    try {
      const success = await handleApprove(selectedApproval.id, comment || undefined)
      if (success) {
        setApproveModalVisible(false)
        setSelectedApproval(null)
        setComment('')
        await loadPendingApprovals()
      }
    } finally {
      setProcessing(false)
    }
  }

  // Submit rejection
  const submitRejection = async () => {
    if (!selectedApproval) return

    if (!comment.trim()) {
      message.error('Укажите причину отклонения')
      return
    }

    setProcessing(true)
    console.log('[ApprovalsPage.submitRejection] Rejecting:', selectedApproval.id)

    try {
      const success = await handleReject(selectedApproval.id, comment)
      if (success) {
        setRejectModalVisible(false)
        setSelectedApproval(null)
        setComment('')
        await loadPendingApprovals()
      }
    } finally {
      setProcessing(false)
    }
  }

  // Render approval history
  const renderApprovalHistory = (approval: PaymentApproval) => {
    const steps = approval.steps || []
    const sortedSteps = [...steps].sort((a, b) => a.stage?.order_index - b.stage?.order_index)

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

          return (
            <Timeline.Item key={step.id} dot={icon} color={color}>
              <div>
                <Text strong>
                  Этап {step.stage?.order_index + 1}: {step.stage?.role?.name}
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

  const columns: ColumnsType<PaymentApproval> = [
    {
      title: '№',
      key: 'payment_number',
      width: 70,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={`Платёж №${record.payment?.payment_number}`}>
          <span>{record.payment?.payment_number || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Дата',
      key: 'payment_date',
      width: 85,
      render: (_, record) => {
        const date = record.payment?.payment_date
        return date ? dayjs(date).format('DD.MM.YY') : '-'
      },
      sorter: (a, b) => {
        const dateA = a.payment?.payment_date ? dayjs(a.payment.payment_date).valueOf() : 0
        const dateB = b.payment?.payment_date ? dayjs(b.payment.payment_date).valueOf() : 0
        return dateA - dateB
      }
    },
    {
      title: 'Счёт',
      key: 'invoice',
      ellipsis: true,
      render: (_, record) => {
        const invoice = record.payment?.invoice
        if (!invoice) return '-'
        const payerName = invoice.payer?.name || 'Не указан'
        const supplierName = invoice.supplier?.name || 'Не указан'
        return (
          <Tooltip title={`Счёт №${invoice.invoice_number}\nПлательщик: ${payerName}\nПоставщик: ${supplierName}`}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>№{invoice.invoice_number}</div>
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                {payerName} → {supplierName}
              </div>
            </div>
          </Tooltip>
        )
      }
    },
    {
      title: 'Проект',
      key: 'project',
      ellipsis: true,
      render: (_, record) => {
        const projectName = record.payment?.invoice?.project?.name
        return projectName ? (
          <Tooltip title={projectName}>
            <span style={{ fontSize: '12px' }}>{projectName}</span>
          </Tooltip>
        ) : '-'
      }
    },
    {
      title: 'Сумма счёта',
      key: 'invoice_amount',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const amount = record.payment?.invoice?.amount_with_vat
        return amount ? (
          <Tooltip title="Сумма счёта с НДС">
            <span style={{ fontSize: '12px' }}>
              {formatAmount(amount)}₽
            </span>
          </Tooltip>
        ) : '-'
      },
      sorter: (a, b) => (a.payment?.invoice?.amount_with_vat || 0) - (b.payment?.invoice?.amount_with_vat || 0)
    },
    {
      title: 'Сумма платежа',
      key: 'payment_amount',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const amount = record.payment?.amount
        return amount ? (
          <span style={{ fontWeight: 500, color: '#1890ff' }}>
            {formatAmount(amount)}₽
          </span>
        ) : '-'
      },
      sorter: (a, b) => (a.payment?.amount || 0) - (b.payment?.amount || 0)
    },
    {
      title: 'Статус платежа',
      key: 'payment_status',
      width: 120,
      render: (_, record) => {
        const status = record.payment?.payment_status
        if (!status) return '-'

        let color = 'default'
        if (status.name === 'Черновик' || status.name === 'Новый') color = 'default'
        else if (status.name === 'На согласовании') color = 'processing'
        else if (status.name === 'Согласован' || status.name === 'Утвержден') color = 'success'
        else if (status.name === 'Отклонен' || status.name === 'Отменен') color = 'error'
        else if (status.name === 'Оплачен' || status.name === 'Проведен') color = 'green'

        return (
          <Tooltip title={`Статус: ${status.name}`}>
            <Tag color={color} style={{ margin: 0, fontSize: '11px' }}>
              {status.name}
            </Tag>
          </Tooltip>
        )
      }
    },
    {
      title: 'Этап',
      key: 'current_stage',
      width: 130,
      render: (_, record) => {
        const stage = record.current_stage
        const totalStages = record.route?.stages?.length || 0
        const progress = `${record.current_stage_index + 1}/${totalStages}`

        return (
          <Tooltip title={`${stage?.role?.name || 'Не определён'} (${stage?.name || 'Этап ' + (record.current_stage_index + 1)})`}>
            <div>
              <Tag color="processing" style={{ margin: 0, fontSize: '11px' }}>
                {progress}
              </Tag>
              <div style={{ fontSize: '11px', marginTop: '2px', color: '#595959' }}>
                {stage?.role?.name || 'Не определён'}
              </div>
            </div>
          </Tooltip>
        )
      }
    },
    {
      title: 'Маршрут',
      key: 'route',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.route?.name || '-'}>
          <span style={{ fontSize: '12px' }}>{record.route?.name || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Согласовать">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleApproveClick(record)}
              style={{ padding: '0 6px' }}
            />
          </Tooltip>
          <Tooltip title="Отклонить">
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleRejectClick(record)}
              style={{ padding: '0 6px' }}
            />
          </Tooltip>
          <Tooltip title="История">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleHistoryClick(record)}
              style={{ padding: '0 6px' }}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  if (!userRole) {
    return (
      <Card>
        <Empty
          description="Для работы с согласованиями необходима роль. Обратитесь к администратору."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="compact-table-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Согласование платежей</h1>
        {pendingApprovals.length > 0 && (
          <Tag color="processing" style={{ fontSize: '13px' }}>
            {pendingApprovals.length} {pendingApprovals.length === 1 ? 'платёж' : pendingApprovals.length < 5 ? 'платежа' : 'платежей'} на согласовании
          </Tag>
        )}
      </div>

      {loadingApprovals ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" tip="Загрузка платежей на согласовании..." />
          </div>
        </Card>
      ) : pendingApprovals.length === 0 ? (
        <Card>
          <Empty
            description="Нет платежей на согласовании"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <div className="compact-table">
          <Table
            columns={columns}
            dataSource={pendingApprovals}
            rowKey="id"
            size="small"
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
          />
        </div>
      )}

      {/* Modal for approval */}
      <Modal
        title="Согласование платежа"
        open={approveModalVisible}
        onOk={submitApproval}
        onCancel={() => {
          setApproveModalVisible(false)
          setSelectedApproval(null)
          setComment('')
        }}
        okText="Согласовать"
        cancelText="Отмена"
        confirmLoading={processing}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Вы согласовываете платеж:</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>
                № {selectedApproval?.payment?.payment_number} от{' '}
                {selectedApproval?.payment?.payment_date
                  ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
                  : '-'}
              </Text>
              <br />
              <Text>Сумма: {formatAmount(selectedApproval?.payment?.amount || 0)} ₽</Text>
            </div>
          </div>

          <div>
            <Text>Комментарий (необязательно):</Text>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Введите комментарий..."
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal for rejection */}
      <Modal
        title="Отклонение платежа"
        open={rejectModalVisible}
        onOk={submitRejection}
        onCancel={() => {
          setRejectModalVisible(false)
          setSelectedApproval(null)
          setComment('')
        }}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        confirmLoading={processing}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Вы отклоняете платеж:</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>
                № {selectedApproval?.payment?.payment_number} от{' '}
                {selectedApproval?.payment?.payment_date
                  ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
                  : '-'}
              </Text>
              <br />
              <Text>Сумма: {formatAmount(selectedApproval?.payment?.amount || 0)} ₽</Text>
            </div>
          </div>

          <div>
            <Text>
              <Text type="danger">*</Text> Причина отклонения:
            </Text>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Укажите причину отклонения..."
              style={{ marginTop: 8 }}
              required
            />
          </div>
        </Space>
      </Modal>

      {/* Modal for history */}
      <Modal
        title="История согласования"
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false)
          setSelectedApproval(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setHistoryModalVisible(false)
            setSelectedApproval(null)
          }}>
            Закрыть
          </Button>
        ]}
        width={700}
      >
        {selectedApproval && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>
                Платеж № {selectedApproval.payment?.payment_number} от{' '}
                {selectedApproval.payment?.payment_date
                  ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
                  : '-'}
              </Text>
              <br />
              <Text>Маршрут: {selectedApproval.route?.name}</Text>
            </div>

            {renderApprovalHistory(selectedApproval)}
          </Space>
        )}
      </Modal>
    </div>
  )
}