import { supabase } from '../../lib/supabase'
import type { Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'

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
    throw error
  }
}