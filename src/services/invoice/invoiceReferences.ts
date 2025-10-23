import { supabase } from '../../lib/supabase'
import type { Contractor, Project, InvoiceType, InvoiceStatus, Employee } from '../../lib/supabase'

export const loadReferences = async () => {

  try {
    const [
      contractorsResponse,
      projectsResponse,
      invoiceTypesResponse,
      invoiceStatusesResponse,
      employeesResponse
    ] = await Promise.all([
      supabase
        .from('contractors')
        .select('*')
        .order('name'),
      supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase.from('invoice_types').select('*').order('name'),
      supabase.from('invoice_statuses').select('*').order('sort_order'),
      supabase
        .from('employees')
        .select('*')
        .order('last_name, first_name')
    ])

    if (contractorsResponse.error) throw contractorsResponse.error
    if (projectsResponse.error) throw projectsResponse.error
    if (invoiceTypesResponse.error) throw invoiceTypesResponse.error
    if (invoiceStatusesResponse.error) throw invoiceStatusesResponse.error
    if (employeesResponse.error) throw employeesResponse.error

    const invoiceStatuses = invoiceStatusesResponse.data as InvoiceStatus[]
    
    console.log('[InvoiceOperations.loadReferences] Loaded invoice statuses:', 
      invoiceStatuses.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        sort_order: s.sort_order
      }))
    )

    // Используем один и тот же список контрагентов для плательщиков и поставщиков
    const contractors = contractorsResponse.data as Contractor[]

    return {
      payers: contractors,
      suppliers: contractors,
      projects: projectsResponse.data as Project[],
      invoiceTypes: invoiceTypesResponse.data as InvoiceType[],
      invoiceStatuses: invoiceStatuses,
      employees: employeesResponse.data as Employee[]
    }
  } catch (error) {
    console.error('[InvoiceOperations.loadReferences] Error:', error)
    throw error
  }
}