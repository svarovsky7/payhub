import { useState } from 'react'
import { message } from 'antd'
import type { PaymentApproval } from '../services/approvalOperations'

interface UseApprovalActionsProps {
  handleApprove: (id: string, comment?: string) => Promise<boolean>
  handleReject: (id: string, comment: string) => Promise<boolean>
  getApprovalHistory: (paymentId: string) => Promise<PaymentApproval[]>
  loadPendingApprovals: () => Promise<void>
}

export const useApprovalActions = ({
  handleApprove,
  handleReject,
  getApprovalHistory,
  loadPendingApprovals
}: UseApprovalActionsProps) => {
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<PaymentApproval | null>(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  // Handle approve click
  const handleApproveClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    setComment('')
    setApproveModalVisible(true)
  }

  // Handle reject click
  const handleRejectClick = (approval: PaymentApproval) => {
    setSelectedApproval(approval)
    setComment('')
    setRejectModalVisible(true)
  }

  // Handle history view
  const handleHistoryClick = async (approval: PaymentApproval) => {
    console.log('[useApprovalActions.handleHistoryClick] Loading history for payment:', approval.payment_id)

    // Load full history
    const history = await getApprovalHistory(approval.payment_id)
    console.log('[useApprovalActions.handleHistoryClick] History loaded:', history)

    if (history && history.length > 0) {
      setSelectedApproval(history[0])
    } else {
      setSelectedApproval(approval)
    }

    setHistoryModalVisible(true)
  }

  // Submit approval
  const submitApproval = async () => {
    if (!selectedApproval) return

    setProcessing(true)

    try {
      const success = await handleApprove(selectedApproval.id, comment || undefined)
      if (success) {
        setApproveModalVisible(false)
        setSelectedApproval(null)
        setComment('')
        await loadPendingApprovals()
      }
    } finally {
      setProcessing(false)
    }
  }

  // Submit rejection
  const submitRejection = async () => {
    if (!selectedApproval) return

    if (!comment.trim()) {
      message.error('Укажите причину отклонения')
      return
    }

    setProcessing(true)

    try {
      const success = await handleReject(selectedApproval.id, comment)
      if (success) {
        setRejectModalVisible(false)
        setSelectedApproval(null)
        setComment('')
        await loadPendingApprovals()
      }
    } finally {
      setProcessing(false)
    }
  }

  // Reset state
  const resetApprovalState = () => {
    setApproveModalVisible(false)
    setRejectModalVisible(false)
    setSelectedApproval(null)
    setComment('')
  }

  return {
    // Modal visibility
    approveModalVisible,
    setApproveModalVisible,
    rejectModalVisible,
    setRejectModalVisible,
    historyModalVisible,
    setHistoryModalVisible,
    // Data
    selectedApproval,
    setSelectedApproval,
    comment,
    setComment,
    processing,
    // Handlers
    handleApproveClick,
    handleRejectClick,
    handleHistoryClick,
    submitApproval,
    submitRejection,
    resetApprovalState
  }
}
