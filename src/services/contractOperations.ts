import { supabase } from '../lib/supabase'
import type { Contractor, Project } from '../lib/supabase'
import { message } from 'antd'

export interface ContractStatus {
  id: number
  code: string
  name: string
  color?: string
  description?: string
  sort_order?: number
}

export interface Contract {
  id: string
  contract_number: string
  contract_date: string
  payer_id?: number
  supplier_id?: number
  project_id?: number
  vat_rate?: number
  warranty_period_days?: number
  description?: string
  created_at: string
  updated_at: string
  created_by?: string
  payer?: any
  supplier?: any
  project?: any
  invoices?: any[]
  attachments?: any[]
  status_id?: number
  status?: ContractStatus
  payment_terms?: string
  advance_percentage?: number
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
        project:projects(*),
        status:contract_statuses(*),
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


// Delete contract
export const deleteContract = async (id: string) => {

  try {
    // Получаем все файлы договора
    const { data: attachments, error: attachmentsError } = await supabase
      .from('contract_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          storage_path
        )
      `)
      .eq('contract_id', id)

    if (attachmentsError) {
      console.error('[ContractOperations.deleteContract] Error loading attachments:', attachmentsError)
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
          console.error('[ContractOperations.deleteContract] Storage deletion error:', storageError)
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
          console.error('[ContractOperations.deleteContract] Attachments deletion error:', attachmentDeleteError)
        }
      }
    }

    // Удаляем сам договор
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

// Load contractors for selection
export const loadContractors = async (): Promise<Contractor[]> => {
  console.log('[ContractOperations.loadContractors] Loading contractors')

  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    console.log('[ContractOperations.loadContractors] Loaded contractors:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadContractors] Error:', error)
    message.error('Ошибка загрузки контрагентов')
    return []
  }
}

// Load contract statuses for selection
export const loadContractStatuses = async (): Promise<ContractStatus[]> => {
  console.log('[ContractOperations.loadContractStatuses] Loading contract statuses')

  try {
    const { data, error } = await supabase
      .from('contract_statuses')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name')

    if (error) throw error

    console.log('[ContractOperations.loadContractStatuses] Loaded statuses:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadContractStatuses] Error:', error)
    message.error('Ошибка загрузки статусов договоров')
    return []
  }
}

// Load projects for selection
export const loadProjects = async (): Promise<Project[]> => {
  console.log('[ContractOperations.loadProjects] Loading projects')

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    console.log('[ContractOperations.loadProjects] Loaded projects:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('[ContractOperations.loadProjects] Error:', error)
    message.error('Ошибка загрузки проектов')
    return []
  }
}

// Create contract status
export const createContractStatus = async (status: Omit<ContractStatus, 'id'>) => {
  console.log('[ContractOperations.createContractStatus] Creating status:', status)

  try {
    const { data, error } = await supabase
      .from('contract_statuses')
      .insert(status)
      .select()
      .single()

    if (error) throw error

    message.success('Статус договора успешно создан')
    return data
  } catch (error: any) {
    console.error('[ContractOperations.createContractStatus] Error:', error)
    if (error.code === '23505') {
      message.error('Статус с таким кодом уже существует')
    } else {
      message.error('Ошибка создания статуса договора')
    }
    throw error
  }
}

// Update contract status
export const updateContractStatus = async (id: number, updates: Partial<ContractStatus>) => {
  console.log('[ContractOperations.updateContractStatus] Updating status:', id, updates)

  try {
    const { data, error } = await supabase
      .from('contract_statuses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    message.success('Статус договора успешно обновлён')
    return data
  } catch (error: any) {
    console.error('[ContractOperations.updateContractStatus] Error:', error)
    if (error.code === '23505') {
      message.error('Статус с таким кодом уже существует')
    } else {
      message.error('Ошибка обновления статуса договора')
    }
    throw error
  }
}

// Generate contract number
export const generateContractNumber = async (): Promise<string> => {
  console.log('[ContractOperations.generateContractNumber] Generating contract number')

  try {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const prefix = `Д-${month}/${year}-`

    // Get the latest contract number for current month/year
    const { data, error } = await supabase
      .from('contracts')
      .select('contract_number')
      .like('contract_number', `${prefix}%`)
      .order('contract_number', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return `${prefix}001`
    }

    // Extract the sequence number from the latest contract
    const latestNumber = data[0].contract_number
    const match = latestNumber.match(/(\d{3})$/)

    if (!match) {
      return `${prefix}001`
    }

    const nextSequence = (parseInt(match[1]) + 1).toString().padStart(3, '0')
    const generatedNumber = `${prefix}${nextSequence}`

    console.log('[ContractOperations.generateContractNumber] Generated number:', generatedNumber)
    return generatedNumber
  } catch (error) {
    console.error('[ContractOperations.generateContractNumber] Error:', error)
    message.error('Ошибка генерации номера договора')
    throw error
  }
}

// Delete contract status
export const deleteContractStatus = async (id: number) => {
  console.log('[ContractOperations.deleteContractStatus] Deleting status:', id)

  try {
    // Проверяем, используется ли статус в договорах
    const { data: contracts, error: checkError } = await supabase
      .from('contracts')
      .select('id')
      .eq('status_id', id)
      .limit(1)

    if (checkError) throw checkError

    if (contracts && contracts.length > 0) {
      message.error('Невозможно удалить статус, который используется в договорах')
      throw new Error('Status is in use')
    }

    // Удаляем статус
    const { error } = await supabase
      .from('contract_statuses')
      .delete()
      .eq('id', id)

    if (error) throw error

    message.success('Статус договора успешно удалён')
  } catch (error: any) {
    console.error('[ContractOperations.deleteContractStatus] Error:', error)
    if (error.message !== 'Status is in use') {
      message.error('Ошибка удаления статуса договора')
    }
    throw error
  }
}