import { useState, useCallback, useEffect } from 'react'
import { message, App } from 'antd'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus } from '../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  loadReferences,
  loadInvoices,
  loadSingleInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recalculateAllInvoiceStatuses
} from '../services/invoiceOperations'
import { loadEmployees } from '../services/employeeOperations'
import type { Employee } from '../services/employeeOperations'
import { useAuth } from '../contexts/AuthContext'
import dayjs from 'dayjs'

export const useInvoiceManagement = () => {
  const { user } = useAuth()
  const { modal } = App.useApp()

  // Reference data states
  const [payers, setPayers] = useState<Contractor[]>([])
  const [suppliers, setSuppliers] = useState<Contractor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Invoice states
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  // Modal states
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)

  // Log editingInvoice changes
  useEffect(() => {
  }, [editingInvoice])

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    const refs = await loadReferences()
    const emps = await loadEmployees()
    setPayers(refs.payers)
    setSuppliers(refs.suppliers)
    setProjects(refs.projects)
    setInvoiceTypes(refs.invoiceTypes)
    setInvoiceStatuses(refs.invoiceStatuses)
    setEmployees(emps)
  }, [])

  // Load invoices
  const loadInvoiceData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)

    try {
      // Пересчитываем статусы всех счетов перед загрузкой
      await recalculateAllInvoiceStatuses()

      const data = await loadInvoices(user.id)
      setInvoices(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initialize data on mount
  useEffect(() => {
    if (user?.id) {
      loadReferenceData()
      loadInvoiceData()
    }
  }, [user, loadReferenceData, loadInvoiceData])

  // Create invoice
  const handleCreateInvoice = useCallback(async (
    values: any,
    files: UploadFile[] = []
  ) => {
    if (!user?.id) return


    try {
      const invoiceData = {
        ...values,
        invoice_date: values.invoice_date ? dayjs(values.invoice_date).format('YYYY-MM-DD') : null,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : null,
        preliminary_delivery_date: values.preliminary_delivery_date
          ? dayjs(values.preliminary_delivery_date).format('YYYY-MM-DD')
          : null,
        amount_with_vat: values.amount_with_vat || 0,
        vat_rate: values.vat_rate || 20,
        vat_amount: values.vat_amount || 0,
        amount_without_vat: values.amount_without_vat || 0,
        relevance_date: dayjs().toISOString() // Автоматически устанавливаем дату актуальности при создании
      }

      await createInvoice(invoiceData, files, user.id)

      message.success('Счёт создан успешно')

      // First set editingInvoice to null to trigger form reset
      setEditingInvoice(null)
      // Then close modal
      setInvoiceModalVisible(false)


      // Load data after state reset
      await loadInvoiceData()

    } catch (error: any) {
      console.error('[useInvoiceManagement.handleCreateInvoice] Error:', error)
      message.error(error.message || 'Ошибка создания счёта')
    }
  }, [user, invoiceStatuses, loadInvoiceData])

  // Update invoice
  const handleUpdateInvoice = useCallback(async (
    invoiceId: string,
    values: any,
    files: UploadFile[] = [],
    originalFiles?: UploadFile[]
  ) => {
    if (!user?.id) return


    try {
      const invoiceData = {
        ...values,
        invoice_date: values.invoice_date ? dayjs(values.invoice_date).format('YYYY-MM-DD') : null,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : null,
        preliminary_delivery_date: values.preliminary_delivery_date
          ? dayjs(values.preliminary_delivery_date).format('YYYY-MM-DD')
          : null,
        amount_with_vat: values.amount_with_vat || 0,
        vat_rate: values.vat_rate || 20,
        vat_amount: values.vat_amount || 0,
        amount_without_vat: values.amount_without_vat || 0
      }

      await updateInvoice(invoiceId, invoiceData, files, user.id, originalFiles)

      message.success('Счёт обновлён успешно')
      setInvoiceModalVisible(false)
      setEditingInvoice(null)
      await loadInvoiceData()

    } catch (error: any) {
      console.error('[useInvoiceManagement.handleUpdateInvoice] Error:', error)
      message.error(error.message || 'Ошибка обновления счёта')
    }
  }, [user, loadInvoiceData])

  // Delete invoice
  const handleDeleteInvoice = useCallback((invoiceId: string) => {

    modal.confirm({
      title: 'Удалить счёт?',
      content: 'Это действие нельзя отменить. Все связанные платежи и файлы также будут удалены.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteInvoice(invoiceId)
          message.success('Счёт и все связанные данные удалены')
          await loadInvoiceData()

        } catch (error: any) {
          console.error('[useInvoiceManagement.handleDeleteInvoice] Error:', error)
          message.error(error.message || 'Ошибка удаления счёта')
        }
      }
    })
  }, [modal, loadInvoiceData])

  // Open create invoice modal
  const handleOpenCreateModal = useCallback(() => {
    setEditingInvoice(null)
    setInvoiceModalVisible(true)
  }, [])

  // Open edit invoice modal
  const handleOpenEditModal = useCallback((invoice: Invoice) => {
    setEditingInvoice(invoice)
    setInvoiceModalVisible(true)
  }, [])

  // View invoice
  const handleViewInvoice = useCallback(async (invoice: Invoice) => {

    const fullInvoice = await loadSingleInvoice(invoice.id)
    if (fullInvoice) {
      setViewingInvoice(fullInvoice)
      setViewModalVisible(true)
    }
  }, [])

  return {
    // Reference data
    payers,
    suppliers,
    projects,
    invoiceTypes,
    invoiceStatuses,
    employees,

    // Invoices
    invoices,
    loading,

    // Modal states
    invoiceModalVisible,
    setInvoiceModalVisible,
    editingInvoice,
    setEditingInvoice,
    viewModalVisible,
    setViewModalVisible,
    viewingInvoice,
    setViewingInvoice,

    // Actions
    loadReferenceData,
    loadInvoiceData,
    handleCreateInvoice,
    handleUpdateInvoice,
    handleDeleteInvoice,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewInvoice
  }
}