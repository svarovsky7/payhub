import { useEffect, useCallback } from 'react'
import { Table, Button, Space, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ExpandableConfig } from 'antd/es/table/interface'
import { useAuth } from '../contexts/AuthContext'
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
    invoices,
    loading,
    invoiceModalVisible,
    setInvoiceModalVisible,
    editingInvoice,
    setEditingInvoice,
    viewModalVisible,
    setViewModalVisible,
    viewingInvoice,
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
  const handleInvoiceFormSubmit = async (values: any, files: any) => {
    console.log('[InvoicesPage.handleInvoiceFormSubmit] Submitting invoice form', values)

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
      await handleUpdateInvoice(editingInvoice.id, invoiceData, files)
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

  // Expandable configuration
  const expandable: ExpandableConfig<Invoice> = {
    expandedRowRender: (record) => (
      <PaymentsExpanded
        invoice={record}
        payments={invoicePayments[record.id] || []}
        paymentTypes={paymentTypes}
        paymentStatuses={paymentStatuses}
        loading={loadingPayments[record.id] || false}
        onEditPayment={handleEditPayment}
        onDeletePayment={handleDeletePayment}
      />
    ),
    rowExpandable: () => true,
    expandedRowKeys: Array.from(expandedRows),
    onExpand: (expanded, record) => {
      console.log('[InvoicesPage] Row expand:', expanded, record.id)
      if (expanded) {
        handleExpandRow(record.id)
      } else {
        handleExpandRow(record.id)
      }
    },
    expandRowByClick: false,
    showExpandColumn: false
  }

  return (
    <div style={{ padding: 24 }}>
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
        scroll={{ x: 1200 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
        }}
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