import { supabase } from '../../lib/supabase'
import type { ImportedInvoice } from './invoiceImportService'

// Получить payment_type_id для bank_transfer
export const getBankTransferPaymentTypeId = async (): Promise<number | undefined> => {
  try {
    const { data, error } = await supabase
      .from('payment_types')
      .select('id')
      .eq('code', 'bank_transfer')
      .single()

    if (error) {
      console.error('[invoiceImportOperations.getBankTransferPaymentTypeId] Error:', error)
      return undefined
    }

    return data?.id
  } catch (error) {
    console.error('[invoiceImportOperations.getBankTransferPaymentTypeId] Exception:', error)
    return undefined
  }
}

// Загрузить и присоединить файл
export const uploadAndAttachFile = async (
  blob: Blob,
  fileName: string,
  invoiceId: string,
  userId: string
): Promise<void> => {
  const timestamp = Date.now()
  const cleanFileName = fileName
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9.\-_а-яА-Я]/g, '_')
    .replace(/_{2,}/g, '_')
  const path = `invoices/${invoiceId}/${timestamp}_${cleanFileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: false
    })

  if (uploadError) {
    console.error('[invoiceImportOperations.uploadAndAttachFile] Error uploading file:', uploadError)
    return
  }

  if (uploadData?.path) {
    const { data: attachData, error: attachError } = await supabase
      .from('attachments')
      .insert({
        original_name: fileName,
        storage_path: uploadData.path,
        size_bytes: blob.size,
        mime_type: blob.type || 'application/octet-stream',
        created_by: userId
      })
      .select('id')
      .single()

    if (attachError) {
      console.error('[invoiceImportOperations.uploadAndAttachFile] Error creating attachment record:', attachError)
      return
    }

    if (attachData?.id) {
      await supabase.from('invoice_attachments').insert({
        invoice_id: invoiceId,
        attachment_id: attachData.id
      })
    }
  }
}

// Создать договор если нужно
export const getOrCreateContract = async (
  invoice: ImportedInvoice,
  projectId: string | undefined,
  userId: string
): Promise<string | undefined> => {
  try {
    if (invoice.contractId) {
      return invoice.contractId
    }

    const { data: existing } = await supabase
      .from('contracts')
      .select('id')
      .eq('contract_number', invoice.contractNumber)
      .eq('contract_date', invoice.contractDate)
      .eq('project_id', projectId)
      .single()

    if (existing?.id) {
      return existing.id
    }

    if (!projectId) {
      return undefined
    }

    const { data: created, error } = await supabase
      .from('contracts')
      .insert({
        contract_number: invoice.contractNumber,
        contract_date: invoice.contractDate,
        supplier_id: invoice.supplierId,
        payer_id: invoice.payerId,
        project_id: projectId,
        vat_rate: 20,
        status_id: 2,
        created_by: userId
      })
      .select('id')
      .single()

    if (error) {
      console.error('[invoiceImportOperations.getOrCreateContract] Error creating contract:', error)
      throw error
    }

    if (created?.id && projectId) {
      await supabase
        .from('contract_projects')
        .insert({
          contract_id: created.id,
          project_id: projectId
        })
    }

    return created?.id
  } catch (error) {
    console.error('[invoiceImportOperations.getOrCreateContract] Error:', error)
    return undefined
  }
}

// Создать счет
export const createInvoiceRecord = async (
  invoice: ImportedInvoice,
  contractId: string | undefined,
  userId: string
): Promise<string | undefined> => {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: invoice.invoiceNumber,
      amount_with_vat: invoice.invoiceAmount,
      description: [
        invoice.orderDescription ? `Заказ: ${invoice.orderDescription}` : '',
        invoice.materialRequest ? `Заявка: ${invoice.materialRequest}` : '',
        invoice.materialDescription ? `Материал: ${invoice.materialDescription}` : '',
        invoice.recipientMol ? `МОЛ: ${invoice.recipientMol}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
      recipient: invoice.recipientMol,
      invoice_type_id: invoice.invoiceTypeId || undefined,
      vat_amount: (invoice.invoiceAmount / 1.2 * 0.2),
      payer_id: invoice.payerId,
      supplier_id: invoice.supplierId,
      project_id: invoice.projectId,
      delivery_days: invoice.deliveryDays || 0,
      delivery_days_type: 'calendar',
      contract_id: contractId,
      status_id: 1,
      relevance_date: new Date().toISOString().split('T')[0]
    })
    .select('id')
    .single()

  if (invoiceError || !invoiceData?.id) {
    console.error('[invoiceImportOperations.createInvoiceRecord] Error:', invoiceError)
    return undefined
  }

  return invoiceData.id
}

// Связать договор и счет
export const linkContractToInvoice = async (contractId: string, invoiceId: string): Promise<void> => {
  try {
    await supabase.from('contract_invoices').insert({
      contract_id: contractId,
      invoice_id: invoiceId
    })
  } catch (error) {
    console.error('[invoiceImportOperations.linkContractToInvoice] Error:', error)
  }
}

// Создать платеж
export const createPaymentForInvoice = async (
  invoice: ImportedInvoice,
  invoiceId: string,
  userId: string
): Promise<void> => {
  if (invoice.paymentAmount <= 0) return

  try {
    const paymentTypeId = await getBankTransferPaymentTypeId()
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        payment_number: 1,
        payment_date: new Date().toISOString().split('T')[0],
        amount: invoice.paymentAmount,
        status_id: 1,
        payment_type_id: paymentTypeId || undefined,
        created_by: userId
      })
      .select('id')
      .single()

    if (paymentError) {
      console.error('[invoiceImportOperations.createPaymentForInvoice] Error creating payment:', paymentError)
      return
    }

    if (!payment?.id) return

    const { error: linkError } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        payment_id: payment.id,
        allocated_amount: invoice.paymentAmount
      })

    if (linkError) {
      console.error('[invoiceImportOperations.createPaymentForInvoice] Error linking payment:', linkError)
    }
  } catch (error) {
    console.error('[invoiceImportOperations.createPaymentForInvoice] Exception:', error)
  }
}
