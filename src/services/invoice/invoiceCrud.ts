import { supabase } from '../../lib/supabase'
import type { Invoice } from '../../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { message } from 'antd'
import dayjs from 'dayjs'
import { processInvoiceFiles, deleteRemovedFiles } from './invoiceFiles'
import { recalculateInvoiceStatus } from './invoiceStatus'

export const loadInvoices = async (userId: string) => {

  try {
    // Сначала получаем информацию о роли пользователя
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        role_id,
        roles (
          id,
          own_projects_only
        )
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[InvoiceOperations.loadInvoices] Error loading user profile:', profileError)
      throw profileError
    }

    const role = userProfile?.roles

    // Базовый запрос для счетов
    let query = supabase
      .from('invoices')
      .select(`
        *,
        payer:contractors!invoices_payer_id_fkey (*),
        supplier:contractors!invoices_supplier_id_fkey (*),
        project:projects (*),
        invoice_type:invoice_types (*),
        invoice_status:invoice_statuses (*)
      `)
      .order('created_at', { ascending: false })

    // Если у роли включен параметр own_projects_only, фильтруем по проектам пользователя
    if (role?.own_projects_only) {

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
        // Если у пользователя нет проектов и включен фильтр, возвращаем пустой массив
        return []
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('[InvoiceOperations.loadInvoices] Error:', error)
      throw error
    }

    return (data || []) as Invoice[]
  } catch (error) {
    console.error('[InvoiceOperations.loadInvoices] Error:', error)
    throw error
  }
}

export const loadSingleInvoice = async (invoiceId: string) => {

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        payer:contractors!invoices_payer_id_fkey (*),
        supplier:contractors!invoices_supplier_id_fkey (*),
        project:projects (*),
        invoice_type:invoice_types (*),
        invoice_status:invoice_statuses (*)
      `)
      .eq('id', invoiceId)
      .single()

    if (error) throw error

    return data as Invoice
  } catch (error) {
    console.error('[InvoiceOperations.loadSingleInvoice] Error:', error)
    throw error
  }
}

export const createInvoice = async (
  invoiceData: any,
  files: UploadFile[],
  userId: string
) => {

  try {
    // Преобразуем даты в правильный формат и удаляем несуществующие поля
    const { payment_due_date, ...cleanData } = invoiceData
    const formattedData = {
      ...cleanData,
      invoice_date: invoiceData.invoice_date ? dayjs(invoiceData.invoice_date).format('YYYY-MM-DD') : null,
      due_date: invoiceData.payment_due_date ? dayjs(invoiceData.payment_due_date).format('YYYY-MM-DD') : null, // map payment_due_date to due_date
      preliminary_delivery_date: invoiceData.preliminary_delivery_date ? dayjs(invoiceData.preliminary_delivery_date).format('YYYY-MM-DD') : null,
      user_id: userId, // Используем user_id вместо created_by (согласно структуре таблицы)
      status_id: 1 // draft (Черновик) по умолчанию
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert(formattedData)
      .select()
      .single()

    if (error) {
      console.error('[InvoiceOperations.createInvoice] Error:', error)
      throw error
    }


    // Обрабатываем файлы, если они есть
    if (files && files.length > 0) {
      await processInvoiceFiles(data.id, files, userId)
    }

    message.success('Счёт успешно создан')
    return data
  } catch (error) {
    console.error('[InvoiceOperations.createInvoice] Error:', error)
    message.error('Ошибка создания счёта')
    throw error
  }
}

export const updateInvoice = async (
  invoiceId: string,
  invoiceData: any,
  files: UploadFile[],
  userId: string,
  originalFiles?: UploadFile[]
) => {

  try {
    // Преобразуем даты в правильный формат и удаляем несуществующие поля
    const { payment_due_date, ...cleanData } = invoiceData
    const formattedData = {
      ...cleanData,
      invoice_date: invoiceData.invoice_date ? dayjs(invoiceData.invoice_date).format('YYYY-MM-DD') : null,
      due_date: invoiceData.payment_due_date ? dayjs(invoiceData.payment_due_date).format('YYYY-MM-DD') : null, // map payment_due_date to due_date
      preliminary_delivery_date: invoiceData.preliminary_delivery_date ? dayjs(invoiceData.preliminary_delivery_date).format('YYYY-MM-DD') : null
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(formattedData)
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) {
      console.error('[InvoiceOperations.updateInvoice] Error:', error)
      throw error
    }


    // Если есть оригинальные файлы, проверяем на удаленные
    if (originalFiles) {
      await deleteRemovedFiles(originalFiles, files, invoiceId)
    }

    // Обрабатываем файлы (новые и обновление описаний существующих)
    if (files && files.length > 0) {
      await processInvoiceFiles(invoiceId, files, userId)
    }

    // Пересчитываем статус счета
    await recalculateInvoiceStatus(invoiceId)

    message.success('Счёт успешно обновлён')
    return data
  } catch (error) {
    console.error('[InvoiceOperations.updateInvoice] Error:', error)
    message.error('Ошибка обновления счёта')
    throw error
  }
}

export const deleteInvoice = async (invoiceId: string) => {

  try {
    // Получаем все файлы счета
    const { data: attachments, error: attachmentsError } = await supabase
      .from('invoice_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          storage_path
        )
      `)
      .eq('invoice_id', invoiceId)

    if (attachmentsError) {
      console.error('[InvoiceOperations.deleteInvoice] Error loading attachments:', attachmentsError)
    }

    // Удаляем файлы из Storage
    if (attachments && attachments.length > 0) {
      const storagePaths = attachments
        .map(item => (item as any).attachments?.storage_path)
        .filter(Boolean)

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove(storagePaths)

        if (storageError) {
          console.error('[InvoiceOperations.deleteInvoice] Storage deletion error:', storageError)
        }
      }

      // Удаляем записи из таблицы attachments
      const attachmentIds = attachments.map(item => item.attachment_id).filter(Boolean)
      if (attachmentIds.length > 0) {
        const { error: attachmentDeleteError } = await supabase
          .from('attachments')
          .delete()
          .in('id', attachmentIds)

        if (attachmentDeleteError) {
          console.error('[InvoiceOperations.deleteInvoice] Attachments deletion error:', attachmentDeleteError)
        }
      }
    }

    // Удаляем платежи счета
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('invoice_id', invoiceId)

    if (paymentsError) {
      console.error('[InvoiceOperations.deleteInvoice] Payments deletion error:', paymentsError)
    }

    // Удаляем сам счет
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (error) {
      console.error('[InvoiceOperations.deleteInvoice] Error:', error)
      throw error
    }

    message.success('Счёт успешно удалён')
  } catch (error) {
    console.error('[InvoiceOperations.deleteInvoice] Error:', error)
    message.error('Ошибка удаления счёта')
    throw error
  }
}