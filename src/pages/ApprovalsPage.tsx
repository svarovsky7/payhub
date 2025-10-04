import { useState } from 'react'
import { Card, Tag, Empty, Spin, Switch, Statistic, Row, Col } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { useApprovalManagement } from '../hooks/useApprovalManagement'
import { useAuth } from '../contexts/AuthContext'
import { useApprovalActions } from '../hooks/useApprovalActions'
import { useInvoiceEditing } from '../hooks/useInvoiceEditing'
import { useBulkApprovalActions } from '../hooks/useBulkApprovalActions'
import { useBudgetStats } from '../hooks/useBudgetStats'
import { ApprovalsTable } from '../components/approvals/ApprovalsTable'
import { GroupedApprovals } from '../components/approvals/GroupedApprovals'
import { BulkActionBar } from '../components/approvals/BulkActionBar'
import { BulkRejectModal } from '../components/approvals/BulkRejectModal'
import { ApprovalActionModals } from '../components/approvals/ApprovalActionModals'
import { ApprovalHistoryModal } from '../components/approvals/ApprovalHistoryModal'
import { EditInvoiceModal } from '../components/approvals/EditInvoiceModal'
import { EditAmountModal } from '../components/approvals/EditAmountModal'
import { AddFilesModal } from '../components/approvals/AddFilesModal'
import { PaymentsSummaryCard } from '../components/approvals/PaymentsSummaryCard'
import { ViewMaterialRequestModal } from '../components/approvals/ViewMaterialRequestModal'
import ChangeHistoryDrawer from '../components/approvals/ChangeHistoryDrawer'
import { getCurrentStagePermissions, calculateVatAmounts } from '../utils/approvalCalculations'
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

  // Material request modal state
  const [materialRequestModalVisible, setMaterialRequestModalVisible] = useState(false)
  const [selectedMaterialRequestId, setSelectedMaterialRequestId] = useState<string | null>(null)

  // Change history drawer state
  const [changeHistoryDrawerVisible, setChangeHistoryDrawerVisible] = useState(false)
  const [selectedApprovalForHistory, setSelectedApprovalForHistory] = useState<any>(null)

  // Use custom hooks for modular functionality
  const approvalActions = useApprovalActions({
    handleApprove,
    handleReject,
    getApprovalHistory,
    loadPendingApprovals
  })

  const invoiceEditing = useInvoiceEditing({
    loadPendingApprovals
  })

  const bulkActions = useBulkApprovalActions({
    userId: user?.id,
    loadPendingApprovals
  })

  const { projectBudgets, budgetStats, canShowBudgets } = useBudgetStats(pendingApprovals)

  console.log('[ApprovalsPage] Budget visibility:', { canShowBudgets, approvalsCount: pendingApprovals.length })

  // Handle material request view
  const handleViewMaterialRequest = (approval: any) => {
    console.log('[ApprovalsPage] View material request:', approval)
    const materialRequestId = approval.payment?.invoice?.material_request_id
    if (materialRequestId) {
      setSelectedMaterialRequestId(materialRequestId)
      setMaterialRequestModalVisible(true)
    }
  }

  // Handle change history view
  const handleViewChangeHistory = (approval: any) => {
    console.log('[ApprovalsPage] View change history:', approval)
    setSelectedApprovalForHistory(approval)
    setChangeHistoryDrawerVisible(true)
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

      {/* Budget statistics */}
      {canShowBudgets && projectBudgets.length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Бюджет по всем проектам"
                value={budgetStats.totalBudget}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="₽"
                valueStyle={{ fontSize: 18, color: '#52c41a' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Бюджет по текущим проектам"
                value={budgetStats.allocatedBudget}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="₽"
                valueStyle={{ fontSize: 18, color: '#1890ff' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={16}>
        {/* Main content - left side */}
        <Col xs={24} lg={18}>
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
              <BulkActionBar
                selectedIds={bulkActions.selectedIds}
                approvals={pendingApprovals}
                onApproveAll={() => bulkActions.handleBulkApprove(approvalActions.comment)}
                onRejectAll={bulkActions.handleBulkReject}
                onClearSelection={bulkActions.handleClearSelection}
                onSelectAll={(checked) => bulkActions.handleSelectAll(checked, pendingApprovals)}
                processing={bulkActions.bulkProcessing}
              />

              {groupedView ? (
                <GroupedApprovals
                  approvals={pendingApprovals}
                  selectedIds={bulkActions.selectedIds}
                  onSelectionChange={bulkActions.setSelectedIds}
                  onApprove={approvalActions.handleApproveClick}
                  onReject={approvalActions.handleRejectClick}
                  onViewHistory={handleViewChangeHistory}
                  onEditInvoice={invoiceEditing.handleEditInvoiceClick}
                  onAddFiles={invoiceEditing.handleAddFilesClick}
                  onEditAmount={invoiceEditing.handleEditAmountClick}
                  onViewMaterialRequest={handleViewMaterialRequest}
                  getCurrentStagePermissions={getCurrentStagePermissions}
                  projectBudgets={canShowBudgets ? projectBudgets : []}
                />
              ) : (
                <ApprovalsTable
                  approvals={pendingApprovals}
                  loading={loadingApprovals}
                  selectedIds={bulkActions.selectedIds}
                  onSelectionChange={bulkActions.setSelectedIds}
                  onApprove={approvalActions.handleApproveClick}
                  onReject={approvalActions.handleRejectClick}
                  onViewHistory={handleViewChangeHistory}
                  onEditInvoice={invoiceEditing.handleEditInvoiceClick}
                  onAddFiles={invoiceEditing.handleAddFilesClick}
                  onEditAmount={invoiceEditing.handleEditAmountClick}
                  onViewMaterialRequest={handleViewMaterialRequest}
                  getCurrentStagePermissions={getCurrentStagePermissions}
                />
              )}
            </>
          )}
        </Col>

        {/* Summary card - right side */}
        <Col xs={24} lg={6}>
          {pendingApprovals.length > 0 && (
            <PaymentsSummaryCard
              approvals={pendingApprovals}
              selectedIds={bulkActions.selectedIds}
            />
          )}
        </Col>
      </Row>

      <ApprovalActionModals
        approveModalVisible={approvalActions.approveModalVisible}
        setApproveModalVisible={approvalActions.setApproveModalVisible}
        onApprove={approvalActions.submitApproval}
        rejectModalVisible={approvalActions.rejectModalVisible}
        setRejectModalVisible={approvalActions.setRejectModalVisible}
        onReject={approvalActions.submitRejection}
        selectedApproval={approvalActions.selectedApproval}
        comment={approvalActions.comment}
        setComment={approvalActions.setComment}
        processing={approvalActions.processing}
        onCancel={approvalActions.resetApprovalState}
      />

      <ApprovalHistoryModal
        visible={approvalActions.historyModalVisible}
        onClose={() => {
          approvalActions.setHistoryModalVisible(false)
          approvalActions.setSelectedApproval(null)
        }}
        approvals={approvalActions.selectedApproval ? [approvalActions.selectedApproval] : []}
      />

      <EditInvoiceModal
        visible={invoiceEditing.editInvoiceModalVisible}
        onCancel={invoiceEditing.resetEditInvoiceModal}
        onSubmit={invoiceEditing.submitEditInvoice}
        processing={invoiceEditing.processing}
        loadingReferenceData={invoiceEditing.loadingReferenceData}
        form={invoiceEditing.editInvoiceForm}
        contractors={invoiceEditing.contractors}
        projects={invoiceEditing.projects}
        invoiceTypes={invoiceEditing.invoiceTypes}
        vatRate={invoiceEditing.vatRate}
        setVatRate={invoiceEditing.setVatRate}
        amountWithVat={invoiceEditing.amountWithVat}
        setAmountWithVat={invoiceEditing.setAmountWithVat}
        deliveryDaysType={invoiceEditing.deliveryDaysType}
        setDeliveryDaysType={invoiceEditing.setDeliveryDaysType}
        calculateVatAmounts={calculateVatAmounts}
      />

      <AddFilesModal
        visible={invoiceEditing.addFilesModalVisible}
        onClose={() => {
          invoiceEditing.setAddFilesModalVisible(false)
          invoiceEditing.setSelectedApproval(null)
        }}
        selectedApproval={invoiceEditing.selectedApproval}
      />

      <EditAmountModal
        visible={invoiceEditing.editAmountModalVisible}
        onCancel={invoiceEditing.resetEditAmountModal}
        onSubmit={invoiceEditing.submitEditAmount}
        processing={invoiceEditing.processing}
        form={invoiceEditing.editAmountForm}
        selectedApproval={invoiceEditing.selectedApproval}
      />

      <BulkRejectModal
        visible={bulkActions.bulkRejectModalVisible}
        selectedCount={bulkActions.selectedIds.length}
        comment={bulkActions.bulkComment}
        setComment={bulkActions.setBulkComment}
        onReject={bulkActions.submitBulkReject}
        onCancel={bulkActions.resetBulkRejectModal}
        processing={bulkActions.bulkProcessing}
        processingProgress={bulkActions.bulkProgress}
        result={bulkActions.bulkResult}
      />

      <ViewMaterialRequestModal
        visible={materialRequestModalVisible}
        materialRequestId={selectedMaterialRequestId}
        onClose={() => {
          setMaterialRequestModalVisible(false)
          setSelectedMaterialRequestId(null)
        }}
      />

      <ChangeHistoryDrawer
        visible={changeHistoryDrawerVisible}
        onClose={() => {
          setChangeHistoryDrawerVisible(false)
          setSelectedApprovalForHistory(null)
        }}
        approval={selectedApprovalForHistory}
      />
    </div>
  )
}