import { supabase } from '../../lib/supabase'

/**
 * Load all active approval routes for a given invoice type
 */
export const loadApprovalRoutes = async (invoiceTypeId: number) => {
  console.log('[ApprovalRoutes.loadApprovalRoutes] Loading routes for invoice type:', invoiceTypeId)

  try {
    const { data, error } = await supabase
      .from('approval_routes')
      .select('*')
      .eq('invoice_type_id', invoiceTypeId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    console.log('[ApprovalRoutes.loadApprovalRoutes] Found routes:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('[ApprovalRoutes.loadApprovalRoutes] Error:', error)
    return []
  }
}