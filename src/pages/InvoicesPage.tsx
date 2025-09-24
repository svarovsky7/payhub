import { useEffect, useCallback } from 'react'
import { Table, Button, Space, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ExpandableConfig } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import '../styles/InvoicesPage.css'
import { useInvoiceManagement } from '../hooks/useInvoiceManagement'
import { usePaymentManagement } from '../hooks/usePaymentManagement'
import { useInvoiceForm } from '../hooks/useInvoiceForm'
import { formatAmount, parseAmount } from '../utils/invoiceHelpers'
import { getInvoiceTableColumns } from '../components/invoices/InvoiceTableColumns'
import { PaymentsExpanded } from '../components/invoices/PaymentsExpanded'
import { InvoiceFormModal } from '../components/invoices/InvoiceFormModal'
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal'
import { QuickPaymentDrawer } from '../components/invoices/QuickPaymentDrawer'
import { PaymentEditModal } from '../components/invoices/PaymentEditModal'
import type { Invoice } from '../lib/supabase'
import '../styles/compact-table.css'

export const InvoicesPage = () => {
  const { user } = useAuth()
  const { } = App.useApp()

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
    populateForm
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
    handleViewInvoice
  } = useInvoiceManagement()

  // Wrap handleOpenCreateModal to ensure form reset
  const handleOpenCreateModal = useCallback(() => {
    console.log('[InvoicesPage] Wrapped handleOpenCreateModal called')
    resetForm()  // Force reset form before opening
    originalHandleOpenCreateModal()
  }, [originalHandleOpenCreateModal, resetForm])

  // Populate form when editing invoice changes
  useEffect(() => {
    console.log('[InvoicesPage] useEffect for editingInvoice triggered')
    console.log('[InvoicesPage] editingInvoice value:', editingInvoice?.invoice_number || 'null')
    if (editingInvoice) {
      console.log('[InvoicesPage] Calling populateForm with invoice:', editingInvoice.invoice_number)
      populateForm(editingInvoice)
    } else {
      console.log('[InvoicesPage] Calling resetForm because editingInvoice is null')
      resetForm()
    }
  }, [editingInvoice, populateForm, resetForm])

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
    handleExpandRow
  } = usePaymentManagement(invoices)

  // Load payment references and summaries when component mounts
  useEffect(() => {
    if (user?.id) {
      console.log('[InvoicesPage] Loading payment references')
      loadPaymentReferences()
    }
  }, [user, loadPaymentReferences])

  // Load payment summaries when invoices change
  useEffect(() => {
    if (invoices.length > 0) {
      console.log('[InvoicesPage] Loading payment summaries for', invoices.length, 'invoices')
      loadSummaries(invoices.map(inv => inv.id))
    }
  }, [invoices, loadSummaries])

  // Handle view payments
  const handleViewPayments = (invoice: Invoice) => {
    console.log('[InvoicesPage.handleViewPayments] Toggling payments view for invoice:', invoice.id)
    handleExpandRow(invoice.id)
  }

  // Handle invoice form submit
  const handleInvoiceFormSubmit = async (values: any, files: any, originalFiles?: any) => {
    console.log('[InvoicesPage.handleInvoiceFormSubmit] Submitting invoice form', values)
    console.log('[InvoicesPage.handleInvoiceFormSubmit] Files:', files)
    console.log('[InvoicesPage.handleInvoiceFormSubmit] Original files:', originalFiles)

    // Add VAT calculation data to form values
    const invoiceData = {
      ...values,
      amount_with_vat: amountWithVat,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_without_vat: amountWithoutVat,
      delivery_days: deliveryDays,
      delivery_days_type: deliveryDaysType,
      preliminary_delivery_date: preliminaryDeliveryDate
    }

    console.log('[InvoicesPage.handleInvoiceFormSubmit] Invoice data with amounts:', invoiceData)

    if (editingInvoice) {
      await handleUpdateInvoice(editingInvoice.id, invoiceData, files, originalFiles)
    } else {
      await handleCreateInvoice(invoiceData, files)
    }
  }

  // Table columns
  const columns = getInvoiceTableColumns({
    invoices,
    invoiceStatuses,
    invoiceTypes,
    payers,
    suppliers,
    projects,
    getPaymentTotals: getTotals,
    handleQuickPayment,
    handleViewPayments,
    handleViewInvoice,
    handleEditInvoice: handleOpenEditModal,
    handleDeleteInvoice,
    handleExpandRow,
    expandedRows
  })

  // Debug expanded rows
  useEffect(() => {
    console.log('[InvoicesPage] Current expanded rows:', Array.from(expandedRows))
  }, [expandedRows])

  // Expandable configuration
  const expandable: ExpandableConfig<Invoice> = {
    expandedRowRender: (record) => {
      console.log('[InvoicesPage] Rendering expanded row for invoice:', record.id)
      const payments = invoicePayments[record.id] || []
      console.log('[InvoicesPage] Payments for invoice:', record.id, payments)

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
    onExpand: (expanded, record) => {
      console.log('[InvoicesPage] onExpand called:', expanded, record.id)
      console.log('[InvoicesPage] Current expanded rows before:', Array.from(expandedRows))
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            Добавить счёт
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={invoices}
        rowKey="id"
        loading={loading}
        expandable={expandable}
        scroll={{ x: true }}
        tableLayout="auto"
        rowClassName={(record) => {
          // Подсветка устаревших счетов (более 30 дней)
          if (record.relevance_date) {
            const daysSinceRelevance = dayjs().diff(dayjs(record.relevance_date), 'day')
            if (daysSinceRelevance > 30) {
              return 'outdated-invoice-row'
            }
          }
          return ''
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        onRow={() => ({
          style: { cursor: 'pointer' }
        })}
        className="expandable-table-smooth"
        style={{ width: '100%' }}
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
      {selectedInvoiceForPayment && (
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
          totalPaid={getTotals(selectedInvoiceForPayment.id).totalPaid}
          remainingAmount={getTotals(selectedInvoiceForPayment.id).remainingAmount}
        />
      )}

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
    </div>
  )
}