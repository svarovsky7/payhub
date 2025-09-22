import { supabase } from '../lib/supabase'
import type { Payment, PaymentType, PaymentStatus } from '../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { message } from 'antd'
import dayjs from 'dayjs'
import { parseAmount } from '../utils/invoiceHelpers'
import { recalculateInvoiceStatus } from './invoiceOperations'

export const loadPaymentReferences = async () => {
  console.log('[PaymentOperations.loadPaymentReferences] Loading payment references')

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
  console.log('[PaymentOperations.loadPaymentSummaries] Loading payment summaries for invoices:', invoiceIds.length)

  try {
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
      .in('invoice_id', invoiceIds)

    if (error) throw error

    // Group payments by invoice_id
    const paymentsByInvoice: Record<string, Payment[]> = {}

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

    console.log('[PaymentOperations.loadPaymentSummaries] Loaded payments for', Object.keys(paymentsByInvoice).length, 'invoices')
    return paymentsByInvoice
  } catch (error) {
    console.error('[PaymentOperations.loadPaymentSummaries] Error:', error)
    return {}
  }
}

export const loadInvoicePayments = async (invoiceId: string) => {
  console.log('[PaymentOperations.loadInvoicePayments] Loading payments for invoice:', invoiceId)

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

    console.log('[PaymentOperations.loadInvoicePayments] Loaded payments:', payments.length)
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
  console.log('[PaymentOperations.createPayment] Creating payment for invoice:', invoiceId)

  // Use status "Создан" (id=1) from payment_statuses table
  const defaultStatus = paymentStatuses.find(s => s.id === 1)

  if (!defaultStatus) {
    console.error('[PaymentOperations.createPayment] Default status (id=1) not found')
    message.error('Не найден статус платежа по умолчанию')
    throw new Error('Default payment status not found')
  }

  const paymentData = {
    payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    amount: parseAmount(values.amount) || 0,
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

  // Create invoice_payment link
  const { error: linkError } = await supabase
    .from('invoice_payments')
    .insert([{
      invoice_id: invoiceId,
      payment_id: payment.id,
      allocated_amount: parseAmount(values.amount) || 0
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
  values: any,
  files: UploadFile[]
) => {
  console.log('[PaymentOperations.updatePayment] Updating payment:', paymentId)

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
    console.log('[PaymentOperations.updatePayment] Updating allocated_amount to:', values.amount)
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
  console.log('[PaymentOperations.deletePayment] Deleting payment:', paymentId)

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

  console.log('[PaymentOperations.deletePayment] Found attachments:', attachments?.length || 0)

  // Delete files from Storage
  if (attachments && attachments.length > 0) {
    const storagePaths = attachments
      .map(item => (item as any).attachments?.storage_path)
      .filter(Boolean)

    if (storagePaths.length > 0) {
      console.log('[PaymentOperations.deletePayment] Deleting files from storage:', storagePaths)

      const { error: removeError } = await supabase.storage
        .from('attachments')
        .remove(storagePaths)

      if (removeError) {
        console.error('[PaymentOperations.deletePayment] Error removing files from storage:', removeError)
      } else {
        console.log('[PaymentOperations.deletePayment] Successfully removed files from storage')
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

export const processPaymentFiles = async (paymentId: string, files: UploadFile[], userId: string) => {
  console.log('[PaymentOperations.processPaymentFiles] Processing files for payment:', paymentId)

  // Get current files for this payment
  const { data: currentAttachments } = await supabase
    .from('payment_attachments')
    .select(`
      attachment_id,
      attachments (
        id,
        original_name,
        storage_path
      )
    `)
    .eq('payment_id', paymentId)

  const currentFileIds = new Set(
    currentAttachments?.map(item => (item as any).attachments?.id).filter(Boolean) || []
  )

  // Process each file
  for (const file of files) {
    // Skip already existing files
    if ((file as any).existingAttachmentId) {
      currentFileIds.delete((file as any).existingAttachmentId)
      continue
    }

    try {
      const fileToUpload = (file as any).originFileObj || file

      if (!(fileToUpload instanceof File || fileToUpload instanceof Blob)) {
        console.warn('[PaymentOperations.processPaymentFiles] Invalid file object:', file)
        continue
      }

      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name || fileToUpload.name}`
      const storagePath = `payments/${paymentId}/${fileName}`

      console.log('[PaymentOperations.processPaymentFiles] Uploading file:', fileName)

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('[PaymentOperations.processPaymentFiles] Upload error:', uploadError)
        message.error(`Ошибка загрузки файла ${fileName}`)
        continue
      }

      const attachmentData = {
        original_name: file.name || fileToUpload.name,
        storage_path: storagePath,
        size_bytes: file.size || fileToUpload.size || 0,
        mime_type: file.type || fileToUpload.type || 'application/octet-stream',
        created_by: userId,
      }

      const { data: attachment, error: attachmentError } = await supabase
        .from('attachments')
        .insert([attachmentData])
        .select()
        .single()

      if (attachmentError) {
        console.error('[PaymentOperations.processPaymentFiles] Attachment DB error:', attachmentError)
        continue
      }

      const { error: linkError } = await supabase
        .from('payment_attachments')
        .insert([
          {
            payment_id: paymentId,
            attachment_id: attachment.id,
          },
        ])

      if (linkError) {
        console.error('[PaymentOperations.processPaymentFiles] Link error:', linkError)
      } else {
        console.log('[PaymentOperations.processPaymentFiles] File linked successfully:', file.name)
      }
    } catch (fileError) {
      console.error('[PaymentOperations.processPaymentFiles] File processing error:', fileError)
      message.error(`Ошибка обработки файла ${file.name}`)
    }
  }

  // Delete files that were removed
  for (const attachmentId of currentFileIds) {
    console.log('[PaymentOperations.processPaymentFiles] Removing attachment:', attachmentId)

    // Get file info
    const { data: fileInfo } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single()

    if (fileInfo?.storage_path) {
      // Delete from storage
      const { error: deleteStorageError } = await supabase.storage
        .from('attachments')
        .remove([fileInfo.storage_path])

      if (deleteStorageError) {
        console.error('[PaymentOperations.processPaymentFiles] Storage deletion error:', deleteStorageError)
      }
    }

    // Delete attachment record
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('[PaymentOperations.processPaymentFiles] Attachment deletion error:', deleteError)
    }
  }
}

export const getPaymentTotals = (invoiceId: string, invoicePayments: Record<string, Payment[]>, invoice: any) => {
  const payments = invoicePayments[invoiceId] || []
  const totalAmount = invoice?.amount_with_vat || 0

  const totalPaid = payments.reduce((sum, payment) => {
    // Use allocated_amount if available, otherwise use payment amount
    const amount = (payment as any).allocated_amount || payment.amount || 0
    return sum + amount
  }, 0)

  const result = {
    totalPaid,
    remainingAmount: totalAmount - totalPaid,
    paymentCount: payments.length
  }

  console.log('[getPaymentTotals] Invoice:', invoice?.invoice_number, {
    invoiceId,
    totalAmount,
    totalPaid,
    paymentsCount: payments.length,
    remainingAmount: result.remainingAmount
  })

  return result
}