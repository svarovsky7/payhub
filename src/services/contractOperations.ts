import { supabase } from '../lib/supabase'
import type { Contractor, Project, Contract, ContractStatus } from '../lib/supabase'
import { message } from 'antd'

export type { Contract }


// Load contracts with related data
export const loadContracts = async (userId?: string) => {
  console.log('[contractOperations.loadContracts] Loading contracts for user:', userId)

  try {
    let query = supabase
      .from('contracts')
      .select(`
        *,
        payer:contractors!contracts_payer_id_fkey(*),
        supplier:contractors!contracts_supplier_id_fkey(*),
        project:projects(*),
        status:contract_statuses(*),
        contract_projects(
          project_id,
          projects(*)
        ),
        contract_invoices(
          *,
          invoice:invoices(
            *,
            payer:contractors!invoices_payer_id_fkey(*),
            supplier:contractors!invoices_supplier_id_fkey(*)
          )
        ),
        contract_attachments(
          *,
          attachment:attachments(*)
        )
      `)

    // Filter by user projects if needed
    if (userId) {
      const { getUserProjectFilter } = await import('./userProjectsService')
      const { shouldFilter, projectIds } = await getUserProjectFilter(userId)

      if (shouldFilter && projectIds.length > 0) {
        console.log('[contractOperations.loadContracts] Filtering by projects:', projectIds)
        query = query.in('project_id', projectIds)
      } else if (shouldFilter && projectIds.length === 0) {
        // User has no projects - return empty array
        console.log('[contractOperations.loadContracts] User has no projects')
        return []
      }
    }

    const { data, error } = await query.order('contract_date', { ascending: false })

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

// Link projects to contract
export const linkProjectsToContract = async (contractId: string, projectIds: number[]) => {
  console.log('[ContractOperations.linkProjectsToContract] Linking projects:', { contractId, projectIds })

  try {
    // First, remove all existing project links for this contract
    const { error: deleteError } = await supabase
      .from('contract_projects')
      .delete()
      .eq('contract_id', contractId)

    if (deleteError) throw deleteError

    // If no projects selected, we're done
    if (!projectIds || projectIds.length === 0) {
      return
    }

    // Insert new project links
    const { error: insertError } = await supabase
      .from('contract_projects')
      .insert(
        projectIds.map(projectId => ({
          contract_id: contractId,
          project_id: projectId
        }))
      )

    if (insertError) throw insertError

    console.log('[ContractOperations.linkProjectsToContract] Successfully linked projects')
  } catch (error) {
    console.error('[ContractOperations.linkProjectsToContract] Error:', error)
    throw error
  }
}

// Get contract's linked projects
export const getContractProjects = async (contractId: string): Promise<number[]> => {
  console.log('[ContractOperations.getContractProjects] Loading projects for contract:', contractId)

  try {
    const { data, error } = await supabase
      .from('contract_projects')
      .select('project_id')
      .eq('contract_id', contractId)

    if (error) throw error

    const projectIds = data?.map(cp => cp.project_id) || []
    console.log('[ContractOperations.getContractProjects] Loaded project IDs:', projectIds)
    return projectIds
  } catch (error) {
    console.error('[ContractOperations.getContractProjects] Error:', error)
    return []
  }
}

