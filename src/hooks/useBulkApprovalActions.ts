import { useState } from 'react'
import { message } from 'antd'
import { bulkApprovePayments, bulkRejectPayments } from '../services/approval/approvalBulk'
import type { BulkApprovalResult } from '../services/approval/approvalBulk'
import type { PaymentApproval } from '../services/approvalOperations'

interface UseBulkApprovalActionsProps {
  userId: string | undefined
  loadPendingApprovals: () => Promise<void>
}

export const useBulkApprovalActions = ({ userId, loadPendingApprovals }: UseBulkApprovalActionsProps) => {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal states
  const [bulkRejectModalVisible, setBulkRejectModalVisible] = useState(false)

  // Data states
  const [bulkComment, setBulkComment] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkResult, setBulkResult] = useState<BulkApprovalResult | null>(null)

  // Handle select all
  const handleSelectAll = (checked: boolean, pendingApprovals: PaymentApproval[]) => {
    if (checked) {
      setSelectedIds(pendingApprovals.map(a => a.id))
    } else {
      setSelectedIds([])
    }
  }

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedIds([])
  }

  // Handle bulk approve
  const handleBulkApprove = async (comment?: string) => {
    if (!userId || selectedIds.length === 0) return

    console.log('[useBulkApprovalActions.handleBulkApprove] Starting bulk approve:', selectedIds.length)
    setBulkProcessing(true)
    setBulkProgress(0)

    try {
      const totalCount = selectedIds.length
      const progressInterval = 100 / totalCount

      // Simulate progress updates while processing
      const progressTimer = setInterval(() => {
        setBulkProgress(prev => Math.min(prev + progressInterval / 2, 95))
      }, 250)

      const result = await bulkApprovePayments(selectedIds, userId, comment)
      clearInterval(progressTimer)
      setBulkProgress(100)

      console.log('[useBulkApprovalActions.handleBulkApprove] Result:', result)

      if (result.successful > 0) {
        const amount = result.totalAmount || 0
        const formattedAmount = (amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        message.success(`Согласовано ${result.successful} платеж(ей) на сумму ${formattedAmount}₽`)
      }

      if (result.failed > 0) {
        message.error(`Ошибок: ${result.failed} из ${result.total}`)
      }

      setSelectedIds([])
      await loadPendingApprovals()
    } catch (error) {
      console.error('[useBulkApprovalActions.handleBulkApprove] Error:', error)
      message.error('Ошибка массового согласования')
    } finally {
      setBulkProcessing(false)
      setBulkProgress(0)
    }
  }

  // Handle bulk reject (open modal)
  const handleBulkReject = async () => {
    setBulkRejectModalVisible(true)
    setBulkResult(null)
  }

  // Submit bulk reject
  const submitBulkReject = async () => {
    if (!userId || selectedIds.length === 0 || !bulkComment.trim()) {
      message.error('Укажите причину отклонения')
      return
    }

    console.log('[useBulkApprovalActions.submitBulkReject] Starting bulk reject:', selectedIds.length)
    setBulkProcessing(true)
    setBulkProgress(0)
    setBulkResult(null)

    try {
      const totalCount = selectedIds.length
      const progressInterval = 100 / totalCount

      // Simulate progress updates while processing
      const progressTimer = setInterval(() => {
        setBulkProgress(prev => Math.min(prev + progressInterval / 2, 95))
      }, 250)

      const result = await bulkRejectPayments(selectedIds, userId, bulkComment)
      clearInterval(progressTimer)
      setBulkProgress(100)

      console.log('[useBulkApprovalActions.submitBulkReject] Result:', result)

      setBulkResult(result)

      if (result.successful > 0) {
        const amount = result.totalAmount || 0
        const formattedAmount = (amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        message.success(`Отклонено ${result.successful} платеж(ей) на сумму ${formattedAmount}₽`)
      }

      if (result.failed > 0) {
        message.error(`Ошибок: ${result.failed} из ${result.total}`)
      }

      // Clear selection and reload only if fully successful
      if (result.failed === 0) {
        setSelectedIds([])
        setBulkComment('')
        setBulkRejectModalVisible(false)
        await loadPendingApprovals()
      }
    } catch (error) {
      console.error('[useBulkApprovalActions.submitBulkReject] Error:', error)
      message.error('Ошибка массового отклонения')
    } finally {
      setBulkProcessing(false)
      setBulkProgress(0)
    }
  }

  // Reset bulk reject modal
  const resetBulkRejectModal = () => {
    setBulkRejectModalVisible(false)
    setBulkComment('')
    setBulkResult(null)
  }

  return {
    // Selection
    selectedIds,
    setSelectedIds,
    // Modal visibility
    bulkRejectModalVisible,
    setBulkRejectModalVisible,
    // Data
    bulkComment,
    setBulkComment,
    bulkProcessing,
    bulkProgress,
    bulkResult,
    // Handlers
    handleSelectAll,
    handleClearSelection,
    handleBulkApprove,
    handleBulkReject,
    submitBulkReject,
    resetBulkRejectModal
  }
}
