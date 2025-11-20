import { useEffect, useCallback, useState } from 'react'
import { Table, Button, Space, Switch, Tabs } from 'antd'
import { PlusOutlined, FileOutlined } from '@ant-design/icons'
import type { ExpandableConfig } from 'antd/es/table/interface'
import { useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import '../styles/InvoicesPage.css'
import { useInvoiceManagement } from '../hooks/useInvoiceManagement'
import { usePaymentManagement } from '../hooks/usePaymentManagement'
import { useInvoiceForm } from '../hooks/useInvoiceForm'
import { useColumnSettings } from '../hooks/useColumnSettings'
import { formatAmount, parseAmount } from '../utils/invoiceHelpers'
import { getInvoiceTableColumns } from '../components/invoices/InvoiceTableColumns'
import { PaymentsExpanded } from '../components/invoices/PaymentsExpanded'
import { InvoiceFormModal } from '../components/invoices/InvoiceFormModal'
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal'
import { QuickPaymentDrawer } from '../components/invoices/QuickPaymentDrawer'
import { PaymentEditModal } from '../components/invoices/PaymentEditModal'
import { ColumnSettings } from '../components/common/ColumnSettings'
import InvoiceHistoryModal from '../components/invoices/InvoiceHistoryModal'
import { ImportInvoicesModal } from '../components/invoices/ImportInvoicesModal'
import { BulkPaymentsModal } from '../components/invoices/BulkPaymentsModal'
import type { Invoice } from '../lib/supabase'
import '../styles/compact-table.css'

type InvoiceTabKey = 'active' | 'pending' | 'in-payment' | 'paid' | 'cancelled';

const TABS: Record<InvoiceTabKey, { label: string; statuses: string[] }> = {
  active: {
    label: 'Активные счета',
    statuses: ['draft', 'not_filled', 'partial'],
  },
  pending: {
    label: 'На согласовании',
    statuses: ['pending'],
  },
  'in-payment': {
    label: 'В оплате',
    statuses: ['approved'],
  },
  paid: {
    label: 'Оплаченные',
    statuses: ['paid'],
  },
  cancelled: {
    label: 'Аннулированные счета',
    statuses: ['cancelled'],
  },
};

export const InvoicesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showArchived, setShowArchived] = useState(false)
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [viewingHistoryInvoice, setViewingHistoryInvoice] = useState<Invoice | null>(null)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [bulkPaymentsModalVisible, setBulkPaymentsModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<InvoiceTabKey>(() => {
    const tabFromUrl = searchParams.get('tab')
    return (tabFromUrl && Object.keys(TABS).includes(tabFromUrl)) ? (tabFromUrl as InvoiceTabKey) : 'active'
  })

  // Sync activeTab to URL
  useEffect(() => {
    setSearchParams({ tab: activeTab })
  }, [activeTab, setSearchParams])

  // Use invoice form hook
  const {
    form,
    amountWithVat,
    setAmountWithVat,
    vatRate,
    setVatRate,
    vatAmount,
    amountWithoutVat,
    deliveryDays,
    setDeliveryDays,
    deliveryDaysType,
    setDeliveryDaysType,
    invoiceDate,
    setInvoiceDate,
    preliminaryDeliveryDate,
    resetForm,
    populateForm,
    // New fields
    materialRequests,
    contracts,
    loadingReferences,
    loadReferences,
    handleContractSelect
  } = useInvoiceForm()

  // Use invoice management hook
  const {
    payers,
    suppliers,
    projects,
    invoiceTypes,
    invoiceStatuses,
    employees,
    invoices,
    loading,
    invoiceModalVisible,
    setInvoiceModalVisible,
    editingInvoice,
    setEditingInvoice,
    viewModalVisible,
    setViewModalVisible,
    viewingInvoice,
    setViewingInvoice,
    loadInvoiceData,
    handleCreateInvoice,
    handleUpdateInvoice,
    handleDeleteInvoice,
    handleOpenCreateModal: originalHandleOpenCreateModal,
    handleOpenEditModal,
    handleViewInvoice,
    handleSaveInvoiceAsDraft
  } = useInvoiceManagement(showArchived)

  // Wrap handleOpenCreateModal to ensure form reset and load references
  const handleOpenCreateModal = useCallback(() => {
    resetForm()  // Force reset form before opening
    loadReferences()  // Load material requests and contracts
    originalHandleOpenCreateModal()
  }, [originalHandleOpenCreateModal, resetForm, loadReferences])

  // Populate form when editing invoice changes
  useEffect(() => {
    console.log('[InvoicesPage] editingInvoice changed:', editingInvoice)
    if (editingInvoice) {
      console.log('[InvoicesPage] Loading references and populating form')
      loadReferences()  // Load material requests and contracts for editing
      // Add delay to ensure form is ready
      setTimeout(() => {
        populateForm(editingInvoice)
      }, 100)
    } else {
      console.log('[InvoicesPage] Resetting form')
      resetForm()
    }
  }, [editingInvoice, populateForm, resetForm, loadReferences])

  // Use payment management hook
  const {
    invoicePayments,
    paymentTypes,
    paymentStatuses,
    loadingPayments,
    expandedRows,
    quickPaymentDrawerOpen,
    selectedInvoiceForPayment,
    setQuickPaymentDrawerOpen,
    setSelectedInvoiceForPayment,
    editPaymentModalVisible,
    editingPayment,
    setEditPaymentModalVisible,
    setEditingPayment,
    loadReferences: loadPaymentReferences,
    loadSummaries,
    getTotals,
    handleQuickPayment,
    handleQuickPaymentSubmit,
    handleEditPayment,
    handleSavePayment,
    handleDeletePayment,
    handleExpandRow,
    handleBulkPaymentSubmit
  } = usePaymentManagement(invoices)

  // Load payment references and summaries when component mounts
  useEffect(() => {
    loadPaymentReferences()
  }, [])

  // Load payment summaries when invoices change
  useEffect(() => {
    if (invoices.length > 0) {
      loadSummaries(invoices.map(inv => inv.id))
    }
  }, [invoices, loadSummaries])

  // Handle archive invoice
  const handleArchiveInvoice = async (invoiceId: string, isArchived: boolean) => {
    try {
      const { archiveInvoice } = await import('../services/invoiceOperations')
      await archiveInvoice(invoiceId, isArchived)
      await loadInvoiceData()
      const { message } = await import('antd')
      message.success(isArchived ? 'Счёт перемещен в архив' : 'Счёт восстановлен из архива')
    } catch (error) {
      console.error('[InvoicesPage.handleArchiveInvoice] Error:', error)
      const { message } = await import('antd')
      message.error('Ошибка архивирования счёта')
    }
  }

  // Handle view history
  const handleViewHistory = (invoice: Invoice) => {
    setViewingHistoryInvoice(invoice)
    setHistoryModalVisible(true)
  }

  // Handle invoice form submit
  const handleInvoiceFormSubmit = async (values: Record<string, any>, files: File[], originalFiles?: string[]) => {

    // Add VAT calculation data to form values
    // Remove VAT-related fields from form values to avoid conflicts with state values
    const {
      vat_rate: formVatRate,
      amount_with_vat: formAmountWithVat,
      ...cleanValues
    } = values

    const invoiceData = {
      ...cleanValues,
      amount_with_vat: amountWithVat || 0,
      vat_rate: vatRate || 20, // Use state value, not form value
      vat_amount: vatAmount || 0,
      amount_without_vat: amountWithoutVat || 0,
      delivery_days: deliveryDays,
      delivery_days_type: deliveryDaysType,
      preliminary_delivery_date: preliminaryDeliveryDate
    }


    if (editingInvoice) {
      await handleUpdateInvoice(editingInvoice.id, invoiceData, files, originalFiles)
    } else {
      await handleCreateInvoice(invoiceData, files)
    }
  }

  // Table columns
  const allColumns = getInvoiceTableColumns({
    invoices,
    invoiceStatuses,
    invoiceTypes,
    payers,
    suppliers,
    projects,
    getPaymentTotals: getTotals,
    handleQuickPayment,
    handleViewInvoice,
    handleEditInvoice: handleOpenEditModal,
    handleDeleteInvoice,
    handleArchiveInvoice,
    handleViewHistory
  })

  // Column settings
  const { columnConfig, setColumnConfig, visibleColumns, defaultConfig } = useColumnSettings(
    allColumns,
    'invoices_column_settings'
  )

  // Filter invoices based on payment status
  const getFilteredInvoices = () => {
    const currentStatuses = TABS[activeTab].statuses;
    return invoices.filter(invoice => {
      return invoice.invoice_status?.code && currentStatuses.includes(invoice.invoice_status.code)
    })
  }

  const filteredInvoices = getFilteredInvoices()

  // Expandable configuration
  const expandable: ExpandableConfig<Invoice> = {
    expandedRowRender: (record) => {
      const payments = invoicePayments[record.id] || []

      return (
        <PaymentsExpanded
          invoice={record}
          payments={payments}
          paymentTypes={paymentTypes}
          paymentStatuses={paymentStatuses}
          loading={loadingPayments[record.id] || false}
          onEditPayment={handleEditPayment}
          onDeletePayment={handleDeletePayment}
          onApprovalStarted={loadInvoiceData}
        />
      )
    },
    rowExpandable: () => true,
    expandedRowKeys: Array.from(expandedRows),
    onExpand: (_expanded, record) => {
      handleExpandRow(record.id)
    },
    expandRowByClick: true, // Включаем раскрытие по клику на строку
    showExpandColumn: false,
    expandedRowClassName: () => 'expanded-row-animated'
  }

  return (
    <div style={{ padding: 24, width: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Счета</h1>
        <Space>
          {selectedInvoiceIds.length > 0 && (
            <Button
              type="dashed"
              onClick={() => setBulkPaymentsModalVisible(true)}
            >
              Создать платежи ({selectedInvoiceIds.length})
            </Button>
          )}
          <Switch
            checked={showArchived}
            onChange={setShowArchived}
            checkedChildren="Показаны архивные"
            unCheckedChildren="Скрыты архивные"
          />
          <ColumnSettings
            columns={columnConfig}
            onChange={setColumnConfig}
            defaultColumns={defaultConfig}
          />
          <Button
            icon={<FileOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            Импорт Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            Добавить счёт
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as InvoiceTabKey)}
        items={Object.entries(TABS).map(([key, { label }]) => ({
          key,
          label,
          children: (
            <div className="table-scroll-container">
              <Table
                columns={visibleColumns}
                dataSource={filteredInvoices}
                rowKey="id"
                loading={loading}
                expandable={expandable}
                rowSelection={{
                  selectedRowKeys: selectedInvoiceIds,
                  onChange: (selectedKeys) => setSelectedInvoiceIds(selectedKeys as string[]),
                  checkStrictly: true,
                }}
                rowClassName={(record) => {
                  const classes = [];

                  // Подсветка архивных счетов
                  if (record.is_archived) {
                    classes.push('archived-invoice-row');
                  }

                  // Подсветка устаревших счетов (более 30 дней)
                  if (record.relevance_date) {
                    const daysSinceRelevance = dayjs().diff(dayjs(record.relevance_date), 'day')
                    if (daysSinceRelevance > 30) {
                      classes.push('outdated-invoice-row');
                    }
                  }

                  return classes.join(' ');
                }}
                pagination={{
                  defaultPageSize: 100,
                  showSizeChanger: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
                  pageSizeOptions: ['50', '100', '200']
                }}
                onRow={() => ({
                  style: { cursor: 'pointer' }
                })}
                className="expandable-table-smooth compact-table"
                tableLayout="auto"
                style={{ width: '100%' }}
                scroll={{ x: 'max-content' }}
              />
            </div>
          )
        }))}
      />

      {/* Invoice Form Modal */}
      <InvoiceFormModal
        isVisible={invoiceModalVisible}
        editingInvoice={editingInvoice}
        onClose={() => {
          setInvoiceModalVisible(false)
          setEditingInvoice(null)
          resetForm()
        }}
        onSubmit={handleInvoiceFormSubmit}
        form={form}
        payers={payers}
        suppliers={suppliers}
        projects={projects}
        invoiceTypes={invoiceTypes}
        invoiceStatuses={invoiceStatuses}
        employees={employees}
        amountWithVat={amountWithVat}
        onAmountWithVatChange={setAmountWithVat}
        vatRate={vatRate}
        onVatRateChange={setVatRate}
        vatAmount={vatAmount}
        amountWithoutVat={amountWithoutVat}
        deliveryDays={deliveryDays}
        onDeliveryDaysChange={setDeliveryDays}
        deliveryDaysType={deliveryDaysType}
        onDeliveryDaysTypeChange={setDeliveryDaysType}
        invoiceDate={invoiceDate}
        onInvoiceDateChange={setInvoiceDate}
        preliminaryDeliveryDate={preliminaryDeliveryDate}
        formatAmount={formatAmount}
        parseAmount={parseAmount}
        // New props for material requests and contracts
        materialRequests={materialRequests}
        contracts={contracts}
        onContractSelect={handleContractSelect}
        loadingReferences={loadingReferences}
        onSaveAsDraft={handleSaveInvoiceAsDraft}
      />

      {/* Invoice View Modal */}
      <InvoiceViewModal
        isVisible={viewModalVisible}
        invoice={viewingInvoice}
        payers={payers}
        suppliers={suppliers}
        projects={projects}
        invoiceTypes={invoiceTypes}
        invoiceStatuses={invoiceStatuses}
        onClose={() => {
          setViewModalVisible(false)
          setViewingInvoice(null)
        }}
      />

      {/* Quick Payment Drawer */}
      {selectedInvoiceForPayment && (() => {
        const totals = getTotals(selectedInvoiceForPayment.id)
        return (
          <QuickPaymentDrawer
            open={quickPaymentDrawerOpen}
            onClose={() => {
              setQuickPaymentDrawerOpen(false)
              setSelectedInvoiceForPayment(null)
            }}
            onSubmit={handleQuickPaymentSubmit}
            invoice={selectedInvoiceForPayment}
            paymentTypes={paymentTypes}
            paymentStatuses={paymentStatuses}
            totalPaid={totals.totalPaid}
            remainingAmount={totals.remainingAmount}
            paymentsByStatus={totals.paymentsByStatus}
          />
        )
      })()}

      {/* Payment Edit Modal */}
      {editingPayment && (
        <PaymentEditModal
          visible={editPaymentModalVisible}
          onCancel={() => {
            setEditPaymentModalVisible(false)
            setEditingPayment(null)
          }}
          onSave={handleSavePayment}
          payment={editingPayment}
          paymentTypes={paymentTypes}
          paymentStatuses={paymentStatuses}
        />
      )}

      {/* Invoice History Modal */}
      <InvoiceHistoryModal
        visible={historyModalVisible}
        onClose={() => {
          setHistoryModalVisible(false)
          setViewingHistoryInvoice(null)
        }}
        invoice={viewingHistoryInvoice}
      />

      {/* Import Invoices Modal */}
      <ImportInvoicesModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => loadInvoiceData()}
      />

      {/* Bulk Payments Modal */}
      <BulkPaymentsModal
        visible={bulkPaymentsModalVisible}
        onClose={() => setBulkPaymentsModalVisible(false)}
        invoices={filteredInvoices}
        selectedInvoiceIds={selectedInvoiceIds}
        paymentTypes={paymentTypes}
        onSubmit={async (invoiceIds, values) => {
          await handleBulkPaymentSubmit(invoiceIds, values)
          setSelectedInvoiceIds([])
        }}
      />

      {/* Legend */}
      <div style={{ marginTop: 32, padding: 16, backgroundColor: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Пояснения к подсветке счетов</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 20, height: 20, backgroundColor: 'rgba(255, 77, 79, 0.15)', border: '2px solid rgba(255, 77, 79, 0.5)', borderRadius: 4 }} />
            <span>Устаревший счет (более 30 дней)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 20, height: 20, backgroundColor: 'rgba(0, 0, 0, 0.08)', border: '2px solid rgba(140, 140, 140, 0.3)', borderRadius: 4 }} />
            <span>Архивный счет</span>
          </div>
        </div>
      </div>
    </div>
  )
}