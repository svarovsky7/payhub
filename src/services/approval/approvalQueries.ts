import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import type { PaymentApproval, ApprovalStep } from './approvalProcess'

export const loadApprovalsForRole = async (roleId: number, userId?: string) => {

  try {
    // Получаем пользователя и его проекты
    let projectIds: number[] = []
    if (userId) {
      const { data: userProfile } = await supabase
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

      if (userProfile?.roles?.own_projects_only) {
        projectIds = userProfile.user_projects?.map(up => up.project_id) || []
      }
    }

    // Загружаем согласования для роли
    let query = supabase
      .from('payment_approvals')
      .select(`
        *,
        payment:payments (
          *,
          invoice:invoices (
            *,
            payer:contractors!invoices_payer_id_fkey (*),
            supplier:contractors!invoices_supplier_id_fkey (*),
            project:projects (*),
            invoice_type:invoice_types (*)
          ),
          payment_status:payment_statuses (*)
        ),
        route:approval_routes (
          *,
          stages:workflow_stages (
            *,
            role:roles (*)
          )
        ),
        steps:approval_steps (
          *,
          stage:workflow_stages (
            *,
            role:roles (*)
          ),
          actor:user_profiles (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('status_id', 2) // 2 = pending (На согласовании)

    // Применяем фильтр по проектам если необходимо
    if (projectIds.length > 0) {
      query = query.in('payment.invoice.project_id', projectIds)
    }

    const { data: approvals, error } = await query

    if (error) throw error

    // Фильтруем по текущему этапу
    const filteredApprovals = (approvals || []).filter(approval => {
      const currentStage = approval.route?.stages?.[approval.current_stage_index]
      return currentStage?.role_id === roleId
    })

    // Добавляем информацию о текущем этапе
    const approvalsWithStage = filteredApprovals.map(approval => {
      const currentStage = approval.route?.stages?.[approval.current_stage_index]
      return {
        ...approval,
        current_stage: currentStage
      }
    })

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
        steps:approval_steps (
          *,
          stage:workflow_stages (
            *,
            role:roles (*)
          ),
          actor:user_profiles (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[ApprovalOperations.loadApprovalHistory] Error:', error)
    message.error('Ошибка загрузки истории согласования')
    return []
  }
}

export const checkPaymentApprovalStatus = async (paymentId: string) => {

  try {
    const { data, error } = await supabase
      .from('payment_approvals')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('status_id', 2) // 2 = pending (На согласовании)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

    return {
      isInApproval: !!data,
      approvalId: data?.id,
      current_stage_index: data?.current_stage_index || 0
    }
  } catch (error) {
    console.error('[ApprovalOperations.checkPaymentApprovalStatus] Error:', error)
    return { isInApproval: false, approvalId: null, current_stage_index: 0 }
  }
}