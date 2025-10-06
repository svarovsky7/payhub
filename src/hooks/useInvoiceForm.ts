import { useState, useEffect, useCallback } from 'react'
import { Form, message } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { calculateVat, calculatePreliminaryDeliveryDate } from '../utils/vatCalculator'
import type { Invoice } from '../lib/supabase'
import { loadMaterialRequests } from '../services/materialRequestOperations'
import { loadContracts } from '../services/contractOperations'
import type { MaterialRequest } from '../services/materialRequestOperations'
import type { Contract } from '../services/contractOperations'

export const useInvoiceForm = () => {
  const [form] = Form.useForm()
  const [amountWithVat, setAmountWithVat] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(20)
  const [vatAmount, setVatAmount] = useState<number>(0)
  const [amountWithoutVat, setAmountWithoutVat] = useState<number>(0)
  const [deliveryDays, setDeliveryDays] = useState<number | undefined>()
  const [deliveryDaysType, setDeliveryDaysType] = useState<'working' | 'calendar'>('calendar')
  const [invoiceDate, setInvoiceDate] = useState<Dayjs>(dayjs())
  const [preliminaryDeliveryDate, setPreliminaryDeliveryDate] = useState<Dayjs | null>(null)

  // New states for material requests and contracts
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loadingReferences, setLoadingReferences] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  // Calculate VAT when amount or rate changes
  useEffect(() => {
    const result = calculateVat(amountWithVat, vatRate)
    setVatAmount(result.vatAmount)
    setAmountWithoutVat(result.amountWithoutVat)
  }, [amountWithVat, vatRate])

  // Calculate delivery date when parameters change
  useEffect(() => {
    const date = calculatePreliminaryDeliveryDate({
      invoiceDate,
      deliveryDays,
      deliveryDaysType
    })
    setPreliminaryDeliveryDate(date)
  }, [invoiceDate, deliveryDays, deliveryDaysType])

  // Load material requests and contracts
  const loadReferences = useCallback(async () => {
    setLoadingReferences(true)
    try {
      const [requestsData, contractsData] = await Promise.all([
        loadMaterialRequests(),
        loadContracts()
      ])
      setMaterialRequests(requestsData)
      setContracts(contractsData)
    } catch (error) {
      console.error('[useInvoiceForm.loadReferences] Error:', error)
      message.error('Ошибка загрузки данных')
    } finally {
      setLoadingReferences(false)
    }
  }, [])

  // Handle contract selection - auto-fill fields
  const handleContractSelect = useCallback((contractId: string | null) => {
    if (!contractId) {
      setSelectedContract(null)
      return
    }

    const contract = contracts.find(c => c.id === contractId)
    if (contract) {
      setSelectedContract(contract)

      // Auto-fill form fields from contract
      form.setFieldsValue({
        payer_id: contract.payer_id,
        supplier_id: contract.supplier_id,
        project_id: contract.project_id  // Auto-fill project from contract
      })

      // Set VAT rate from contract if available
      if (contract.vat_rate !== undefined && contract.vat_rate !== null) {
        setVatRate(contract.vat_rate)
      }
    }
  }, [contracts, form])

  // Reset form for new invoice
  const resetForm = useCallback(() => {
    form.resetFields()
    setAmountWithVat(0)
    setVatRate(20)
    setVatAmount(0)
    setAmountWithoutVat(0)
    setDeliveryDays(undefined)
    setDeliveryDaysType('calendar')
    setInvoiceDate(dayjs())
    setPreliminaryDeliveryDate(null)
    setSelectedContract(null)
  }, [form])

  // Populate form for editing
  const populateForm = useCallback((invoice: Invoice) => {
    console.log('[useInvoiceForm.populateForm] Populating form with invoice:', invoice)

    const formValues = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
      payer_id: invoice.payer_id,
      supplier_id: invoice.supplier_id,
      project_id: invoice.project_id,
      invoice_type_id: invoice.invoice_type_id,
      description: invoice.description,
      contract_id: invoice.contract_id,
      material_request_id: invoice.material_request_id,
      amount_with_vat: invoice.amount_with_vat || 0,
      vat_rate: invoice.vat_rate || 20,
      delivery_cost: invoice.delivery_cost || 0,
      delivery_days: invoice.delivery_days,
      delivery_days_type: invoice.delivery_days_type || 'calendar',
      preliminary_delivery_date: invoice.preliminary_delivery_date ? dayjs(invoice.preliminary_delivery_date) : null,
      responsible_id: invoice.responsible_id, // Исправлено: используем responsible_id из типа Invoice
      payment_deadline_date: invoice.relevance_date ? dayjs(invoice.relevance_date) : null // Конечная дата актуальности счета
    }

    console.log('[useInvoiceForm.populateForm] Setting form values:', formValues)
    form.setFieldsValue(formValues)

    setAmountWithVat(invoice.amount_with_vat || 0)
    setVatRate(invoice.vat_rate || 20)
    setVatAmount(invoice.vat_amount || 0)
    setAmountWithoutVat(invoice.amount_without_vat || 0)
    setDeliveryDays(invoice.delivery_days || undefined)
    setDeliveryDaysType(invoice.delivery_days_type || 'calendar')
    setInvoiceDate(invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs())
    setPreliminaryDeliveryDate(invoice.preliminary_delivery_date ? dayjs(invoice.preliminary_delivery_date) : null)
  }, [form])

  return {
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
    // New exports
    materialRequests,
    contracts,
    loadingReferences,
    loadReferences,
    handleContractSelect,
    selectedContract
  }
}