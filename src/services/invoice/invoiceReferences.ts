import { supabase } from '../../lib/supabase'
import type { Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'

export const loadReferences = async () => {

  try {
    const [
      contractorsResponse,
      projectsResponse,
      invoiceTypesResponse,
      invoiceStatusesResponse
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
      supabase.from('invoice_statuses').select('*').order('sort_order')
    ])

    if (contractorsResponse.error) throw contractorsResponse.error
    if (projectsResponse.error) throw projectsResponse.error
    if (invoiceTypesResponse.error) throw invoiceTypesResponse.error
    if (invoiceStatusesResponse.error) throw invoiceStatusesResponse.error

    // Используем один и тот же список контрагентов для плательщиков и поставщиков
    const contractors = contractorsResponse.data as Contractor[]

    return {
      payers: contractors,
      suppliers: contractors,
      projects: projectsResponse.data as Project[],
      invoiceTypes: invoiceTypesResponse.data as InvoiceType[],
      invoiceStatuses: invoiceStatusesResponse.data as InvoiceStatus[]
    }
  } catch (error) {
    console.error('[InvoiceOperations.loadReferences] Error:', error)
    throw error
  }
}