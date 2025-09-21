import { supabase } from '../../lib/supabase'
import type { Payment } from '../../lib/supabase'

interface PaymentSubmitParams {
  values: any
  files: any[]
  editingPayment: Payment | null
  invoiceId: string
  userId?: string
  messageApi: any
}

export const submitPayment = async ({
  values,
  files,
  editingPayment,
  invoiceId,
  userId,
  messageApi
}: PaymentSubmitParams): Promise<string | null> => {
  try {
    const paymentData = {
      payment_date: values.payment_date.format('YYYY-MM-DD'),
      amount: values.amount,
      payment_type_id: values.payment_type_id,
      status_id: values.status_id,
      description: values.description
    }

    let paymentId: string

    if (editingPayment) {
      // Обновляем существующий платёж
      const { data, error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', editingPayment.id)
        .select()
        .single()

      if (error) throw error
      console.log('[submitPayment] Payment updated:', data.id)
      paymentId = data.id

      // Обновляем сумму в таблице связи
      const { error: linkError } = await supabase
        .from('invoice_payments')
        .update({ allocated_amount: values.amount })
        .eq('payment_id', editingPayment.id)
        .eq('invoice_id', invoiceId)

      if (linkError) {
        console.error('[submitPayment] Link update error:', linkError)
      }
    } else {
      // Создаём новый платёж
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          invoice_id: invoiceId,
          created_by: userId
        }])
        .select()
        .single()

      if (error) throw error
      console.log('[submitPayment] Payment created:', data.id)
      paymentId = data.id

      // Создаём связь между счетом и платежом только для нового платежа
      const { error: linkError } = await supabase
        .from('invoice_payments')
        .insert([{
          invoice_id: invoiceId,
          payment_id: paymentId,
          allocated_amount: values.amount
        }])

      if (linkError) {
        console.error('[submitPayment] Link error:', linkError)
      }
    }

    // Загрузка файлов, если они есть
    if (files && files.length > 0 && paymentId) {
      await uploadPaymentFiles(files, paymentId, userId, messageApi)
    }

    return paymentId
  } catch (error: any) {
    console.error('[submitPayment] Error:', error)
    throw error
  }
}

const uploadPaymentFiles = async (
  files: any[],
  paymentId: string,
  userId?: string,
  messageApi?: any
) => {
  console.log('[uploadPaymentFiles] Uploading files for payment:', paymentId)

  for (const file of files) {
    try {
      // Пропускаем уже существующие файлы (у них есть existingAttachmentId)
      if ((file as any).existingAttachmentId) {
        console.log('[uploadPaymentFiles] Skipping existing file:', file.name)
        continue
      }

      // Проверяем, что у файла есть originFileObj
      if (!file.originFileObj) {
        console.warn('[uploadPaymentFiles] File has no originFileObj:', file.name)
        continue
      }

      // Генерируем уникальное имя файла
      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name}`
      const filePath = `payments/${paymentId}/${fileName}`

      console.log('[uploadPaymentFiles] Uploading file:', filePath, 'Size:', file.size)

      // Загружаем файл в Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.originFileObj as File)

      if (uploadError) {
        console.error('[uploadPaymentFiles] Upload error:', uploadError)
        if (messageApi) {
          messageApi.error(`Ошибка загрузки файла ${file.name}`)
        }
        continue
      }

      // Создаём запись в таблице attachments
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert([{
          original_name: file.name,
          storage_path: filePath,
          size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          created_by: userId
        }])
        .select()
        .single()

      if (attachmentError) {
        console.error('[uploadPaymentFiles] Attachment error:', attachmentError)
        continue
      }

      // Создаём связь между платежом и файлом
      const { error: linkError } = await supabase
        .from('payment_attachments')
        .insert([{
          payment_id: paymentId,
          attachment_id: attachmentData.id
        }])

      if (linkError) {
        console.error('[uploadPaymentFiles] Link error:', linkError)
      }

      console.log('[uploadPaymentFiles] File uploaded successfully:', file.name)
    } catch (fileError) {
      console.error('[uploadPaymentFiles] File processing error:', fileError)
      if (messageApi) {
        messageApi.error(`Ошибка обработки файла ${file.name}`)
      }
    }
  }
}

export const deletePayment = async (paymentId: string): Promise<void> => {
  console.log('[deletePayment] Deleting payment:', paymentId)

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (error) throw error
}