import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import { checkApprovalRoute } from './approvalRoutes'

export interface PaymentApproval {
  id: string
  payment_id: string
  route_id: number
  current_stage_index: number
  status_id: number // 1=Создан, 2=На согласовании, 3=Согласован, 4=Отклонен
  created_at: string
  updated_at?: string
  payment?: any
  route?: any
  current_stage?: any
  steps?: any[]
}

export interface ApprovalStep {
  id: string
  approval_id: string
  stage_id: number
  stage_index: number
  action: 'pending' | 'approved' | 'rejected'
  actor_id?: string
  acted_at?: string
  comment?: string
  stage?: any
  actor?: any
}

export const startApprovalProcess = async (
  paymentId: string,
  invoiceTypeId: number,
  userId: string
) => {
  console.log('[ApprovalOperations.startApprovalProcess] Starting approval for payment:', paymentId)

  try {
    // Проверяем, есть ли маршрут согласования для данного типа счёта
    const route = await checkApprovalRoute(invoiceTypeId)
    if (!route) {
      console.log('[ApprovalOperations.startApprovalProcess] No approval route found, skipping')
      message.info('Для данного типа счёта маршрут согласования не настроен')
      return null
    }

    // Проверяем, не запущен ли уже процесс согласования
    const { data: existingApproval } = await supabase
      .from('payment_approvals')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('status_id', 2) // pending (На согласовании)
      .single()

    if (existingApproval) {
      message.warning('Процесс согласования уже запущен')
      return null
    }

    // Получаем этапы маршрута
    const { data: stages, error: stagesError } = await supabase
      .from('workflow_stages')
      .select(`
        *,
        role:roles (*)
      `)
      .eq('route_id', route.id)
      .order('order_index')

    if (stagesError) throw stagesError
    if (!stages || stages.length === 0) {
      message.error('В маршруте согласования отсутствуют этапы')
      return null
    }

    // Создаём процесс согласования
    const { data: approval, error: approvalError } = await supabase
      .from('payment_approvals')
      .insert({
        payment_id: paymentId,
        route_id: route.id,
        current_stage_index: 0,
        status_id: 2 // pending (На согласовании)
      })
      .select()
      .single()

    if (approvalError) throw approvalError

    // Создаём шаги согласования для каждого этапа
    const steps = stages.map((stage, index) => ({
      approval_id: approval.id,
      stage_id: stage.id,
      stage_index: index,
      action: index === 0 ? 'pending' : 'waiting'
    }))

    const { error: stepsError } = await supabase
      .from('approval_steps')
      .insert(steps)

    if (stepsError) throw stepsError

    // Обновляем статус платежа
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status_id: 2 }) // pending (На согласовании)
      .eq('id', paymentId)

    if (paymentError) throw paymentError

    // После обновления статуса платежа пересчитываем статус счета
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', paymentId)
      .single()

    if (payment?.invoice_id) {
      console.log('[ApprovalOperations.startApprovalProcess] Recalculating invoice status for:', payment.invoice_id)
      const { recalculateInvoiceStatus } = await import('../invoiceOperations')
      await recalculateInvoiceStatus(payment.invoice_id)
    }

    message.success('Платёж отправлен на согласование')
    console.log('[ApprovalOperations.startApprovalProcess] Approval process started:', approval.id)

    return approval
  } catch (error) {
    console.error('[ApprovalOperations.startApprovalProcess] Error:', error)
    message.error('Ошибка запуска процесса согласования')
    return null
  }
}