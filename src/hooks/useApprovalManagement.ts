import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import {
  startApprovalProcess,
  loadApprovalsForRole,
  approvePayment,
  rejectPayment,
  loadApprovalHistory,
  checkPaymentApprovalStatus,
  type PaymentApproval
} from '../services/approvalOperations'
import { supabase } from '../lib/supabase'

export const useApprovalManagement = () => {
  const { user } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState<PaymentApproval[]>([])
  const [loadingApprovals, setLoadingApprovals] = useState(false)
  const [userRole, setUserRole] = useState<number | null>(null)

  // Загрузка роли пользователя
  const loadUserRole = useCallback(async () => {
    if (!user?.id) {
      console.log('[useApprovalManagement.loadUserRole] No user ID')
      return
    }

    console.log('[useApprovalManagement.loadUserRole] Loading role for user:', user.id)

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role_id')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error

      console.log('[useApprovalManagement.loadUserRole] User role loaded:', data?.role_id)
      setUserRole(data?.role_id || null)
    } catch (error) {
      console.error('[useApprovalManagement.loadUserRole] Error:', error)
    }
  }, [user])

  // Загрузка платежей на согласовании для текущей роли
  const loadPendingApprovals = useCallback(async () => {
    if (!userRole || !user?.id) {
      console.log('[useApprovalManagement.loadPendingApprovals] Missing data:', { userRole, userId: user?.id })
      return
    }

    console.log('[useApprovalManagement.loadPendingApprovals] Loading approvals for role:', userRole)
    setLoadingApprovals(true)

    try {
      const approvals = await loadApprovalsForRole(userRole, user.id)
      console.log('[useApprovalManagement.loadPendingApprovals] Loaded approvals:', approvals.length)
      setPendingApprovals(approvals)
    } finally {
      setLoadingApprovals(false)
    }
  }, [userRole, user])

  // Инициализация
  useEffect(() => {
    if (user?.id) {
      loadUserRole()
    }
  }, [user, loadUserRole])

  useEffect(() => {
    if (userRole) {
      loadPendingApprovals()
    }
  }, [userRole, loadPendingApprovals])

  // Запуск процесса согласования
  const handleStartApproval = useCallback(async (
    paymentId: string,
    routeId: number
  ) => {
    if (!user?.id) {
      message.error('Необходимо авторизоваться')
      return false
    }

    console.log('[useApprovalManagement.handleStartApproval] Starting approval:', { paymentId, routeId })

    const approval = await startApprovalProcess(paymentId, routeId)

    if (approval) {
      await loadPendingApprovals()
      return true
    }

    return false
  }, [user, loadPendingApprovals])

  // Согласование платежа
  const handleApprove = useCallback(async (
    approvalId: string,
    comment?: string
  ) => {
    if (!user?.id) {
      message.error('Необходимо авторизоваться')
      return false
    }


    const success = await approvePayment(approvalId, user.id, comment)

    if (success) {
      await loadPendingApprovals()
    }

    return success
  }, [user, loadPendingApprovals])

  // Отклонение платежа
  const handleReject = useCallback(async (
    approvalId: string,
    comment: string
  ) => {
    if (!user?.id) {
      message.error('Необходимо авторизоваться')
      return false
    }


    const success = await rejectPayment(approvalId, user.id, comment)

    if (success) {
      await loadPendingApprovals()
    }

    return success
  }, [user, loadPendingApprovals])

  // Загрузка истории согласования для платежа
  const getApprovalHistory = useCallback(async (paymentId: string) => {
    return await loadApprovalHistory(paymentId)
  }, [])

  // Проверка статуса согласования платежа
  const checkApprovalStatus = useCallback(async (paymentId: string) => {
    return await checkPaymentApprovalStatus(paymentId)
  }, [])

  return {
    // Данные
    pendingApprovals,
    loadingApprovals,
    userRole,

    // Действия
    handleStartApproval,
    handleApprove,
    handleReject,
    getApprovalHistory,
    checkApprovalStatus,
    loadPendingApprovals
  }
}