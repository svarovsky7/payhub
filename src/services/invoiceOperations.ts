import { supabase } from '../lib/supabase'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus } from '../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { message } from 'antd'
import dayjs from 'dayjs'
import { calculateInvoiceStatus, shouldUpdateInvoiceStatus } from '../utils/invoiceStatusCalculator'

export const loadReferences = async () => {
  console.log('[InvoiceOperations.loadReferences] Loading references')

  try {
    const [
      payersResponse,
      suppliersResponse,
      projectsResponse,
      invoiceTypesResponse,
      invoiceStatusesResponse
    ] = await Promise.all([
      supabase
        .from('contractors')
        .select('*')
        .eq('type_id', 1)
        .order('name'),
      supabase
        .from('contractors')
        .select('*')
        .eq('type_id', 2)
        .order('name'),
      supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase.from('invoice_types').select('*').order('name'),
      supabase.from('invoice_statuses').select('*').order('sort_order')
    ])

    if (payersResponse.error) throw payersResponse.error
    if (suppliersResponse.error) throw suppliersResponse.error
    if (projectsResponse.error) throw projectsResponse.error
    if (invoiceTypesResponse.error) throw invoiceTypesResponse.error
    if (invoiceStatusesResponse.error) throw invoiceStatusesResponse.error

    return {
      payers: payersResponse.data as Contractor[],
      suppliers: suppliersResponse.data as Contractor[],
      projects: projectsResponse.data as Project[],
      invoiceTypes: invoiceTypesResponse.data as InvoiceType[],
      invoiceStatuses: invoiceStatusesResponse.data as InvoiceStatus[]
    }
  } catch (error) {
    console.error('[InvoiceOperations.loadReferences] Error:', error)
    message.error('Ошибка загрузки справочников')
    return {
      payers: [],
      suppliers: [],
      projects: [],
      invoiceTypes: [],
      invoiceStatuses: []
    }
  }
}

