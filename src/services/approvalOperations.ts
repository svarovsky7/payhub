import { supabase } from '../lib/supabase'
import { message } from 'antd'

export interface ApprovalRoute {
  id: number
  invoice_type_id: number
  name: string
  is_active: boolean
  invoice_type?: any
  stages?: WorkflowStage[]
}

export interface WorkflowStage {
  id: number
  route_id: number
  order_index: number
  role_id: number
  name: string
  role?: any
}

export interface PaymentApproval {
  id: string
  payment_id: string
  route_id: number
  status_id: number
  current_stage_index: number
  created_at: string
  updated_at: string
  route?: ApprovalRoute
  payment?: any
  current_stage?: WorkflowStage
  steps?: ApprovalStep[]
}

export interface ApprovalStep {
  id: string
  payment_approval_id: string
  stage_id: number
  action: 'pending' | 'approved' | 'rejected'
  acted_by?: string
  acted_at?: string
  comment?: string
  stage?: WorkflowStage
  actor?: any
}

// Проверка наличия активного маршрута для типа счета
export const checkApprovalRoute = async (invoiceTypeId: number) => {
  console.log('[ApprovalOperations.checkApprovalRoute] Checking route for invoice type:', invoiceTypeId)

  try {
    const { data, error } = await supabase
      .from('approval_routes')
      .select('*')
      .eq('invoice_type_id', invoiceTypeId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

    return data as ApprovalRoute | null
  } catch (error) {
    console.error('[ApprovalOperations.checkApprovalRoute] Error:', error)
    return null
  }
}

// Запуск процесса согласования
export const startApprovalProcess = async (
  paymentId: string,
  invoiceTypeId: number,
  userId: string
) => {
  console.log('[ApprovalOperations.startApprovalProcess] Starting approval for payment:', paymentId)

  try {
    // Проверяем, есть ли активный маршрут
    const route = await checkApprovalRoute(invoiceTypeId)
    if (!route) {
      message.error('Не настроен маршрут согласования для данного типа счета')
      return null
    }

    // Загружаем этапы маршрута
    const { data: stages, error: stagesError } = await supabase
      .from('workflow_stages')
      .select('*')
      .eq('route_id', route.id)
      .order('order_index', { ascending: true })

    if (stagesError) throw stagesError
    if (!stages || stages.length === 0) {
      message.error('В маршруте не настроены этапы согласования')
      return null
    }

    // Проверяем, нет ли уже процесса согласования для этого платежа
    const { data: existingApproval } = await supabase
      .from('payment_approvals')
      .select('id')
      .eq('payment_id', paymentId)
      .single()

    if (existingApproval) {
      message.warning('Для этого платежа уже запущен процесс согласования')
      return null
    }

    // Получаем статус "На согласовании" (id=2)
    const { data: approvalStatus } = await supabase
      .from('payment_statuses')
      .select('id')
      .eq('code', 'pending')
      .single()

    const statusId = approvalStatus?.id || 2

    // Создаем процесс согласования
    const { data: approval, error: approvalError } = await supabase
      .from('payment_approvals')
      .insert([{
        payment_id: paymentId,
        route_id: route.id,
        status_id: statusId,
        current_stage_index: 0
      }])
      .select()
      .single()

    if (approvalError) throw approvalError

    // Создаем первый шаг согласования
    const firstStage = stages[0]
    const { error: stepError } = await supabase
      .from('approval_steps')
      .insert([{
        payment_approval_id: approval.id,
        stage_id: firstStage.id,
        action: 'pending'
      }])

    if (stepError) throw stepError

    // Обновляем статус платежа
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status_id: statusId })
      .eq('id', paymentId)

    if (updateError) throw updateError

    // Получаем информацию о платеже для пересчета статуса счёта
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', paymentId)
      .single()

    // Пересчитываем статус связанного счёта
    if (payment?.invoice_id) {
      console.log('[ApprovalOperations.startApprovalProcess] Recalculating invoice status for:', payment.invoice_id)
      const { recalculateInvoiceStatus } = await import('./invoiceOperations')
      await recalculateInvoiceStatus(payment.invoice_id)
    }

    message.success('Платеж отправлен на согласование')
    return approval
  } catch (error: any) {
    console.error('[ApprovalOperations.startApprovalProcess] Error:', error)
    message.error(error.message || 'Ошибка запуска процесса согласования')
    return null
  }
}

