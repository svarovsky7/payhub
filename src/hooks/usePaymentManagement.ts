import { useState, useCallback } from 'react'
import { message, App } from 'antd'
import type { Payment, PaymentType, PaymentStatus, Invoice } from '../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  loadPaymentReferences,
  loadPaymentSummaries,
  loadInvoicePayments,
  createPayment,
  updatePayment,
  deletePayment,
  processPaymentFiles,
  getPaymentTotals
} from '../services/paymentOperations'
import { useAuth } from '../contexts/AuthContext'

export const usePaymentManagement = (invoices: Invoice[]) => {
  const { user } = useAuth()
  const { modal } = App.useApp()

  // Payment states
  const [invoicePayments, setInvoicePayments] = useState<Record<string, Payment[]>>({})
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [loadingPayments, setLoadingPayments] = useState<Record<string, boolean>>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Quick payment drawer states
  const [quickPaymentDrawerOpen, setQuickPaymentDrawerOpen] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)

  // Edit payment modal states
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  // Load payment references
  const loadReferences = useCallback(async () => {
    const { paymentTypes, paymentStatuses } = await loadPaymentReferences()
    setPaymentTypes(paymentTypes)
    setPaymentStatuses(paymentStatuses)
  }, [])

  // Load payment summaries
  const loadSummaries = useCallback(async (invoiceIds: string[]) => {
    const summaries = await loadPaymentSummaries(invoiceIds)
    setInvoicePayments(summaries)
  }, [])

  // Load payments for specific invoice
  const loadPayments = useCallback(async (invoiceId: string) => {
    setLoadingPayments(prev => ({ ...prev, [invoiceId]: true }))

    try {
      const payments = await loadInvoicePayments(invoiceId)
      setInvoicePayments(prev => ({
        ...prev,
        [invoiceId]: payments
      }))
    } finally {
      setLoadingPayments(prev => ({ ...prev, [invoiceId]: false }))
    }
  }, [])

  // Get payment totals for invoice
  const getTotals = useCallback((invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    return getPaymentTotals(invoiceId, invoicePayments, invoice)
  }, [invoices, invoicePayments])

  // Handle quick payment
  const handleQuickPayment = useCallback((invoice: Invoice) => {
    console.log('[usePaymentManagement.handleQuickPayment] Opening for invoice:', invoice.id)
    setSelectedInvoiceForPayment(invoice)
    setQuickPaymentDrawerOpen(true)
  }, [])

  // Handle quick payment submit
  const handleQuickPaymentSubmit = useCallback(async (
    invoiceId: string,
    values: any,
    files: UploadFile[] = []
  ) => {
    if (!user?.id || !selectedInvoiceForPayment) return

    try {
      await createPayment(
        selectedInvoiceForPayment.id,
        values,
        files,
        user.id,
        paymentStatuses
      )

      message.success('Платеж добавлен успешно')

      // Reload payments
      await loadPayments(selectedInvoiceForPayment.id)
      await loadSummaries(invoices.map(inv => inv.id))

      // Force state update
      setInvoicePayments(prev => ({ ...prev }))

      // Close drawer
      setQuickPaymentDrawerOpen(false)
      setSelectedInvoiceForPayment(null)

      console.log('[usePaymentManagement.handleQuickPaymentSubmit] Payment added successfully')
    } catch (error: any) {
      console.error('[usePaymentManagement.handleQuickPaymentSubmit] Error:', error)
      message.error(error.message || 'Ошибка создания платежа')
    }
  }, [user, selectedInvoiceForPayment, paymentStatuses, invoices, loadPayments, loadSummaries])

  // Handle edit payment
  const handleEditPayment = useCallback((payment: Payment) => {
    console.log('[usePaymentManagement.handleEditPayment] Editing payment:', payment.id)
    setEditingPayment(payment)
    setEditPaymentModalVisible(true)
  }, [])

  // Handle save payment
  const handleSavePayment = useCallback(async (
    paymentId: string,
    values: any,
    files: UploadFile[]
  ) => {
    if (!user?.id) return

    try {
      // Find invoice for this payment
      let paymentInvoiceId: string | null = null
      for (const [invoiceId, payments] of Object.entries(invoicePayments)) {
        if (payments.some(p => p.id === paymentId)) {
          paymentInvoiceId = invoiceId
          break
        }
      }

      console.log('[usePaymentManagement.handleSavePayment] Found invoice ID:', paymentInvoiceId)

      // Update payment
      await updatePayment(paymentId, values, files)

      // Process files
      await processPaymentFiles(paymentId, files, user.id)

      message.success('Платеж обновлен успешно')
      setEditPaymentModalVisible(false)
      setEditingPayment(null)

      // Reload payments
      const invoicesToReload = new Set<string>([...expandedRows])
      if (paymentInvoiceId) {
        invoicesToReload.add(paymentInvoiceId)
      }

      for (const invoiceId of invoicesToReload) {
        await loadPayments(invoiceId)
      }

      await loadSummaries(invoices.map(inv => inv.id))

      // Force state update
      setInvoicePayments(prev => ({ ...prev }))

      console.log('[usePaymentManagement.handleSavePayment] Payment updated successfully')
    } catch (error: any) {
      console.error('[usePaymentManagement.handleSavePayment] Error:', error)
      message.error(error.message || 'Ошибка обновления платежа')
    }
  }, [user, invoicePayments, expandedRows, invoices, loadPayments, loadSummaries])

  // Handle delete payment
  const handleDeletePayment = useCallback((paymentId: string) => {
    console.log('[usePaymentManagement.handleDeletePayment] Deleting payment:', paymentId)

    modal.confirm({
      title: 'Удалить платеж?',
      content: 'Это действие нельзя отменить. Все прикрепленные файлы также будут удалены.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deletePayment(paymentId)
          message.success('Платеж и все связанные файлы удалены')

          // Reload affected invoices
          const affectedInvoiceIds = Object.keys(invoicePayments).filter(invoiceId =>
            invoicePayments[invoiceId].some(p => p.id === paymentId)
          )

          for (const invoiceId of affectedInvoiceIds) {
            await loadPayments(invoiceId)
          }

          await loadSummaries(invoices.map(inv => inv.id))

          // Force state update
          setInvoicePayments(prev => ({ ...prev }))

          console.log('[usePaymentManagement.handleDeletePayment] Payment deleted successfully')
        } catch (error: any) {
          console.error('[usePaymentManagement.handleDeletePayment] Error:', error)
          message.error(error.message || 'Ошибка удаления платежа')
        }
      }
    })
  }, [modal, invoicePayments, invoices, loadPayments, loadSummaries])

  // Handle expand row
  const handleExpandRow = useCallback((invoiceId: string) => {
    console.log('[usePaymentManagement.handleExpandRow] Toggling row:', invoiceId)

    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
        // Load payments when expanding
        loadPayments(invoiceId)
      }
      return newSet
    })
  }, [loadPayments])

  return {
    // States
    invoicePayments,
    paymentTypes,
    paymentStatuses,
    loadingPayments,
    expandedRows,
    quickPaymentDrawerOpen,
    selectedInvoiceForPayment,
    editPaymentModalVisible,
    editingPayment,

    // Setters
    setQuickPaymentDrawerOpen,
    setSelectedInvoiceForPayment,
    setEditPaymentModalVisible,
    setEditingPayment,

    // Methods
    loadReferences,
    loadSummaries,
    loadPayments,
    getTotals,
    handleQuickPayment,
    handleQuickPaymentSubmit,
    handleEditPayment,
    handleSavePayment,
    handleDeletePayment,
    handleExpandRow
  }
}