import { useState } from 'react'
import { Card, Tag, message, Empty, Spin, Form, Switch } from 'antd'
import { supabase } from '../lib/supabase'
import { useApprovalManagement } from '../hooks/useApprovalManagement'
import { useAuth } from '../contexts/AuthContext'
import dayjs from 'dayjs'
import type { PaymentApproval } from '../services/approvalOperations'
import type { BulkApprovalResult } from '../services/approval/approvalBulk'
import { bulkApprovePayments, bulkRejectPayments } from '../services/approval/approvalBulk'
import { ApprovalsTable } from '../components/approvals/ApprovalsTable'
import { GroupedApprovals } from '../components/approvals/GroupedApprovals'
import { BulkActionBar } from '../components/approvals/BulkActionBar'
import { BulkRejectModal } from '../components/approvals/BulkRejectModal'
import { ApprovalActionModals } from '../components/approvals/ApprovalActionModals'
import { ApprovalHistoryModal } from '../components/approvals/ApprovalHistoryModal'
import { EditInvoiceModal } from '../components/approvals/EditInvoiceModal'
import { EditAmountModal } from '../components/approvals/EditAmountModal'
import { AddFilesModal } from '../components/approvals/AddFilesModal'
import '../styles/compact-table.css'
import '../styles/approvals-page.css'