// Загрузка платежей на согласовании для текущей роли
export const loadApprovalsForRole = async (roleId: number, userId?: string) => {
  console.log('[ApprovalOperations.loadApprovalsForRole] Loading approvals for role:', roleId)

  try {
    // Получаем информацию о роли
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('own_projects_only')
      .eq('id', roleId)
      .single()

    if (roleError) {
      console.error('[ApprovalOperations.loadApprovalsForRole] Error loading role:', roleError)
      throw roleError
    }

    let userProjectIds: number[] = []

    // Если у роли стоит ограничение по проектам, получаем проекты пользователя
    if (role?.own_projects_only && userId) {
      console.log('[ApprovalOperations.loadApprovalsForRole] Getting user projects for filtering')

      const { data: userProjects, error: projectsError } = await supabase
        .from('user_projects')
        .select('project_id')
        .eq('user_id', userId)

      if (projectsError) {
        console.error('[ApprovalOperations.loadApprovalsForRole] Error loading user projects:', projectsError)
        throw projectsError
      }

      userProjectIds = userProjects?.map(up => up.project_id) || []

      if (userProjectIds.length === 0) {
        console.log('[ApprovalOperations.loadApprovalsForRole] User has no projects assigned')
        return []
      }
    }

    // Находим все процессы согласования, где текущий этап соответствует роли
    const { data, error } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        route:approval_routes(
          *,
          invoice_type:invoice_types(*)
        ),
        payment:payments(
          *,
          payment_status:payment_statuses(*),
          invoice:invoices(
            *,
            payer:contractors!invoices_payer_id_fkey(*),
            supplier:contractors!invoices_supplier_id_fkey(*),
            project:projects(*)
          )
        ),
        steps:approval_steps(
          *,
          stage:workflow_stages(
            *,
            role:roles(*)
          ),
          actor:user_profiles(*)
        )
      `)

    if (error) throw error

    // Фильтруем только те, где текущий этап требует указанную роль
    const filteredApprovals = []
    for (const approval of data || []) {
      // Загружаем текущий этап со всеми связанными данными
      const { data: currentStage } = await supabase
        .from('workflow_stages')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('route_id', approval.route_id)
        .eq('order_index', approval.current_stage_index)
        .single()

      // Также загружаем все этапы маршрута для подсчёта общего количества
      const { data: routeStages } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('route_id', approval.route_id)
        .order('order_index')

      if (currentStage && currentStage.role_id === roleId) {
        // Проверяем, не обработан ли уже этот этап
        const currentStep = approval.steps?.find(
          (step: ApprovalStep) => step.stage_id === currentStage.id
        )

        if (currentStep?.action === 'pending') {
          // Проверяем фильтрацию по проектам, если она включена
          if (role?.own_projects_only && userProjectIds.length > 0) {
            // Проверяем, что проект счета входит в список проектов пользователя
            const invoiceProjectId = approval.payment?.invoice?.project_id
            if (!invoiceProjectId || !userProjectIds.includes(invoiceProjectId)) {
              continue // Пропускаем этот платеж
            }
          }

          // Добавляем информацию о маршруте с этапами
          const enrichedApproval = {
            ...approval,
            current_stage: currentStage,
            route: {
              ...approval.route,
              stages: routeStages || []
            }
          }
          filteredApprovals.push(enrichedApproval)
        }
      }
    }

    console.log('[ApprovalOperations.loadApprovalsForRole] Found approvals:', filteredApprovals.length)
    return filteredApprovals as PaymentApproval[]
  } catch (error) {
    console.error('[ApprovalOperations.loadApprovalsForRole] Error:', error)
    return []
  }
}

// Согласование платежа
export const approvePayment = async (
  approvalId: string,
  userId: string,
  comment?: string
) => {
  console.log('[ApprovalOperations.approvePayment] Approving payment approval:', approvalId)

  try {
    // Загружаем информацию о процессе согласования
    const { data: approval, error: approvalError } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        route:approval_routes(
          *,
          stages:workflow_stages(*)
        )
      `)
      .eq('id', approvalId)
      .single()

    if (approvalError) throw approvalError

    // Получаем текущий этап
    const currentStage = approval.route.stages.find(
      (s: WorkflowStage) => s.order_index === approval.current_stage_index
    )

    if (!currentStage) {
      throw new Error('Текущий этап не найден')
    }

    // Обновляем шаг согласования
    const { error: updateStepError } = await supabase
      .from('approval_steps')
      .update({
        action: 'approved',
        acted_by: userId,
        acted_at: new Date().toISOString(),
        comment
      })
      .eq('payment_approval_id', approvalId)
      .eq('stage_id', currentStage.id)

    if (updateStepError) throw updateStepError

    // Обновляем статусы платежа и счёта согласно настройкам этапа
    if (currentStage.payment_status_id) {
      console.log('[ApprovalOperations.approvePayment] Updating payment status to:', currentStage.payment_status_id)
      const { error: updatePaymentStatusError } = await supabase
        .from('payments')
        .update({ status_id: currentStage.payment_status_id })
        .eq('id', approval.payment_id)

      if (updatePaymentStatusError) {
        console.error('[ApprovalOperations.approvePayment] Error updating payment status:', updatePaymentStatusError)
      }
    }

    if (currentStage.invoice_status_id) {
      console.log('[ApprovalOperations.approvePayment] Updating invoice status to:', currentStage.invoice_status_id)
      // Получаем информацию о платеже и связанном счёте
      const { data: payment } = await supabase
        .from('payments')
        .select('invoice_id')
        .eq('id', approval.payment_id)
        .single()

      if (payment?.invoice_id) {
        const { error: updateInvoiceStatusError } = await supabase
          .from('invoices')
          .update({ status_id: currentStage.invoice_status_id })
          .eq('id', payment.invoice_id)

        if (updateInvoiceStatusError) {
          console.error('[ApprovalOperations.approvePayment] Error updating invoice status:', updateInvoiceStatusError)
        }
      }
    }

    // Проверяем, есть ли следующий этап
    const nextStageIndex = approval.current_stage_index + 1
    const nextStage = approval.route.stages.find(
      (s: WorkflowStage) => s.order_index === nextStageIndex
    )

    if (nextStage) {
      // Переходим к следующему этапу
      const { error: updateApprovalError } = await supabase
        .from('payment_approvals')
        .update({
          current_stage_index: nextStageIndex
        })
        .eq('id', approvalId)

      if (updateApprovalError) throw updateApprovalError

      // Создаем шаг для следующего этапа
      const { error: createStepError } = await supabase
        .from('approval_steps')
        .insert([{
          payment_approval_id: approvalId,
          stage_id: nextStage.id,
          action: 'pending'
        }])

      if (createStepError) throw createStepError

      message.success('Платеж согласован и передан на следующий этап')
    } else {
      // Это был последний этап - завершаем согласование
      // Получаем статус "В оплате" (id=3)
      const { data: approvedStatus } = await supabase
        .from('payment_statuses')
        .select('id')
        .eq('code', 'approved')
        .single()

      const statusId = approvedStatus?.id || 3

      // Обновляем статус процесса согласования
      const { error: updateApprovalError } = await supabase
        .from('payment_approvals')
        .update({
          status_id: statusId
        })
        .eq('id', approvalId)

      if (updateApprovalError) throw updateApprovalError

      // Обновляем статус платежа
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ status_id: statusId })
        .eq('id', approval.payment_id)

      if (updatePaymentError) throw updatePaymentError

      message.success('Платеж полностью согласован')
    }

    return true
  } catch (error: any) {
    console.error('[ApprovalOperations.approvePayment] Error:', error)
    message.error(error.message || 'Ошибка согласования платежа')
    return false
  }
}

