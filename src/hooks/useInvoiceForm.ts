import { useState, useEffect, useCallback } from 'react'
import { Form } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { calculateVat, calculatePreliminaryDeliveryDate } from '../utils/vatCalculator'
import type { Invoice } from '../lib/supabase'

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
  }, [form])

  // Populate form for editing
  const populateForm = useCallback((invoice: Invoice) => {
    form.setFieldsValue({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
      payer_id: invoice.payer_id,
      supplier_id: invoice.supplier_id,
      project_id: invoice.project_id,
      invoice_type_id: invoice.invoice_type_id,
      description: invoice.description,
    })

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
    populateForm
  }
}