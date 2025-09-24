import { supabase } from '../../lib/supabase'
import { message } from 'antd'

export const checkApprovalRoute = async (invoiceTypeId: number) => {

  try {
    const { data, error } = await supabase
      .from('approval_routes')
      .select('*')
      .eq('invoice_type_id', invoiceTypeId)
      .eq('is_active', true)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('[ApprovalOperations.checkApprovalRoute] Error:', error)
    return null
  }
}