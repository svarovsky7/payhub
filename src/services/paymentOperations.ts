import { supabase } from '../lib/supabase'
import type { Payment, PaymentType, PaymentStatus } from '../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { message } from 'antd'
import dayjs from 'dayjs'
import { parseAmount } from '../utils/invoiceHelpers'
import { recalculateInvoiceStatus } from './invoiceOperations'
import { processPaymentFiles } from './payment/paymentFiles'

export { processPaymentFiles } from './payment/paymentFiles'
export { createBulkPayments, getPaymentTotals } from './payment/paymentBulk'

export const loadPaymentReferences = async () => {

  try {
    const [typesResponse, statusesResponse] = await Promise.all([
      supabase.from('payment_types').select('*').order('name'),
      supabase.from('payment_statuses').select('*').order('sort_order')
    ])

    if (typesResponse.error) throw typesResponse.error
    if (statusesResponse.error) throw statusesResponse.error

    return {
      paymentTypes: typesResponse.data as PaymentType[],
      paymentStatuses: statusesResponse.data as PaymentStatus[]
    }
  } catch (error) {
    console.error('[PaymentOperations.loadPaymentReferences] Error:', error)
    message.error('Ошибка загрузки справочников платежей')
    return {
      paymentTypes: [],
      paymentStatuses: []
    }
  }
}

export const loadPaymentSummaries = async (invoiceIds: string[]) => {

  try {
    // Split into chunks to avoid URL length limits
    const CHUNK_SIZE = 50
    const chunks = []
    for (let i = 0; i < invoiceIds.length; i += CHUNK_SIZE) {
      chunks.push(invoiceIds.slice(i, i + CHUNK_SIZE))
    }

    const paymentsByInvoice: Record<string, Payment[]> = {}

    // Process each chunk
    for (const chunk of chunks) {
      const { data: payments, error } = await supabase
        .from('invoice_payments')
        .select(`
          invoice_id,
          allocated_amount,
          payments!inner (
            id,
            payment_number,
            payment_date,
            amount,
            payment_type_id,
            status_id,
            description,
            payment_types:payment_type_id (id, name),
            payment_statuses:status_id (id, name, color)
          )
        `)
        .in('invoice_id', chunk)

      if (error) throw error

      if (payments) {
        payments.forEach((item: any) => {
          if (!paymentsByInvoice[item.invoice_id]) {
            paymentsByInvoice[item.invoice_id] = []
          }
          if (item.payments) {
            paymentsByInvoice[item.invoice_id].push({
              ...item.payments,
              allocated_amount: item.allocated_amount,
              payment_type: item.payments?.payment_types,
              payment_status: item.payments?.payment_statuses
            })
          }
        })
      }
    }

    return paymentsByInvoice
  } catch (error) {
    console.error('[PaymentOperations.loadPaymentSummaries] Error:', error)
    return {}
  }
}