export const ApprovalsPage = () => {
  const { user } = useAuth()
  const {
    pendingApprovals,
    loadingApprovals,
    userRole,
    handleApprove,
    handleReject,
    loadPendingApprovals,
    getApprovalHistory
  } = useApprovalManagement()

  console.log('[ApprovalsPage] State:', {
    userRole,
    pendingApprovalsCount: pendingApprovals.length,
    loadingApprovals,
    pendingApprovals
  })

  // View mode state
  const [groupedView, setGroupedView] = useState(true)

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal states
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [bulkRejectModalVisible, setBulkRejectModalVisible] = useState(false)
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [editInvoiceModalVisible, setEditInvoiceModalVisible] = useState(false)
  const [addFilesModalVisible, setAddFilesModalVisible] = useState(false)
  const [editAmountModalVisible, setEditAmountModalVisible] = useState(false)

  // Data states
  const [selectedApproval, setSelectedApproval] = useState<PaymentApproval | null>(null)
  const [comment, setComment] = useState('')
  const [bulkComment, setBulkComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkResult, setBulkResult] = useState<BulkApprovalResult | null>(null)

  // Form instances
  const [editAmountForm] = Form.useForm()
  const [editInvoiceForm] = Form.useForm()

  // Reference data
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
  const handleHistoryClick = async (approval: PaymentApproval) => {
    console.log('[ApprovalsPage.handleHistoryClick] Loading history for payment:', approval.payment_id)

    // Загружаем полную историю
    const history = await getApprovalHistory(approval.payment_id)
    console.log('[ApprovalsPage.handleHistoryClick] History loaded:', history)

    if (history && history.length > 0) {
      setSelectedApproval(history[0])
    } else {
      setSelectedApproval(approval)
    }

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

  // Bulk operations handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingApprovals.map(a => a.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const handleBulkApprove = async () => {
    if (!user?.id || selectedIds.length === 0) return

    console.log('[ApprovalsPage.handleBulkApprove] Starting bulk approve:', selectedIds.length)
    setBulkProcessing(true)
    setBulkProgress(0)

    try {
      const result = await bulkApprovePayments(selectedIds, user.id, comment)
      console.log('[ApprovalsPage.handleBulkApprove] Result:', result)

      if (result.successful > 0) {
        message.success(`Успешно согласовано: ${result.successful} из ${result.total}`)
      }

      if (result.failed > 0) {
        message.error(`Ошибок: ${result.failed} из ${result.total}`)
      }

      setSelectedIds([])
      setComment('')
      await loadPendingApprovals()
    } catch (error) {
      console.error('[ApprovalsPage.handleBulkApprove] Error:', error)
      message.error('Ошибка массового согласования')
    } finally {
      setBulkProcessing(false)
      setBulkProgress(0)
    }
  }

  const handleBulkReject = async () => {
    setBulkRejectModalVisible(true)
    setBulkResult(null)
  }

  const submitBulkReject = async () => {
    if (!user?.id || selectedIds.length === 0 || !bulkComment.trim()) {
      message.error('Укажите причину отклонения')
      return
    }

    console.log('[ApprovalsPage.submitBulkReject] Starting bulk reject:', selectedIds.length)
    setBulkProcessing(true)
    setBulkProgress(0)
    setBulkResult(null)

    try {
      const result = await bulkRejectPayments(selectedIds, user.id, bulkComment)
      console.log('[ApprovalsPage.submitBulkReject] Result:', result)

      setBulkResult(result)

      if (result.successful > 0) {
        message.success(`Успешно отклонено: ${result.successful} из ${result.total}`)
      }

      if (result.failed > 0) {
        message.error(`Ошибок: ${result.failed} из ${result.total}`)
      }

      // Clear selection and reload only if fully successful
      if (result.failed === 0) {
        setSelectedIds([])
        setBulkComment('')
        setBulkRejectModalVisible(false)
        await loadPendingApprovals()
      }
    } catch (error) {
      console.error('[ApprovalsPage.submitBulkReject] Error:', error)
      message.error('Ошибка массового отклонения')
    } finally {
      setBulkProcessing(false)
      setBulkProgress(0)
    }
  }


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
    <div className="approvals-page">
      <div className="approvals-page-header">
        <div className="approvals-page-header-left">
          <h1 className="approvals-page-title">Согласование платежей</h1>
          {pendingApprovals.length > 0 && (
            <Tag color="processing" className="approvals-count-tag">
              {pendingApprovals.length} {pendingApprovals.length === 1 ? 'платёж' : pendingApprovals.length < 5 ? 'платежа' : 'платежей'}
            </Tag>
          )}
        </div>
        <div className="approvals-page-header-right">
          <span style={{ marginRight: 8, color: '#595959' }}>
            {groupedView ? 'Группировка по проектам' : 'Табличный вид'}
          </span>
          <Switch
            checked={groupedView}
            onChange={setGroupedView}
            checkedChildren="Группы"
            unCheckedChildren="Таблица"
          />
        </div>
      </div>

      {loadingApprovals ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
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
        <>
          {groupedView && (
            <BulkActionBar
              selectedIds={selectedIds}
              approvals={pendingApprovals}
              onApproveAll={handleBulkApprove}
              onRejectAll={handleBulkReject}
              onClearSelection={handleClearSelection}
              onSelectAll={handleSelectAll}
              processing={bulkProcessing}
            />
          )}

          {groupedView ? (
            <GroupedApprovals
              approvals={pendingApprovals}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
              onViewHistory={handleHistoryClick}
              onEditInvoice={handleEditInvoiceClick}
              onAddFiles={handleAddFilesClick}
              onEditAmount={handleEditAmountClick}
              getCurrentStagePermissions={getCurrentStagePermissions}
            />
          ) : (
            <ApprovalsTable
              approvals={pendingApprovals}
              loading={loadingApprovals}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
              onViewHistory={handleHistoryClick}
              onEditInvoice={handleEditInvoiceClick}
              onAddFiles={handleAddFilesClick}
              onEditAmount={handleEditAmountClick}
              getCurrentStagePermissions={getCurrentStagePermissions}
            />
          )}
        </>
      )}

      <ApprovalActionModals
        approveModalVisible={approveModalVisible}
        setApproveModalVisible={setApproveModalVisible}
        onApprove={submitApproval}
        rejectModalVisible={rejectModalVisible}
        setRejectModalVisible={setRejectModalVisible}
        onReject={submitRejection}
        selectedApproval={selectedApproval}
        comment={comment}
        setComment={setComment}
        processing={processing}
        onCancel={() => {
          setApproveModalVisible(false)
          setRejectModalVisible(false)
          setSelectedApproval(null)
          setComment('')
        }}
      />

      <ApprovalHistoryModal
        visible={historyModalVisible}
        onClose={() => {
          setHistoryModalVisible(false)
          setSelectedApproval(null)
        }}
        approvals={selectedApproval ? [selectedApproval] : []}
      />

      <EditInvoiceModal
        visible={editInvoiceModalVisible}
        onCancel={() => {
          setEditInvoiceModalVisible(false)
          setSelectedApproval(null)
          editInvoiceForm.resetFields()
        }}
        onSubmit={submitEditInvoice}
        processing={processing}
        loadingReferenceData={loadingReferenceData}
        form={editInvoiceForm}
        contractors={contractors}
        projects={projects}
        invoiceTypes={invoiceTypes}
        vatRate={vatRate}
        setVatRate={setVatRate}
        amountWithVat={amountWithVat}
        setAmountWithVat={setAmountWithVat}
        deliveryDaysType={deliveryDaysType}
        setDeliveryDaysType={setDeliveryDaysType}
        calculateVatAmounts={calculateVatAmounts}
      />

      <AddFilesModal
        visible={addFilesModalVisible}
        onClose={() => {
          setAddFilesModalVisible(false)
          setSelectedApproval(null)
        }}
        selectedApproval={selectedApproval}
      />

      <EditAmountModal
        visible={editAmountModalVisible}
        onCancel={() => {
          setEditAmountModalVisible(false)
          setSelectedApproval(null)
          editAmountForm.resetFields()
        }}
        onSubmit={submitEditAmount}
        processing={processing}
        form={editAmountForm}
        selectedApproval={selectedApproval}
      />

      <BulkRejectModal
        visible={bulkRejectModalVisible}
        selectedCount={selectedIds.length}
        comment={bulkComment}
        setComment={setBulkComment}
        onReject={submitBulkReject}
        onCancel={() => {
          setBulkRejectModalVisible(false)
          setBulkComment('')
          setBulkResult(null)
        }}
        processing={bulkProcessing}
        processingProgress={bulkProgress}
        result={bulkResult}
      />
    </div>
  )
}