export const loadInvoices = async (userId: string) => {
  console.log('[InvoiceOperations.loadInvoices] Loading invoices for user:', userId)

  try {
    // Сначала получаем роль пользователя
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[InvoiceOperations.loadInvoices] Error loading user profile:', profileError)
      throw profileError
    }

    // Получаем информацию о роли
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('own_projects_only')
      .eq('id', userProfile.role_id)
      .single()

    if (roleError) {
      console.error('[InvoiceOperations.loadInvoices] Error loading role:', roleError)
      throw roleError
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        payer:contractors!invoices_payer_id_fkey(id, name),
        supplier:contractors!invoices_supplier_id_fkey(id, name),
        project:projects(id, name),
        invoice_type:invoice_types(id, name),
        invoice_status:invoice_statuses(id, code, name, color, sort_order)
      `)
      .eq('user_id', userId)

    // Если у роли стоит ограничение по проектам
    if (role?.own_projects_only) {
      console.log('[InvoiceOperations.loadInvoices] Filtering by user projects')

      // Получаем проекты пользователя
      const { data: userProjects, error: projectsError } = await supabase
        .from('user_projects')
        .select('project_id')
        .eq('user_id', userId)

      if (projectsError) {
        console.error('[InvoiceOperations.loadInvoices] Error loading user projects:', projectsError)
        throw projectsError
      }

      const projectIds = userProjects?.map(up => up.project_id) || []

      if (projectIds.length > 0) {
        query = query.in('project_id', projectIds)
      } else {
        // Если у пользователя нет проектов, возвращаем пустой список
        console.log('[InvoiceOperations.loadInvoices] User has no projects assigned')
        return []
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    console.log('[InvoiceOperations.loadInvoices] Loaded invoices:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('[InvoiceOperations.loadInvoices] Error:', error)
    message.error('Ошибка загрузки счетов')
    return []
  }
}

export const loadSingleInvoice = async (invoiceId: string) => {
  console.log('[InvoiceOperations.loadSingleInvoice] Loading invoice:', invoiceId)

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        payer:contractors!invoices_payer_id_fkey(*),
        supplier:contractors!invoices_supplier_id_fkey(*),
        project:projects(*),
        invoice_type:invoice_types(*),
        invoice_status:invoice_statuses(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('[InvoiceOperations.loadSingleInvoice] Error:', error)
      message.error('Ошибка загрузки счета')
      return null
    }

    console.log('[InvoiceOperations.loadSingleInvoice] Invoice loaded')
    return data as Invoice
  } catch (error) {
    console.error('[InvoiceOperations.loadSingleInvoice] Error:', error)
    message.error('Ошибка загрузки счета')
    return null
  }
}

export const createInvoice = async (
  invoiceData: any,
  files: UploadFile[],
  userId: string,
  invoiceStatuses: InvoiceStatus[]
) => {
  console.log('[InvoiceOperations.createInvoice] Creating invoice:', invoiceData)

  // Use status with id=1 from invoice_statuses table
  const defaultStatus = invoiceStatuses.find(status => status.id === 1)
  if (!defaultStatus) {
    console.error('[InvoiceOperations.createInvoice] Default status (id=1) not found in statuses:', invoiceStatuses)
    message.error('Не найден статус по умолчанию')
    throw new Error('Default invoice status not found')
  }

  // Check if invoice_number is empty and set default value "б/н"
  const invoice_number = invoiceData.invoice_number?.trim() || 'б/н'

  console.log('[InvoiceOperations.createInvoice] Invoice number:', {
    original: invoiceData.invoice_number,
    processed: invoice_number
  })

  const dataToInsert = {
    ...invoiceData,
    invoice_number,
    user_id: userId,
    status_id: defaultStatus.id
  }

  const { data: invoiceResult, error: invoiceError } = await supabase
    .from('invoices')
    .insert([dataToInsert])
    .select()
    .single()

  if (invoiceError) throw invoiceError

  console.log('[InvoiceOperations.createInvoice] Invoice created:', invoiceResult.id)

  // Process files if any
  if (files.length > 0) {
    await processInvoiceFiles(invoiceResult.id, files, userId)
  }

  return invoiceResult
}

export const updateInvoice = async (
  invoiceId: string,
  invoiceData: any,
  files: UploadFile[],
  userId: string
) => {
  console.log('[InvoiceOperations.updateInvoice] Updating invoice:', invoiceId)

  // Check if invoice_number is empty and set default value "б/н"
  const dataToUpdate = {
    ...invoiceData
  }

  if (dataToUpdate.invoice_number !== undefined) {
    dataToUpdate.invoice_number = dataToUpdate.invoice_number?.trim() || 'б/н'

    console.log('[InvoiceOperations.updateInvoice] Invoice number:', {
      original: invoiceData.invoice_number,
      processed: dataToUpdate.invoice_number
    })
  }

  const { data, error: invoiceError } = await supabase
    .from('invoices')
    .update(dataToUpdate)
    .eq('id', invoiceId)
    .select()
    .single()

  if (invoiceError) throw invoiceError

  console.log('[InvoiceOperations.updateInvoice] Invoice updated:', data.id)

  // Process files if any
  if (files.length > 0) {
    await processInvoiceFiles(data.id, files, userId)
  }

  return data
}

export const deleteInvoice = async (invoiceId: string) => {
  console.log('[InvoiceOperations.deleteInvoice] Deleting invoice:', invoiceId)

  // 1. Get all payments linked to this invoice
  const { data: linkedPayments, error: paymentsError } = await supabase
    .from('invoice_payments')
    .select('payment_id')
    .eq('invoice_id', invoiceId)

  if (paymentsError) {
    console.error('[InvoiceOperations.deleteInvoice] Error fetching linked payments:', paymentsError)
    throw paymentsError
  }

  console.log('[InvoiceOperations.deleteInvoice] Found linked payments:', linkedPayments?.length || 0)

  // 2. Delete payment files
  if (linkedPayments && linkedPayments.length > 0) {
    const paymentIds = linkedPayments.map(lp => lp.payment_id)

    // Get payment attachments
    const { data: paymentAttachments, error: paymentAttError } = await supabase
      .from('payment_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          storage_path
        )
      `)
      .in('payment_id', paymentIds)

    if (!paymentAttError && paymentAttachments && paymentAttachments.length > 0) {
      console.log('[InvoiceOperations.deleteInvoice] Found payment attachments:', paymentAttachments.length)

      // Delete payment files from Storage
      const paymentStoragePaths = paymentAttachments
        .map(item => (item as any).attachments?.storage_path)
        .filter(Boolean)

      if (paymentStoragePaths.length > 0) {
        console.log('[InvoiceOperations.deleteInvoice] Deleting payment files from storage:', paymentStoragePaths)
        const { error: removePaymentFilesError } = await supabase.storage
          .from('attachments')
          .remove(paymentStoragePaths)

        if (removePaymentFilesError) {
          console.error('[InvoiceOperations.deleteInvoice] Error removing payment files:', removePaymentFilesError)
        }
      }

      // Delete payment attachment records
      const paymentAttachmentIds = paymentAttachments
        .map(item => (item as any).attachments?.id)
        .filter(Boolean)

      if (paymentAttachmentIds.length > 0) {
        await supabase
          .from('attachments')
          .delete()
          .in('id', paymentAttachmentIds)
      }
    }
  }

  // 3. Get invoice attachments
  const { data: attachments, error: fetchError } = await supabase
    .from('invoice_attachments')
    .select(`
      attachment_id,
      attachments (
        id,
        storage_path
      )
    `)
    .eq('invoice_id', invoiceId)

  if (fetchError) {
    console.error('[InvoiceOperations.deleteInvoice] Error fetching invoice attachments:', fetchError)
    throw fetchError
  }

  console.log('[InvoiceOperations.deleteInvoice] Found invoice attachments:', attachments?.length || 0)

  // 4. Delete invoice files from Storage
  if (attachments && attachments.length > 0) {
    const invoiceStoragePaths = attachments
      .map(item => (item as any).attachments?.storage_path)
      .filter(Boolean)

    if (invoiceStoragePaths.length > 0) {
      console.log('[InvoiceOperations.deleteInvoice] Deleting invoice files from storage:', invoiceStoragePaths)
      const { error: removeInvoiceFilesError } = await supabase.storage
        .from('attachments')
        .remove(invoiceStoragePaths)

      if (removeInvoiceFilesError) {
        console.error('[InvoiceOperations.deleteInvoice] Error removing invoice files:', removeInvoiceFilesError)
      }
    }

    // Delete invoice attachment records
    const attachmentIds = attachments
      .map(item => (item as any).attachments?.id)
      .filter(Boolean)

    if (attachmentIds.length > 0) {
      await supabase
        .from('attachments')
        .delete()
        .in('id', attachmentIds)
    }
  }

  // 5. Delete the invoice (related payments will be deleted via CASCADE)
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .select()

  console.log('[InvoiceOperations.deleteInvoice] Delete result:', { data, error })

  if (error) {
    console.error('[InvoiceOperations.deleteInvoice] Delete error:', error)
    throw error
  }

  return true
}

