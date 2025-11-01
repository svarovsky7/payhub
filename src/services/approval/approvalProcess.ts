import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import { recalculateInvoiceStatus } from '../invoiceOperations'

export interface PaymentApproval {
  id: string
  payment_id: string
  route_id: number
  current_stage_index: number
  status_id: number // 1=Создан, 2=На согласовании, 3=Оплачен, 4=Отменён, 5=В оплате
  created_at: string
  updated_at?: string
  payment?: any
  route?: any
  current_stage?: any
  steps?: any[]
}

export interface ApprovalStep {
  id: string
  payment_approval_id: string  // Исправлено с approval_id
  stage_id: number
  action: 'pending' | 'approved' | 'rejected'
  acted_by?: string  // Исправлено с actor_id
  acted_at?: string
  comment?: string
  stage?: any
  actor?: any
}

export const startApprovalProcess = async (
  paymentId: string,
  routeId: number
) => {
  console.log('[ApprovalProcess.startApprovalProcess] Starting approval with routeId:', routeId)

  try {
    // Получаем маршрут по ID
    const { data: route, error: routeError } = await supabase
      .from('approval_routes')
      .select('*')
      .eq('id', routeId)
      .eq('is_active', true)
      .single()

    if (routeError || !route) {
      message.error('Маршрут согласования не найден или неактивен')
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

    // Проверяем статус платежа - если отклонен (status_id = 4), разрешаем повторное согласование
    const { data: payment } = await supabase
      .from('payments')
      .select('status_id')
      .eq('id', paymentId)
      .single()

    if (payment?.status_id === 4) {
      // Для отклоненного платежа просто создаем новый процесс согласования
      // Старые записи сохраняются для истории
      console.log('[ApprovalProcess.startApprovalProcess] Creating new approval process for rejected payment')
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
    // Первый этап устанавливается как 'pending', остальные пока не создаются
    const steps = [{
      payment_approval_id: approval.id,  // Исправлено имя поля
      stage_id: stages[0].id,
      action: 'pending' as const
      // Убрали stage_index, так как его нет в таблице
    }]

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

    // Получаем invoice_id для обновления статуса счета
    const { data: paymentData } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', paymentId)
      .single()

    // Явно устанавливаем статус счета "На согласовании" (ID 2)
    if (paymentData?.invoice_id) {
      await supabase
        .from('invoices')
        .update({ status_id: 2 }) // pending (На согласовании)
        .eq('id', paymentData.invoice_id)
      
      // Дополнительно вызываем пересчет, чтобы учесть другие платежи, если они есть
      await recalculateInvoiceStatus(paymentData.invoice_id)
    }

    message.success('Платёж отправлен на согласование')

    return approval
  } catch (error) {
    console.error('[ApprovalOperations.startApprovalProcess] Error:', error)
    message.error('Ошибка запуска процесса согласования')
    return null
  }
}