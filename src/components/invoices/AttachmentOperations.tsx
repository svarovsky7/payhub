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

export const loadPaymentsList = async (invoiceId: string) => {
  try {

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        payment_type:payment_types(id, name),
        payment_status:payment_statuses(id, code, name, color)
      `)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('[loadPaymentsList] Error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[loadPaymentsList] Error:', error)
    throw error
  }
}

export const loadPaymentReferences = async () => {
  try {
    const results = {
      types: [] as any[],
      statuses: [] as any[]
    }

    // Загружаем типы платежей
    const { data: typesData, error: typesError } = await supabase
      .from('payment_types')
      .select('*')
      .order('name')

    if (typesError) {
      console.error('[loadPaymentReferences] Types error:', typesError)
    } else {
      results.types = typesData || []
    }

    // Загружаем статусы платежей
    const { data: statusesData, error: statusesError } = await supabase
      .from('payment_statuses')
      .select('*')
      .order('sort_order')

    if (statusesError) {
      console.error('[loadPaymentReferences] Statuses error:', statusesError)
    } else {
      results.statuses = statusesData || []
    }

    return results
  } catch (error) {
    console.error('[loadPaymentReferences] Error:', error)
    throw error
  }
}