import { supabase } from '../../lib/supabase'
import type { PaymentStatus, Payment } from '../../lib/supabase'
import { message } from 'antd'
import dayjs from 'dayjs'
import { recalculateInvoiceStatus } from '../invoiceOperations'

export const createBulkPayments = async (
  invoiceIds: string[],
  values: any,
  userId: string,
  paymentStatuses: PaymentStatus[],
  invoices: any[]
) => {
  const defaultStatus = paymentStatuses.find(s => s.id === 1)

  if (!defaultStatus) {
    message.error('Не найден статус платежа по умолчанию')
    throw new Error('Default payment status not found')
  }

  const results = {
    successful: 0,
    failed: 0,
    failedInvoices: [] as string[]
  }

  const paymentAmounts = values.paymentAmounts || {}

  for (const invoiceId of invoiceIds) {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (!invoice) {
        results.failed++
        results.failedInvoices.push(invoiceId)
        continue
      }

      // Use individual amount from paymentAmounts, or default to invoice total
      const amount = paymentAmounts[invoiceId] !== undefined 
        ? paymentAmounts[invoiceId]
        : (invoice.amount_with_vat || 0) + (invoice.delivery_cost || 0)

      const paymentData = {
        payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        amount: amount || 0,
        payment_type_id: values.payment_type_id,
        status_id: defaultStatus.id,
        description: values.description || '',
        invoice_id: invoiceId,
        created_by: userId
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (paymentError) throw paymentError

      const { error: linkError } = await supabase
        .from('invoice_payments')
        .insert([{
          invoice_id: invoiceId,
          payment_id: payment.id,
          allocated_amount: amount || 0
        }])

      if (linkError) throw linkError

      // Пересчитываем статус счёта
      await recalculateInvoiceStatus(invoiceId)

      results.successful++
    } catch (error) {
      console.error(`[PaymentBulk.createBulkPayments] Error for invoice ${invoiceId}:`, error)
      results.failed++
      results.failedInvoices.push(invoiceId)
    }
  }

  return results
}

export const getPaymentTotals = (invoiceId: string, invoicePayments: Record<string, Payment[]>, invoice: any) => {
  const payments = invoicePayments[invoiceId] || []
  // Include delivery cost in total amount
  const totalAmount = (invoice?.amount_with_vat || 0) + (invoice?.delivery_cost || 0)

  // Calculate total paid (only payments with status "Оплачен" or "В оплате")
  const PAID_STATUS_ID = 3  // Оплачен (paid)
  const APPROVED_STATUS_ID = 5  // В оплате (approved)

  const totalPaid = payments.reduce((sum, payment) => {
    // Only count payments with paid or approved status
    if (payment.status_id === PAID_STATUS_ID || payment.status_id === APPROVED_STATUS_ID) {
      const amount = (payment as any).allocated_amount || payment.amount || 0
      return sum + amount
    }
    return sum
  }, 0)

  // Calculate payments by status
  const paymentsByStatus: Record<number, { statusName: string, amount: number, color?: string }> = {}

  payments.forEach(payment => {
    const statusId = payment.status_id
    const amount = (payment as any).allocated_amount || payment.amount || 0

    if (!paymentsByStatus[statusId]) {
      paymentsByStatus[statusId] = {
        statusName: payment.payment_status?.name || `Статус ${statusId}`,
        amount: 0,
        color: payment.payment_status?.color
      }
    }

    paymentsByStatus[statusId].amount += amount
  })

  const result = {
    totalPaid,
    remainingAmount: totalAmount - totalPaid,
    paymentCount: payments.length,
    paymentsByStatus
  }

  return result
}