// Отклонение платежа
export const rejectPayment = async (
  approvalId: string,
  userId: string,
  comment: string
) => {
  console.log('[ApprovalOperations.rejectPayment] Rejecting payment approval:', approvalId)

  if (!comment) {
    message.error('При отклонении необходимо указать причину')
    return false
  }

  try {
    // Загружаем информацию о процессе согласования
    const { data: approval, error: approvalError } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        route:approval_routes(
          *,
          stages:workflow_stages(*)
        )
      `)
      .eq('id', approvalId)
      .single()

    if (approvalError) throw approvalError

    // Получаем текущий этап
    const currentStage = approval.route.stages.find(
      (s: WorkflowStage) => s.order_index === approval.current_stage_index
    )

    if (!currentStage) {
      throw new Error('Текущий этап не найден')
    }

    // Обновляем шаг согласования
    const { error: updateStepError } = await supabase
      .from('approval_steps')
      .update({
        action: 'rejected',
        acted_by: userId,
        acted_at: new Date().toISOString(),
        comment
      })
      .eq('payment_approval_id', approvalId)
      .eq('stage_id', currentStage.id)

    if (updateStepError) throw updateStepError

    // Получаем статус "Отменён" (id=5)
    const { data: rejectedStatus } = await supabase
      .from('payment_statuses')
      .select('id')
      .eq('code', 'cancelled')
      .single()

    const statusId = rejectedStatus?.id || 5

    // Обновляем статус процесса согласования
    const { error: updateApprovalError } = await supabase
      .from('payment_approvals')
      .update({
        status_id: statusId
      })
      .eq('id', approvalId)

    if (updateApprovalError) throw updateApprovalError

    // Обновляем статус платежа
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({ status_id: statusId })
      .eq('id', approval.payment_id)

    if (updatePaymentError) throw updatePaymentError

    message.success('Платеж отклонен')
    return true
  } catch (error: any) {
    console.error('[ApprovalOperations.rejectPayment] Error:', error)
    message.error(error.message || 'Ошибка отклонения платежа')
    return false
  }
}

// Загрузка истории согласования платежа
export const loadApprovalHistory = async (paymentId: string) => {
  console.log('[ApprovalOperations.loadApprovalHistory] Loading history for payment:', paymentId)

  try {
    const { data, error } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        route:approval_routes(
          *,
          invoice_type:invoice_types(*)
        ),
        steps:approval_steps(
          *,
          stage:workflow_stages(
            *,
            role:roles(*)
          ),
          actor:user_profiles(*)
        )
      `)
      .eq('payment_id', paymentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return data as PaymentApproval | null
  } catch (error) {
    console.error('[ApprovalOperations.loadApprovalHistory] Error:', error)
    return null
  }
}

// Проверка, находится ли платеж на согласовании
export const checkPaymentApprovalStatus = async (paymentId: string) => {
  console.log('[ApprovalOperations.checkPaymentApprovalStatus] Checking approval status for:', paymentId)

  try {
    const { data, error } = await supabase
      .from('payment_approvals')
      .select('id, status_id, current_stage_index')
      .eq('payment_id', paymentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return data ? { isInApproval: true, ...data } : { isInApproval: false }
  } catch (error) {
    console.error('[ApprovalOperations.checkPaymentApprovalStatus] Error:', error)
    return { isInApproval: false }
  }
}