export const processInvoiceFiles = async (invoiceId: string, files: UploadFile[], userId: string) => {
  console.log('[InvoiceOperations.processInvoiceFiles] Processing files for invoice:', invoiceId)

  for (const file of files) {
    try {
      const fileToUpload = (file as any).originFileObj || file

      if (!(fileToUpload instanceof File || fileToUpload instanceof Blob)) {
        console.warn('[InvoiceOperations.processInvoiceFiles] Invalid file object:', file)
        continue
      }

      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name || fileToUpload.name}`
      const storagePath = `invoices/${invoiceId}/${fileName}`

      console.log('[InvoiceOperations.processInvoiceFiles] Uploading file:', fileName)

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('[InvoiceOperations.processInvoiceFiles] Upload error:', uploadError)
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
        console.error('[InvoiceOperations.processInvoiceFiles] Attachment DB error:', attachmentError)
        continue
      }

      const { error: linkError } = await supabase
        .from('invoice_attachments')
        .insert([
          {
            invoice_id: invoiceId,
            attachment_id: attachment.id,
          },
        ])

      if (linkError) {
        console.error('[InvoiceOperations.processInvoiceFiles] Link error:', linkError)
      } else {
        console.log('[InvoiceOperations.processInvoiceFiles] File linked successfully:', file.name)
      }
    } catch (fileError) {
      console.error('[InvoiceOperations.processInvoiceFiles] File processing error:', fileError)
      message.error(`Ошибка обработки файла ${file.name}`)
    }
  }
}

// Автоматический пересчёт статуса счёта на основе платежей
export const recalculateInvoiceStatus = async (invoiceId: string) => {
  console.log('[InvoiceOperations.recalculateInvoiceStatus] Recalculating status for invoice:', invoiceId)

  try {
    // Получаем информацию о счёте
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('amount_with_vat, status_id')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('[InvoiceOperations.recalculateInvoiceStatus] Error fetching invoice:', invoiceError)
      return false
    }

    if (!invoice) {
      console.error('[InvoiceOperations.recalculateInvoiceStatus] Invoice not found')
      return false
    }

    // Получаем все платежи по счёту
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status_id')
      .eq('invoice_id', invoiceId)

    if (paymentsError) {
      console.error('[InvoiceOperations.recalculateInvoiceStatus] Error fetching payments:', paymentsError)
      return false
    }

    // Рассчитываем новый статус
    const newStatusId = calculateInvoiceStatus(
      invoice.amount_with_vat,
      invoice.status_id,
      payments || []
    )

    // Обновляем статус, если он изменился
    if (shouldUpdateInvoiceStatus(invoice.status_id, newStatusId)) {
      console.log('[InvoiceOperations.recalculateInvoiceStatus] Updating invoice status from', invoice.status_id, 'to', newStatusId)

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status_id: newStatusId })
        .eq('id', invoiceId)

      if (updateError) {
        console.error('[InvoiceOperations.recalculateInvoiceStatus] Error updating invoice status:', updateError)
        return false
      }

      console.log('[InvoiceOperations.recalculateInvoiceStatus] Invoice status updated successfully')
      return true
    }

    console.log('[InvoiceOperations.recalculateInvoiceStatus] Invoice status unchanged')
    return false
  } catch (error) {
    console.error('[InvoiceOperations.recalculateInvoiceStatus] Unexpected error:', error)
    return false
  }
}

// Массовый пересчёт статусов счетов
export const recalculateAllInvoiceStatuses = async () => {
  console.log('[InvoiceOperations.recalculateAllInvoiceStatuses] Starting bulk recalculation')

  try {
    // Получаем все счета (кроме отменённых)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, amount_with_vat, status_id')
      .neq('status_id', 5) // Исключаем отменённые

    if (invoicesError) {
      console.error('[InvoiceOperations.recalculateAllInvoiceStatuses] Error fetching invoices:', invoicesError)
      return { updated: 0, failed: 0 }
    }

    if (!invoices || invoices.length === 0) {
      console.log('[InvoiceOperations.recalculateAllInvoiceStatuses] No invoices to recalculate')
      return { updated: 0, failed: 0 }
    }

    // Получаем все платежи для всех счетов
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('invoice_id, amount, status_id')

    if (paymentsError) {
      console.error('[InvoiceOperations.recalculateAllInvoiceStatuses] Error fetching payments:', paymentsError)
      return { updated: 0, failed: 0 }
    }

    // Группируем платежи по счетам
    const paymentsByInvoice = (allPayments || []).reduce((acc, payment) => {
      if (!acc[payment.invoice_id]) {
        acc[payment.invoice_id] = []
      }
      acc[payment.invoice_id].push(payment)
      return acc
    }, {} as Record<string, any[]>)

    let updated = 0
    let failed = 0

    // Обрабатываем каждый счёт
    for (const invoice of invoices) {
      const payments = paymentsByInvoice[invoice.id] || []
      const newStatusId = calculateInvoiceStatus(
        invoice.amount_with_vat,
        invoice.status_id,
        payments
      )

      if (shouldUpdateInvoiceStatus(invoice.status_id, newStatusId)) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status_id: newStatusId })
          .eq('id', invoice.id)

        if (updateError) {
          console.error(`[InvoiceOperations.recalculateAllInvoiceStatuses] Failed to update invoice ${invoice.id}:`, updateError)
          failed++
        } else {
          updated++
        }
      }
    }

    console.log(`[InvoiceOperations.recalculateAllInvoiceStatuses] Completed: ${updated} updated, ${failed} failed`)
    return { updated, failed }
  } catch (error) {
    console.error('[InvoiceOperations.recalculateAllInvoiceStatuses] Unexpected error:', error)
    return { updated: 0, failed: 0 }
  }
}