export const loadInvoicePayments = async (invoiceId: string) => {

  try {
    const { data, error } = await supabase
      .from('invoice_payments')
      .select(`
        invoice_id,
        allocated_amount,
        payments!inner (
          id,
          payment_number,
          payment_date,
          amount,
          payment_type_id,
          status_id,
          description,
          payment_types:payment_type_id (id, name),
          payment_statuses:status_id (id, name, color)
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('payments(payment_date)', { ascending: false })

    if (error) throw error

    const payments = data?.map((item: any) => ({
      ...item.payments,
      allocated_amount: item.allocated_amount,
      payment_type: item.payments?.payment_types,
      payment_status: item.payments?.payment_statuses
    })) || []

    return payments
  } catch (error) {
    console.error('[PaymentOperations.loadInvoicePayments] Error:', error)
    message.error('Ошибка загрузки платежей')
    return []
  }
}

export const createPayment = async (
  invoiceId: string,
  values: any,
  files: UploadFile[],
  userId: string,
  paymentStatuses: PaymentStatus[]
) => {

  // Use status "Создан" (id=1) from payment_statuses table
  const defaultStatus = paymentStatuses.find(s => s.id === 1)

  if (!defaultStatus) {
    console.error('[PaymentOperations.createPayment] Default status (id=1) not found')
    message.error('Не найден статус платежа по умолчанию')
    throw new Error('Default payment status not found')
  }

  // Parse amount correctly - handle both string and number input
  const amount = typeof values.amount === 'number'
    ? values.amount
    : parseAmount(values.amount)

  console.log('[PaymentOperations.createPayment] Amount parsing:', {
    rawAmount: values.amount,
    typeOfAmount: typeof values.amount,
    parsedAmount: amount
  })

  const paymentData = {
    payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    amount: amount || 0,
    payment_type_id: values.payment_type_id,
    status_id: defaultStatus.id,
    description: values.description || '',
    invoice_id: invoiceId,
    created_by: userId,
    requires_payment_order: values.requires_payment_order || false
  }

  console.log('[PaymentOperations.createPayment] Payment data:', paymentData)

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert([paymentData])
    .select()
    .single()

  if (paymentError) throw paymentError

  // Create invoice_payment link
  const { error: linkError } = await supabase
    .from('invoice_payments')
    .insert([{
      invoice_id: invoiceId,
      payment_id: payment.id,
      allocated_amount: amount || 0
    }])

  if (linkError) throw linkError

  // Process files if any
  if (files.length > 0) {
    await processPaymentFiles(payment.id, files, userId)
  }

  // Пересчитываем статус счёта
  await recalculateInvoiceStatus(invoiceId)

  return payment
}

export const updatePayment = async (
  paymentId: string,
  values: any
) => {

  // Get invoice_id from the payment
  const { data: payment } = await supabase
    .from('payments')
    .select('invoice_id')
    .eq('id', paymentId)
    .single()

  // Update payment data
  const { error } = await supabase
    .from('payments')
    .update(values)
    .eq('id', paymentId)

  if (error) throw error

  // Update allocated amount in invoice_payments if amount changed
  if (values.amount !== undefined) {
    const { error: updateLinkError } = await supabase
      .from('invoice_payments')
      .update({ allocated_amount: values.amount })
      .eq('payment_id', paymentId)

    if (updateLinkError) {
      console.error('[PaymentOperations.updatePayment] Error updating invoice_payments:', updateLinkError)
      throw updateLinkError
    }
  }

  // Пересчитываем статус счёта
  if (payment?.invoice_id) {
    await recalculateInvoiceStatus(payment.invoice_id)
  }
}

export const deletePayment = async (paymentId: string) => {

  // Get invoice_id before deleting payment
  const { data: payment } = await supabase
    .from('payments')
    .select('invoice_id')
    .eq('id', paymentId)
    .single()

  const invoiceId = payment?.invoice_id

  // Get payment attachments
  const { data: attachments, error: fetchError } = await supabase
    .from('payment_attachments')
    .select(`
      attachment_id,
      attachments (
        id,
        storage_path
      )
    `)
    .eq('payment_id', paymentId)

  if (fetchError) {
    console.error('[PaymentOperations.deletePayment] Error fetching attachments:', fetchError)
    throw fetchError
  }


  // Delete files from Storage
  if (attachments && attachments.length > 0) {
    const storagePaths = attachments
      .map(item => (item as any).attachments?.storage_path)
      .filter(Boolean)

    if (storagePaths.length > 0) {

      const { error: removeError } = await supabase.storage
        .from('attachments')
        .remove(storagePaths)

      if (removeError) {
        console.error('[PaymentOperations.deletePayment] Error removing files from storage:', removeError)
      }
    }

    // Delete attachment records
    const attachmentIds = attachments
      .map(item => (item as any).attachments?.id)
      .filter(Boolean)

    if (attachmentIds.length > 0) {
      const { error: attachmentDeleteError } = await supabase
        .from('attachments')
        .delete()
        .in('id', attachmentIds)

      if (attachmentDeleteError) {
        console.error('[PaymentOperations.deletePayment] Error deleting attachment records:', attachmentDeleteError)
      }
    }
  }

  // Delete the payment itself
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (error) throw error

  // Пересчитываем статус счёта после удаления платежа
  if (invoiceId) {
    await recalculateInvoiceStatus(invoiceId)
  }

  return true
}