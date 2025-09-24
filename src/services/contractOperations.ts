import { supabase } from '../lib/supabase'
import { message } from 'antd'

// Load contractors for select lists
export const loadContractors = async () => {

  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('name')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadContractors] Error:', error)
    message.error('Ошибка загрузки контрагентов')
    return []
  }
}

export interface Contract {
  id: string
  contract_number: string
  contract_date: string
  payer_id?: number
  supplier_id?: number
  vat_rate?: number
  warranty_period_days?: number
  description?: string
  created_at: string
  updated_at: string
  created_by?: string
  payer?: any
  supplier?: any
  invoices?: any[]
  attachments?: any[]
}

export interface ContractInvoice {
  id: string
  contract_id: string
  invoice_id: string
  created_at: string
}

export interface ContractAttachment {
  id: string
  contract_id: string
  attachment_id: string
  created_at: string
}

// Load contracts with related data
export const loadContracts = async () => {

  try {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        payer:contractors!contracts_payer_id_fkey(*),
        supplier:contractors!contracts_supplier_id_fkey(*),
        contract_invoices(
          *,
          invoice:invoices(*)
        ),
        contract_attachments(
          *,
          attachment:attachments(*)
        )
      `)
      .order('contract_date', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadContracts] Error:', error)
    message.error('Ошибка загрузки договоров')
    return []
  }
}

// Create contract
export const createContract = async (contract: Partial<Contract>, userId: string) => {

  try {
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        ...contract,
        created_by: userId
      })
      .select(`
        *,
        payer:contractors!contracts_payer_id_fkey(*),
        supplier:contractors!contracts_supplier_id_fkey(*)
      `)
      .single()

    if (error) throw error

    message.success('Договор успешно создан')
    return data
  } catch (error: any) {
    console.error('[ContractOperations.createContract] Error:', error)
    if (error.code === '23505') {
      message.error('Договор с таким номером уже существует')
    } else {
      message.error('Ошибка создания договора')
    }
    throw error
  }
}

// Update contract
export const updateContract = async (id: string, contract: Partial<Contract>) => {

  try {
    const { data, error } = await supabase
      .from('contracts')
      .update(contract)
      .eq('id', id)
      .select(`
        *,
        payer:contractors!contracts_payer_id_fkey(*),
        supplier:contractors!contracts_supplier_id_fkey(*)
      `)
      .single()

    if (error) throw error

    message.success('Договор успешно обновлен')
    return data
  } catch (error: any) {
    console.error('[ContractOperations.updateContract] Error:', error)
    if (error.code === '23505') {
      message.error('Договор с таким номером уже существует')
    } else {
      message.error('Ошибка обновления договора')
    }
    throw error
  }
}

// Delete contract
export const deleteContract = async (id: string) => {

  try {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id)

    if (error) throw error

    message.success('Договор успешно удален')
  } catch (error) {
    console.error('[ContractOperations.deleteContract] Error:', error)
    message.error('Ошибка удаления договора')
    throw error
  }
}

// Add invoice to contract
export const addInvoiceToContract = async (contractId: string, invoiceId: string) => {

  try {
    const { data, error } = await supabase
      .from('contract_invoices')
      .insert({
        contract_id: contractId,
        invoice_id: invoiceId
      })
      .select()
      .single()

    if (error) throw error

    message.success('Счет успешно привязан к договору')
    return data
  } catch (error: any) {
    console.error('[ContractOperations.addInvoiceToContract] Error:', error)
    if (error.code === '23505') {
      message.error('Этот счет уже привязан к договору')
    } else {
      message.error('Ошибка привязки счета к договору')
    }
    throw error
  }
}

// Remove invoice from contract
export const removeInvoiceFromContract = async (contractId: string, invoiceId: string) => {

  try {
    const { error } = await supabase
      .from('contract_invoices')
      .delete()
      .eq('contract_id', contractId)
      .eq('invoice_id', invoiceId)

    if (error) throw error

    message.success('Счет успешно отвязан от договора')
  } catch (error) {
    console.error('[ContractOperations.removeInvoiceFromContract] Error:', error)
    message.error('Ошибка отвязки счета от договора')
    throw error
  }
}

// Add attachment to contract
export const addAttachmentToContract = async (contractId: string, attachmentId: string) => {

  try {
    const { data, error } = await supabase
      .from('contract_attachments')
      .insert({
        contract_id: contractId,
        attachment_id: attachmentId
      })
      .select()
      .single()

    if (error) throw error

    message.success('Файл успешно прикреплен к договору')
    return data
  } catch (error: any) {
    console.error('[ContractOperations.addAttachmentToContract] Error:', error)
    if (error.code === '23505') {
      message.error('Этот файл уже прикреплен к договору')
    } else {
      message.error('Ошибка прикрепления файла к договору')
    }
    throw error
  }
}

// Remove attachment from contract
export const removeAttachmentFromContract = async (contractId: string, attachmentId: string) => {

  try {
    const { error } = await supabase
      .from('contract_attachments')
      .delete()
      .eq('contract_id', contractId)
      .eq('attachment_id', attachmentId)

    if (error) throw error

    message.success('Файл успешно откреплен от договора')
  } catch (error) {
    console.error('[ContractOperations.removeAttachmentFromContract] Error:', error)
    message.error('Ошибка открепления файла от договора')
    throw error
  }
}

// Upload file to storage and create attachment record
export const uploadContractFile = async (file: File, contractId: string, userId: string) => {

  try {
    // Generate unique file name
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    const filePath = `contracts/${contractId}/${fileName}`

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('attachments')
      .insert({
        original_name: file.name,
        storage_path: filePath,
        size_bytes: file.size,
        mime_type: file.type,
        created_by: userId
      })
      .select()
      .single()

    if (attachmentError) throw attachmentError

    // Link attachment to contract
    const { error: linkError } = await supabase
      .from('contract_attachments')
      .insert({
        contract_id: contractId,
        attachment_id: attachment.id
      })

    if (linkError) {
      // If linking fails, delete the attachment record
      await supabase.from('attachments').delete().eq('id', attachment.id)
      throw linkError
    }

    message.success(`Файл "${file.name}" успешно загружен`)
    return attachment
  } catch (error) {
    console.error('[ContractOperations.uploadContractFile] Error:', error)
    message.error('Ошибка загрузки файла')
    throw error
  }
}

// Get file URL for preview/download
export const getFileUrl = (storagePath: string) => {
  const { data } = supabase.storage
    .from('attachments')
    .getPublicUrl(storagePath)

  return data.publicUrl
}

// Delete attachment completely (from storage and database)
export const deleteAttachment = async (attachmentId: string, storagePath: string) => {

  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([storagePath])

    if (storageError) throw storageError

    // Delete attachment record (will cascade to contract_attachments)
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) throw dbError

    message.success('Файл успешно удален')
  } catch (error) {
    console.error('[ContractOperations.deleteAttachment] Error:', error)
    message.error('Ошибка удаления файла')
    throw error
  }
}

// Load attachments for contract
export const loadContractAttachments = async (contractId: string) => {

  try {
    const { data, error } = await supabase
      .from('contract_attachments')
      .select(`
        *,
        attachment:attachments(*)
      `)
      .eq('contract_id', contractId)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadContractAttachments] Error:', error)
    message.error('Ошибка загрузки файлов')
    return []
  }
}

// Load available invoices (not linked to any contract)
export const loadAvailableInvoices = async () => {

  try {
    // First get all invoice IDs that are already linked to contracts
    const { data: linkedInvoices, error: linkedError } = await supabase
      .from('contract_invoices')
      .select('invoice_id')

    if (linkedError) throw linkedError

    const linkedInvoiceIds = linkedInvoices?.map(li => li.invoice_id) || []

    // Then get all invoices that are not in the linked list
    let query = supabase
      .from('invoices')
      .select(`
        *,
        payer:contractors!invoices_payer_id_fkey(*),
        supplier:contractors!invoices_supplier_id_fkey(*)
      `)
      .order('invoice_date', { ascending: false })

    if (linkedInvoiceIds.length > 0) {
      query = query.not('id', 'in', `(${linkedInvoiceIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadAvailableInvoices] Error:', error)
    message.error('Ошибка загрузки доступных счетов')
    return []
  }
}