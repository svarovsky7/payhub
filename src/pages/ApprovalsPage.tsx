import { useState, useEffect } from 'react'
import { Table, Button, Space, Card, Tag, Modal, Input, message, Empty, Spin, Typography, Timeline, Tooltip, Form, InputNumber, DatePicker, Select, Row, Col, Radio } from 'antd'
import { supabase } from '../lib/supabase'
import {
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
  FileAddOutlined,
  DollarOutlined
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
  const [editInvoiceModalVisible, setEditInvoiceModalVisible] = useState(false)
  const [addFilesModalVisible, setAddFilesModalVisible] = useState(false)
  const [editAmountModalVisible, setEditAmountModalVisible] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<PaymentApproval | null>(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const [editAmountForm] = Form.useForm()
  const [editInvoiceForm] = Form.useForm()
  const [contractors, setContractors] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<any[]>([])
  const [loadingReferenceData, setLoadingReferenceData] = useState(false)
  const [vatRate, setVatRate] = useState(20)
  const [amountWithVat, setAmountWithVat] = useState(0)
  const [deliveryDaysType, setDeliveryDaysType] = useState<'working' | 'calendar'>('working')

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

  // Get current stage permissions
  const getCurrentStagePermissions = (approval: PaymentApproval) => {
    const currentStage = approval.route?.stages?.find(
      (stage: any) => stage.order_index === approval.current_stage_index
    )
    return currentStage?.permissions || {}
  }

  // Load reference data for invoice editing
  const loadReferenceData = async () => {
    setLoadingReferenceData(true)
    try {
      // Load contractors
      const { data: contractorsData } = await supabase
        .from('contractors')
        .select('*')
        .order('name')
      setContractors(contractorsData || [])

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')
      setProjects(projectsData || [])

      // Load invoice types
      const { data: typesData } = await supabase
        .from('invoice_types')
        .select('*')
        .order('name')
      setInvoiceTypes(typesData || [])
    } catch (error) {
      console.error('[ApprovalsPage.loadReferenceData] Error:', error)
      message.error('Ошибка загрузки справочников')
    } finally {
      setLoadingReferenceData(false)
    }
  }

  // Handle edit invoice click
  const handleEditInvoiceClick = async (approval: PaymentApproval) => {
    setSelectedApproval(approval)

    // Load reference data if not loaded
    if (contractors.length === 0 || projects.length === 0 || invoiceTypes.length === 0) {
      await loadReferenceData()
    }

    // Set form values from invoice
    const invoice = approval.payment?.invoice
    if (invoice) {
      setAmountWithVat(invoice.amount_with_vat || 0)
      setVatRate(invoice.vat_rate || 20)
      setDeliveryDaysType(invoice.delivery_days_type || 'working')

      editInvoiceForm.setFieldsValue({
        invoice_number: invoice.invoice_number,
        payer_id: invoice.payer_id,
        supplier_id: invoice.supplier_id,
        project_id: invoice.project_id,
        invoice_type_id: invoice.invoice_type_id,
        invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
        due_date: invoice.due_date ? dayjs(invoice.due_date) : null,
        amount_with_vat: invoice.amount_with_vat,
        vat_rate: invoice.vat_rate || 20,
        delivery_days: invoice.delivery_days,
        delivery_days_type: invoice.delivery_days_type || 'working',
        preliminary_delivery_date: invoice.preliminary_delivery_date ? dayjs(invoice.preliminary_delivery_date) : null,
        description: invoice.description
      })
    }

    setEditInvoiceModalVisible(true)
  }

  // Handle add files click
  const handleAddFilesClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    setAddFilesModalVisible(true)
  }

  // Handle edit amount click
  const handleEditAmountClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    editAmountForm.setFieldsValue({
      amount: approval.payment?.amount || 0
    })
    setEditAmountModalVisible(true)
  }

  // Calculate VAT amounts
  const calculateVatAmounts = (amountWithVat: number, vatRate: number) => {
    const vatAmount = amountWithVat * (vatRate / (100 + vatRate))
    const amountWithoutVat = amountWithVat - vatAmount
    return { vatAmount, amountWithoutVat }
  }

  // Submit edit invoice
  const submitEditInvoice = async () => {
    if (!selectedApproval?.payment?.invoice) return

    try {
      const values = await editInvoiceForm.validateFields()
      setProcessing(true)

      // Calculate VAT amounts
      const { vatAmount, amountWithoutVat } = calculateVatAmounts(
        values.amount_with_vat,
        values.vat_rate
      )

      // Prepare update data
      const updateData = {
        invoice_number: values.invoice_number,
        payer_id: values.payer_id,
        supplier_id: values.supplier_id,
        project_id: values.project_id,
        invoice_type_id: values.invoice_type_id,
        invoice_date: values.invoice_date ? values.invoice_date.format('YYYY-MM-DD') : null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        amount_with_vat: values.amount_with_vat,
        amount_without_vat: amountWithoutVat,
        vat_amount: vatAmount,
        vat_rate: values.vat_rate,
        delivery_days: values.delivery_days,
        delivery_days_type: values.delivery_days_type,
        preliminary_delivery_date: values.preliminary_delivery_date ? values.preliminary_delivery_date.format('YYYY-MM-DD') : null,
        description: values.description
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', selectedApproval.payment.invoice.id)

      if (error) throw error

      message.success('Счёт успешно обновлён')
      setEditInvoiceModalVisible(false)
      setSelectedApproval(null)
      editInvoiceForm.resetFields()
      await loadPendingApprovals()
    } catch (error) {
      console.error('[ApprovalsPage.submitEditInvoice] Error:', error)
      message.error('Ошибка обновления счёта')
    } finally {
      setProcessing(false)
    }
  }

  // Submit edit amount
  const submitEditAmount = async () => {
    if (!selectedApproval?.payment) return

    try {
      const values = await editAmountForm.validateFields()
      setProcessing(true)

      const { error } = await supabase
        .from('payments')
        .update({ amount: values.amount })
        .eq('id', selectedApproval.payment.id)

      if (error) throw error

      message.success('Сумма платежа обновлена')
      setEditAmountModalVisible(false)
      setSelectedApproval(null)
      editAmountForm.resetFields()
      await loadPendingApprovals()
    } catch (error) {
      console.error('[ApprovalsPage.submitEditAmount] Error:', error)
      message.error('Ошибка обновления суммы платежа')
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

  // Генерация фильтров
  const projectFilters = Array.from(
    new Set(
      pendingApprovals
        .map(a => a.payment?.invoice?.project?.name)
        .filter(Boolean)
    )
  ).map(name => ({ text: name, value: name }))

  const routeFilters = Array.from(
    new Set(
      pendingApprovals
        .map(a => a.route?.name)
        .filter(Boolean)
    )
  ).map(name => ({ text: name, value: name }))

  const columns: ColumnsType<PaymentApproval> = [
    {
      title: '№',
      key: 'payment_number',
      ellipsis: true,
      sorter: (a, b) => (a.payment?.payment_number || '').localeCompare(b.payment?.payment_number || '', 'ru', { numeric: true }),
      render: (_, record) => (
        <Tooltip title={`Платёж №${record.payment?.payment_number}`}>
          <span>{record.payment?.payment_number || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Дата',
      key: 'payment_date',
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
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) => record.payment?.invoice?.project?.name === value,
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
      filters: routeFilters,
      filterSearch: true,
      onFilter: (value, record) => record.route?.name === value,
      render: (_, record) => (
        <Tooltip title={record.route?.name || '-'}>
          <span style={{ fontSize: '12px' }}>{record.route?.name || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      width: 250,
      render: (_, record) => {
        const permissions = getCurrentStagePermissions(record)

        return (
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
            {permissions.can_edit_invoice && (
              <Tooltip title="Редактировать счёт">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditInvoiceClick(record)}
                  style={{ padding: '0 6px', color: '#1890ff' }}
                />
              </Tooltip>
            )}
            {permissions.can_add_files && (
              <Tooltip title="Добавить файлы">
                <Button
                  size="small"
                  icon={<FileAddOutlined />}
                  onClick={() => handleAddFilesClick(record)}
                  style={{ padding: '0 6px', color: '#52c41a' }}
                />
              </Tooltip>
            )}
            {permissions.can_edit_amount && (
              <Tooltip title="Изменить сумму платежа">
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => handleEditAmountClick(record)}
                  style={{ padding: '0 6px', color: '#fa8c16' }}
                />
              </Tooltip>
            )}
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
            scroll={{ x: 'max-content' }}
            tableLayout="auto"
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

      {/* Modal for editing invoice */}
      <Modal
        title="Редактирование счёта"
        open={editInvoiceModalVisible}
        onOk={submitEditInvoice}
        onCancel={() => {
          setEditInvoiceModalVisible(false)
          setSelectedApproval(null)
          editInvoiceForm.resetFields()
        }}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={processing || loadingReferenceData}
        width={900}
      >
        <Form
          form={editInvoiceForm}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="invoice_number"
                label="Номер счёта"
                rules={[{ required: true, message: 'Введите номер счёта' }]}
              >
                <Input placeholder="Введите номер" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="invoice_date"
                label="Дата счёта"
                rules={[{ required: true, message: 'Выберите дату' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                  placeholder="Выберите дату"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="invoice_type_id"
                label="Тип счёта"
                rules={[{ required: true, message: 'Выберите тип' }]}
              >
                <Select
                  placeholder="Выберите тип"
                  loading={loadingReferenceData}
                  options={invoiceTypes.map(type => ({
                    value: type.id,
                    label: type.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payer_id"
                label="Плательщик"
                rules={[{ required: true, message: 'Выберите плательщика' }]}
              >
                <Select
                  placeholder="Выберите плательщика"
                  showSearch
                  optionFilterProp="children"
                  loading={loadingReferenceData}
                  options={contractors.map(c => ({
                    value: c.id,
                    label: `${c.name}${c.inn ? ` (ИНН: ${c.inn})` : ''}`
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplier_id"
                label="Поставщик"
                rules={[{ required: true, message: 'Выберите поставщика' }]}
              >
                <Select
                  placeholder="Выберите поставщика"
                  showSearch
                  optionFilterProp="children"
                  loading={loadingReferenceData}
                  options={contractors.map(c => ({
                    value: c.id,
                    label: `${c.name}${c.inn ? ` (ИНН: ${c.inn})` : ''}`
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project_id"
                label="Проект"
                rules={[{ required: true, message: 'Выберите проект' }]}
              >
                <Select
                  placeholder="Выберите проект"
                  showSearch
                  optionFilterProp="children"
                  loading={loadingReferenceData}
                  options={projects.map(p => ({
                    value: p.id,
                    label: p.name
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="due_date"
                label="Срок оплаты"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                  placeholder="Выберите дату"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="amount_with_vat"
                label="Сумма с НДС"
                rules={[
                  { required: true, message: 'Введите сумму' },
                  { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={value => value!.replace(/₽\s?|\s/g, '')}
                  precision={2}
                  onChange={(value) => {
                    if (value) {
                      setAmountWithVat(value)
                      const { vatAmount, amountWithoutVat } = calculateVatAmounts(value, vatRate)
                      // Show calculated values in UI
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_rate"
                label="Ставка НДС, %"
              >
                <Select
                  onChange={(value) => {
                    setVatRate(value)
                    const { vatAmount, amountWithoutVat } = calculateVatAmounts(amountWithVat, value)
                    // Show calculated values in UI
                  }}
                >
                  <Select.Option value={0}>Без НДС</Select.Option>
                  <Select.Option value={10}>10%</Select.Option>
                  <Select.Option value={20}>20%</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <div style={{ marginTop: 30 }}>
                <Text type="secondary">НДС: </Text>
                <Text strong>
                  {formatAmount(calculateVatAmounts(amountWithVat, vatRate).vatAmount)} ₽
                </Text>
                <br />
                <Text type="secondary">Без НДС: </Text>
                <Text strong>
                  {formatAmount(calculateVatAmounts(amountWithVat, vatRate).amountWithoutVat)} ₽
                </Text>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="delivery_days"
                label="Срок поставки (дней)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Количество дней"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="delivery_days_type"
                label="Тип дней"
              >
                <Radio.Group>
                  <Radio value="working">Рабочие</Radio>
                  <Radio value="calendar">Календарные</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="preliminary_delivery_date"
                label="Дата поставки"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                  placeholder="Выберите дату"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="description"
                label="Описание"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Введите описание счёта"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal for adding files */}
      <Modal
        title="Добавление файлов к счёту"
        open={addFilesModalVisible}
        onCancel={() => {
          setAddFilesModalVisible(false)
          setSelectedApproval(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setAddFilesModalVisible(false)
            setSelectedApproval(null)
          }}>
            Закрыть
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>
              Счёт № {selectedApproval?.payment?.invoice?.invoice_number}
            </Text>
            <br />
            <Text type="secondary">
              Функция добавления файлов будет доступна в следующей версии.
            </Text>
          </div>
          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px' }}>
            <Text type="secondary">
              <InfoCircleOutlined /> На данном этапе согласования вы можете добавлять дополнительные документы к счёту,
              но не можете удалять или изменять существующие файлы.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Modal for editing payment amount */}
      <Modal
        title="Изменение суммы платежа"
        open={editAmountModalVisible}
        onOk={submitEditAmount}
        onCancel={() => {
          setEditAmountModalVisible(false)
          setSelectedApproval(null)
          editAmountForm.resetFields()
        }}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={processing}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>
              Платеж № {selectedApproval?.payment?.payment_number}
            </Text>
            <br />
            <Text>
              По счёту № {selectedApproval?.payment?.invoice?.invoice_number}
            </Text>
            <br />
            <Text type="secondary">
              Сумма счёта: {formatAmount(selectedApproval?.payment?.invoice?.amount_with_vat || 0)} ₽
            </Text>
          </div>

          <Form
            form={editAmountForm}
            layout="vertical"
          >
            <Form.Item
              name="amount"
              label="Новая сумма платежа"
              rules={[
                { required: true, message: 'Введите сумму' },
                { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Введите сумму"
                formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={value => value!.replace(/₽\s?|\s/g, '')}
                precision={2}
              />
            </Form.Item>
          </Form>

          <div style={{ padding: '15px', background: '#fff7e6', borderRadius: '4px' }}>
            <Text type="warning">
              <InfoCircleOutlined /> Изменение суммы платежа может потребовать повторного согласования.
              Убедитесь, что новая сумма соответствует фактическим обязательствам.
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  )
}