import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import { approvePayment, rejectPayment } from './approvalActions'

export interface BulkApprovalResult {
  total: number
  successful: number
  failed: number
  errors: Array<{ approvalId: string; paymentNumber: string; error: string }>
}

/**
 * Approve multiple payments in bulk
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
    errors: []
  }

  // Get payment numbers for error reporting
  const { data: approvals } = await supabase
    .from('payment_approvals')
    .select(`
      id,
      payments!inner (
        payment_number
      )
    `)
    .in('id', approvalIds)

  const approvalMap = new Map(
    approvals?.map(a => [a.id, (a.payments as any)?.payment_number || 'Unknown']) || []
  )

  // Process each approval
  for (const approvalId of approvalIds) {
    try {
      const success = await approvePayment(approvalId, userId, comment)
      if (success) {
        result.successful++
      } else {
        result.failed++
        result.errors.push({
          approvalId,
          paymentNumber: approvalMap.get(approvalId) || 'Unknown',
          error: 'Ошибка согласования'
        })
      }
    } catch (error) {
      result.failed++
      result.errors.push({
        approvalId,
        paymentNumber: approvalMap.get(approvalId) || 'Unknown',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
      console.error('[bulkApprovePayments] Error approving:', approvalId, error)
    }
  }

  console.log('[bulkApprovePayments] Completed:', result)
  return result
}

/**
 * Reject multiple payments in bulk
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
    errors: []
  }

  // Get payment numbers for error reporting
  const { data: approvals } = await supabase
    .from('payment_approvals')
    .select(`
      id,
      payments!inner (
        payment_number
      )
    `)
    .in('id', approvalIds)

  const approvalMap = new Map(
    approvals?.map(a => [a.id, (a.payments as any)?.payment_number || 'Unknown']) || []
  )

  // Process each approval
  for (const approvalId of approvalIds) {
    try {
      const success = await rejectPayment(approvalId, userId, comment)
      if (success) {
        result.successful++
      } else {
        result.failed++
        result.errors.push({
          approvalId,
          paymentNumber: approvalMap.get(approvalId) || 'Unknown',
          error: 'Ошибка отклонения'
        })
      }
    } catch (error) {
      result.failed++
      result.errors.push({
        approvalId,
        paymentNumber: approvalMap.get(approvalId) || 'Unknown',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
      console.error('[bulkRejectPayments] Error rejecting:', approvalId, error)
    }
  }

  console.log('[bulkRejectPayments] Completed:', result)
  return result
}
