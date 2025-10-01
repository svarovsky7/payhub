import { supabase } from '../../lib/supabase'
import { calculateInvoiceStatus, shouldUpdateInvoiceStatus } from '../../utils/invoiceStatusCalculator'

interface InvoicePaymentWithDetails {
  payment_id: string
  allocated_amount: number
  payments: {
    id: string
    status_id: number
    amount: number
  } | null
}

export const recalculateInvoiceStatus = async (invoiceId: string) => {

  try {
    // Получаем счет с платежами
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        amount_with_vat,
        status_id,
        invoice_payments (
          payment_id,
          allocated_amount,
          payments (
            id,
            status_id,
            amount
          )
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new Error('Invoice not found')

    // Извлекаем вложенные данные платежей
    const payments = ((invoice.invoice_payments || []) as unknown as InvoicePaymentWithDetails[]).map(ip => ({
      status_id: ip.payments?.status_id || 0,
      amount: ip.allocated_amount || 0
    }))

    console.log('[InvoiceStatus.recalculateInvoiceStatus] Invoice data:', {
      invoiceId,
      currentStatusId: invoice.status_id,
      amountWithVat: invoice.amount_with_vat,
      paymentsCount: payments.length,
      payments
    })

    // Рассчитываем новый статус
    const newStatusId = calculateInvoiceStatus(
      invoice.amount_with_vat || 0,
      invoice.status_id,
      payments
    )

    console.log('[InvoiceStatus.recalculateInvoiceStatus] Calculated new status:', {
      currentStatusId: invoice.status_id,
      newStatusId,
      willUpdate: shouldUpdateInvoiceStatus(invoice.status_id, newStatusId)
    })

    // Проверяем, нужно ли обновлять статус
    if (shouldUpdateInvoiceStatus(invoice.status_id, newStatusId)) {

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status_id: newStatusId })
        .eq('id', invoiceId)

      if (updateError) throw updateError

      return true
    }

    return false
  } catch (error) {
    console.error('[InvoiceOperations.recalculateInvoiceStatus] Error:', error)
    throw error
  }
}

export const recalculateAllInvoiceStatuses = async () => {

  try {
    // Получаем все счета с платежами
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        amount_with_vat,
        status_id,
        invoice_payments (
          payment_id,
          allocated_amount,
          payments (
            id,
            status_id,
            amount
          )
        )
      `)

    if (error) throw error
    if (!invoices) return { updated: 0, failed: 0 }

    let updated = 0
    let failed = 0

    // Обновляем статусы счетов
    for (const invoice of invoices) {
      try {
        // Извлекаем вложенные данные платежей
        const payments = ((invoice.invoice_payments || []) as unknown as InvoicePaymentWithDetails[]).map(ip => ({
          status_id: ip.payments?.status_id || 0,
          amount: ip.allocated_amount || 0
        }))

        const newStatusId = calculateInvoiceStatus(
          invoice.amount_with_vat || 0,
          invoice.status_id,
          payments
        )

        if (shouldUpdateInvoiceStatus(invoice.status_id, newStatusId)) {
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ status_id: newStatusId })
            .eq('id', invoice.id)

          if (updateError) throw updateError
          updated++
        }
      } catch (error) {
        console.error('[InvoiceOperations.recalculateAllInvoiceStatuses] Error updating invoice:', invoice.id, error)
        failed++
      }
    }

    return { updated, failed }
  } catch (error) {
    console.error('[InvoiceOperations.recalculateAllInvoiceStatuses] Fatal error:', error)
    throw error
  }
}