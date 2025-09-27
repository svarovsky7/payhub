import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import type { PaymentApproval, ApprovalStep } from './approvalProcess'

export const loadApprovalsForRole = async (roleId: number, userId?: string) => {
  console.log('[loadApprovalsForRole] Starting with roleId:', roleId, 'userId:', userId)

  try {
    // Получаем пользователя и его проекты
    let projectIds: number[] = []
    if (userId) {
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select(`
          roles (
            own_projects_only
          ),
          user_projects (
            project_id
          )
        `)
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('[loadApprovalsForRole] Error loading user profile:', userError)
      }

      console.log('[loadApprovalsForRole] User profile:', userProfile)

      if (userProfile?.roles?.own_projects_only) {
        projectIds = userProfile.user_projects?.map(up => up.project_id) || []
        console.log('[loadApprovalsForRole] User restricted to projects:', projectIds)
      }
    }

    // Загружаем согласования для роли
    let query = supabase
      .from('payment_approvals')
      .select(`
        *,
        payments!inner (
          *,
          invoices!inner (
            *,
            payer:contractors!invoices_payer_id_fkey (*),
            supplier:contractors!invoices_supplier_id_fkey (*),
            projects (*),
            invoice_types (*)
          ),
          payment_statuses (*)
        ),
        approval_routes!inner (
          *,
          workflow_stages!inner (
            *,
            roles (*)
          )
        ),
        approval_steps (
          *,
          workflow_stages (
            *,
            roles (*)
          ),
          acted_by:user_profiles (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('status_id', 2) // 2 = pending (На согласовании)

    // Применяем фильтр по проектам если необходимо
    if (projectIds.length > 0) {
      // Исправляем путь к полю project_id
      query = query.in('payments.invoices.project_id', projectIds)
    }

    const { data: approvals, error } = await query

    if (error) {
      console.error('[loadApprovalsForRole] Query error:', error)
      throw error
    }

    console.log('[loadApprovalsForRole] Raw approvals from DB:', approvals?.length || 0)
    console.log('[loadApprovalsForRole] Approvals data:', approvals)

    // Фильтруем по текущему этапу
    const filteredApprovals = (approvals || []).filter(approval => {
      // workflow_stages приходит как массив, нужно найти нужный этап по order_index
      const stages = approval.approval_routes?.workflow_stages || []
      const currentStage = stages.find((s: any) => s.order_index === approval.current_stage_index)
      const matches = currentStage?.role_id === roleId
      console.log('[loadApprovalsForRole] Checking approval:', {
        approvalId: approval.id,
        currentStageIndex: approval.current_stage_index,
        stagesCount: stages.length,
        currentStage: currentStage,
        currentStageRoleId: currentStage?.role_id,
        targetRoleId: roleId,
        matches
      })
      return matches
    })

    console.log('[loadApprovalsForRole] Filtered approvals:', filteredApprovals.length)

    // Добавляем информацию о текущем этапе
    const approvalsWithStage = filteredApprovals.map(approval => {
      // workflow_stages приходит как массив, нужно найти нужный этап по order_index
      const stages = approval.approval_routes?.workflow_stages || []
      const currentStage = stages.find((s: any) => s.order_index === approval.current_stage_index)

      // Логируем структуру первого approval
      if (filteredApprovals.indexOf(approval) === 0) {
        console.log('[loadApprovalsForRole] Mapping approval:', {
          hasPayments: !!approval.payments,
          paymentsData: approval.payments,
          hasInvoices: !!approval.payments?.invoices,
          invoicesData: approval.payments?.invoices
        })
      }

      // Правильно мапируем данные платежа и счета
      const paymentData = approval.payments || {}
      const mappedPayment = {
        ...paymentData,
        invoice: paymentData.invoices  // invoices приходит как единичный объект, переименовываем в invoice
      }
      delete mappedPayment.invoices  // удаляем старое поле

      return {
        ...approval,
        payment: mappedPayment,
        route: approval.approval_routes,
        steps: approval.approval_steps,
        current_stage: currentStage
      }
    })

    console.log('[loadApprovalsForRole] Returning approvals with stage:', approvalsWithStage.length)
    return approvalsWithStage as PaymentApproval[]
  } catch (error) {
    console.error('[ApprovalOperations.loadApprovalsForRole] Error:', error)
    message.error('Ошибка загрузки согласований')
    return []
  }
}

export const loadApprovalHistory = async (paymentId: string) => {

  try {
    const { data, error } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        approval_steps (
          *,
          workflow_stages (
            *,
            roles (*)
          ),
          acted_by:user_profiles (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Преобразуем структуру для совместимости с существующим кодом
    const formattedData = (data || []).map(approval => ({
      ...approval,
      steps: approval.approval_steps?.map((step: any) => ({
        ...step,
        stage: step.workflow_stages,
        actor: step.acted_by
      })) || []
    }))

    return formattedData
  } catch (error) {
    console.error('[ApprovalOperations.loadApprovalHistory] Error:', error)
    message.error('Ошибка загрузки истории согласования')
    return []
  }
}

export const checkPaymentApprovalStatus = async (paymentId: string) => {
  console.log('[checkPaymentApprovalStatus] Checking status for payment:', paymentId)

  try {
    const { data, error } = await supabase
      .from('payment_approvals')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('status_id', 2) // 2 = pending (На согласовании)
      .maybeSingle()

    if (error) {
      console.error('[checkPaymentApprovalStatus] Query error:', error)
      throw error
    }

    console.log('[checkPaymentApprovalStatus] Result:', data)

    return {
      isInApproval: !!data,
      approvalId: data?.id,
      current_stage_index: data?.current_stage_index || 0
    }
  } catch (error) {
    console.error('[ApprovalOperations.checkPaymentApprovalStatus] Full error:', error)
    return { isInApproval: false, approvalId: null, current_stage_index: 0 }
  }
}