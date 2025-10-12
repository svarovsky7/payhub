import { supabase } from '../../lib/supabase'

export interface AttachmentData {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  description?: string
  created_at: string
  source?: string
  source_label?: string
  payment_id?: string
}

export const loadInvoiceAttachments = async (invoiceId: string): Promise<AttachmentData[]> => {
  try {

    // Загружаем файлы счёта
    const { data: invoiceFiles, error: invoiceError } = await supabase
      .from('invoice_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          description,
          created_at
        )
      `)
      .eq('invoice_id', invoiceId)

    if (invoiceError) {
      console.error('[loadInvoiceAttachments] Error loading invoice files:', invoiceError)
    }

    // Загружаем файлы платежей по этому счёту
    const { data: paymentFiles, error: paymentError } = await supabase
      .from('payment_attachments')
      .select(`
        payment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          description,
          created_at
        ),
        payments!inner (
          id,
          payment_number,
          invoice_id
        )
      `)
      .eq('payments.invoice_id', invoiceId)

    if (paymentError) {
      console.error('[loadInvoiceAttachments] Error loading payment files:', paymentError)
    }

    // Объединяем файлы счёта и платежей
    const invoiceAttachments = invoiceFiles?.map(item => ({
      ...(item as any).attachments,
      source: 'invoice',
      source_label: 'Счёт'
    })).filter(Boolean) || []

    const paymentAttachments = paymentFiles?.map(item => ({
      ...(item as any).attachments,
      source: 'payment',
      source_label: `Платёж №${(item as any).payments.payment_number}`,
      payment_id: (item as any).payment_id
    })).filter(Boolean) || []

    const allAttachments = [...invoiceAttachments, ...paymentAttachments]

    return allAttachments
  } catch (error) {
    console.error('[loadInvoiceAttachments] Error:', error)
    throw error
  }
}

// Загрузка файлов для approval (счет + конкретный платеж)
export const loadApprovalAttachments = async (invoiceId: string, paymentId: string): Promise<AttachmentData[]> => {
  try {
    console.log('[loadApprovalAttachments] Loading attachments:', { invoiceId, paymentId })

    // Загружаем файлы счёта
    const { data: invoiceFiles, error: invoiceError } = await supabase
      .from('invoice_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          description,
          created_at
        )
      `)
      .eq('invoice_id', invoiceId)

    if (invoiceError) {
      console.error('[loadApprovalAttachments] Error loading invoice files:', invoiceError)
    }

    // Загружаем файлы конкретного платежа
    const { data: paymentFiles, error: paymentError } = await supabase
      .from('payment_attachments')
      .select(`
        payment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          description,
          created_at
        ),
        payments!inner (
          id,
          payment_number
        )
      `)
      .eq('payment_id', paymentId)

    if (paymentError) {
      console.error('[loadApprovalAttachments] Error loading payment files:', paymentError)
    }

    // Объединяем файлы счёта и платежа
    const invoiceAttachments = invoiceFiles?.map(item => ({
      ...(item as any).attachments,
      source: 'invoice',
      source_label: 'Счёт'
    })).filter(Boolean) || []

    const paymentAttachments = paymentFiles?.map(item => ({
      ...(item as any).attachments,
      source: 'payment',
      source_label: `Платёж №${(item as any).payments.payment_number}`,
      payment_id: (item as any).payment_id
    })).filter(Boolean) || []

    const allAttachments = [...invoiceAttachments, ...paymentAttachments]

    console.log('[loadApprovalAttachments] Loaded attachments:', allAttachments.length)
    return allAttachments
  } catch (error) {
    console.error('[loadApprovalAttachments] Error:', error)
    throw error
  }
}