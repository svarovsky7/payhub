import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import { approvePayment, rejectPayment } from './approvalActions'

export interface BulkApprovalResult {
  total: number
  successful: number
  failed: number
  errors: Array<{ approvalId: string; paymentNumber: string; error: string }>
  totalAmount?: number
}

/**
 * Approve multiple payments in bulk - processes in parallel
 */
export const bulkApprovePayments = async (
  approvalIds: string[],
  userId: string,
  comment?: string
): Promise<BulkApprovalResult> => {
  console.log('[bulkApprovePayments] Starting bulk approval:', { count: approvalIds.length, userId })

  const result: BulkApprovalResult = {
    total: approvalIds.length,
    successful: 0,
    failed: 0,
    errors: [],
    totalAmount: 0
  }

  // Get payment numbers and amounts
  const { data: approvals } = await supabase
    .from('payment_approvals')
    .select(`
      id,
      payments!inner (
        payment_number,
        amount
      )
    `)
    .in('id', approvalIds)

  const approvalMap = new Map(
    approvals?.map(a => [a.id, (a.payments as any)?.payment_number || 'Unknown']) || []
  )

  // Calculate total amount
  if (approvals) {
    result.totalAmount = approvals.reduce((sum, a) => {
      return sum + ((a.payments as any)?.amount || 0)
    }, 0)
  }

  // Process all approvals in parallel using Promise.allSettled
  const approvalResults = await Promise.allSettled(
    approvalIds.map(id => approvePayment(id, userId, comment, true))
  )

  // Count results
  approvalResults.forEach((res, idx) => {
    const approvalId = approvalIds[idx]
    if (res.status === 'fulfilled' && res.value) {
      result.successful++
    } else {
      result.failed++
      result.errors.push({
        approvalId,
        paymentNumber: approvalMap.get(approvalId) || 'Unknown',
        error: res.status === 'rejected' ? String(res.reason) : 'Ошибка согласования'
      })
    }
  })

  console.log('[bulkApprovePayments] Completed:', result)
  return result
}

/**
 * Reject multiple payments in bulk - processes in parallel
 */
export const bulkRejectPayments = async (
  approvalIds: string[],
  userId: string,
  comment: string
): Promise<BulkApprovalResult> => {
  console.log('[bulkRejectPayments] Starting bulk rejection:', { count: approvalIds.length, userId })

  if (!comment.trim()) {
    message.error('Укажите причину отклонения')
    return {
      total: approvalIds.length,
      successful: 0,
      failed: approvalIds.length,
      errors: approvalIds.map(id => ({
        approvalId: id,
        paymentNumber: 'Unknown',
        error: 'Не указана причина отклонения'
      }))
    }
  }

  const result: BulkApprovalResult = {
    total: approvalIds.length,
    successful: 0,
    failed: 0,
    errors: [],
    totalAmount: 0
  }

  // Get payment numbers and amounts
  const { data: approvals } = await supabase
    .from('payment_approvals')
    .select(`
      id,
      payments!inner (
        payment_number,
        amount
      )
    `)
    .in('id', approvalIds)

  const approvalMap = new Map(
    approvals?.map(a => [a.id, (a.payments as any)?.payment_number || 'Unknown']) || []
  )

  // Calculate total amount
  if (approvals) {
    result.totalAmount = approvals.reduce((sum, a) => {
      return sum + ((a.payments as any)?.amount || 0)
    }, 0)
  }

  // Process all approvals in parallel using Promise.allSettled
  const approvalResults = await Promise.allSettled(
    approvalIds.map(id => rejectPayment(id, userId, comment, true))
  )

  // Count results
  approvalResults.forEach((res, idx) => {
    const approvalId = approvalIds[idx]
    if (res.status === 'fulfilled' && res.value) {
      result.successful++
    } else {
      result.failed++
      result.errors.push({
        approvalId,
        paymentNumber: approvalMap.get(approvalId) || 'Unknown',
        error: res.status === 'rejected' ? String(res.reason) : 'Ошибка отклонения'
      })
    }
  })

  console.log('[bulkRejectPayments] Completed:', result)
  return result
}
