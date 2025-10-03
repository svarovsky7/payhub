import { useState } from 'react'
import { Form, message } from 'antd'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import type { PaymentApproval } from '../services/approvalOperations'
import { calculateVatAmounts } from '../utils/approvalCalculations'

interface UseInvoiceEditingProps {
  loadPendingApprovals: () => Promise<void>
}

export const useInvoiceEditing = ({ loadPendingApprovals }: UseInvoiceEditingProps) => {
  const [editInvoiceModalVisible, setEditInvoiceModalVisible] = useState(false)
  const [addFilesModalVisible, setAddFilesModalVisible] = useState(false)
  const [editAmountModalVisible, setEditAmountModalVisible] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<PaymentApproval | null>(null)
  const [processing, setProcessing] = useState(false)

  // Reference data
  const [contractors, setContractors] = useState<Record<string, unknown>[]>([])
  const [projects, setProjects] = useState<Record<string, unknown>[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<Record<string, unknown>[]>([])
  const [loadingReferenceData, setLoadingReferenceData] = useState(false)

  // Form state
  const [vatRate, setVatRate] = useState(20)
  const [amountWithVat, setAmountWithVat] = useState(0)
  const [deliveryDaysType, setDeliveryDaysType] = useState<'working' | 'calendar'>('working')

  // Form instances
  const [editAmountForm] = Form.useForm()
  const [editInvoiceForm] = Form.useForm()

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
      console.error('[useInvoiceEditing.loadReferenceData] Error:', error)
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
      console.error('[useInvoiceEditing.submitEditInvoice] Error:', error)
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
      console.error('[useInvoiceEditing.submitEditAmount] Error:', error)
      message.error('Ошибка обновления суммы платежа')
    } finally {
      setProcessing(false)
    }
  }

  // Reset edit invoice modal
  const resetEditInvoiceModal = () => {
    setEditInvoiceModalVisible(false)
    setSelectedApproval(null)
    editInvoiceForm.resetFields()
  }

  // Reset edit amount modal
  const resetEditAmountModal = () => {
    setEditAmountModalVisible(false)
    setSelectedApproval(null)
    editAmountForm.resetFields()
  }

  return {
    // Modal visibility
    editInvoiceModalVisible,
    setEditInvoiceModalVisible,
    addFilesModalVisible,
    setAddFilesModalVisible,
    editAmountModalVisible,
    setEditAmountModalVisible,
    // Data
    selectedApproval,
    setSelectedApproval,
    processing,
    // Reference data
    contractors,
    projects,
    invoiceTypes,
    loadingReferenceData,
    // Form state
    vatRate,
    setVatRate,
    amountWithVat,
    setAmountWithVat,
    deliveryDaysType,
    setDeliveryDaysType,
    // Forms
    editAmountForm,
    editInvoiceForm,
    // Handlers
    handleEditInvoiceClick,
    handleAddFilesClick,
    handleEditAmountClick,
    submitEditInvoice,
    submitEditAmount,
    resetEditInvoiceModal,
    resetEditAmountModal
  }
}
