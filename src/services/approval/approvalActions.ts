import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import type { WorkflowStage, PaymentApproval } from '../../types/approval'
import { handleError, parseSupabaseError } from '../../lib/errorHandler'

export const approvePayment = async (
  approvalId: string,
  userId: string,
  comment?: string
) => {

  try {
    // Получаем информацию о процессе согласования
    const { data: approval, error: approvalError } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        route:approval_routes (
          *,
          stages:workflow_stages (
            *,
            role:roles (*)
          )
        )
      `)
      .eq('id', approvalId)
      .single()

    if (approvalError) throw approvalError
    if (!approval) {
      message.error('Процесс согласования не найден')
      return false
    }

    if (approval.status_id !== 2) { // 2 = pending (На согласовании)
      message.error('Процесс согласования уже завершён')
      return false
    }

    // Проверяем права пользователя на текущий этап
    // stages приходит как массив, нужно найти этап по order_index
    const stages = approval.route?.stages || []
    const currentStage = stages.find((s: any) => s.order_index === approval.current_stage_index)
    if (!currentStage) {
      message.error('Текущий этап не найден')
      return false
    }

    // Проверяем роль пользователя
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (userProfile?.role_id !== currentStage.role_id) {
      message.error('У вас нет прав для согласования на данном этапе')
      return false
    }

    // Обновляем текущий шаг
    const { error: stepError } = await supabase
      .from('approval_steps')
      .update({
        action: 'approved',
        acted_by: userId,  // Исправлено с actor_id
        acted_at: new Date().toISOString(),
        comment
      })
      .eq('payment_approval_id', approvalId)  // Исправлено с approval_id
      .eq('stage_id', currentStage.id)  // Используем stage_id вместо stage_index

    if (stepError) throw stepError

    // Проверяем, есть ли следующий этап
    const nextStageIndex = approval.current_stage_index + 1
    const nextStage = stages.find((s: WorkflowStage) => s.order_index === nextStageIndex)

    // Обновляем статус платежа согласно настройкам текущего этапа
    if (currentStage.payment_status_id) {
      console.log('[ApprovalActions.approvePayment] Updating payment status to:', currentStage.payment_status_id, 'for payment_id:', approval.payment_id)
      const { error: paymentStatusError } = await supabase
        .from('payments')
        .update({ status_id: currentStage.payment_status_id })
        .eq('id', approval.payment_id)

      if (paymentStatusError) {
        console.error('[ApprovalActions.approvePayment] Error updating payment status:', paymentStatusError)
        throw paymentStatusError
      }
      console.log('[ApprovalActions.approvePayment] Payment status successfully updated to:', currentStage.payment_status_id)
    }

    if (nextStage) {
      // Переходим к следующему этапу
      const { error: approvalUpdateError } = await supabase
        .from('payment_approvals')
        .update({
          current_stage_index: nextStageIndex
        })
        .eq('id', approvalId)

      if (approvalUpdateError) throw approvalUpdateError

      // Создаём новый шаг для следующего этапа
      const { error: nextStepError } = await supabase
        .from('approval_steps')
        .insert({
          payment_approval_id: approvalId,
          stage_id: nextStage.id,
          action: 'pending'
        })

      if (nextStepError) throw nextStepError

      message.success('Платёж согласован на текущем этапе')
    } else {
      // Это был последний этап - завершаем процесс
      const { error: approvalCompleteError } = await supabase
        .from('payment_approvals')
        .update({
          status_id: 5 // approved (В оплате)
        })
        .eq('id', approvalId)

      if (approvalCompleteError) throw approvalCompleteError

      message.success('Платёж полностью согласован')
    }

    // Пересчитываем статус счета
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', approval.payment_id)
      .single()

    if (payment?.invoice_id) {
      const { recalculateInvoiceStatus } = await import('../invoiceOperations')
      await recalculateInvoiceStatus(payment.invoice_id)
    }

    return true
  } catch (error) {
    console.error('[ApprovalOperations.approvePayment] Error:', error)
    message.error('Ошибка согласования платежа')
    return false
  }
}

export const rejectPayment = async (
  approvalId: string,
  userId: string,
  comment: string
) => {

  if (!comment) {
    message.error('Укажите причину отклонения')
    return false
  }

  try {
    // Получаем информацию о процессе согласования
    const { data: approval, error: approvalError } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        route:approval_routes (
          *,
          stages:workflow_stages (
            *,
            role:roles (*)
          )
        )
      `)
      .eq('id', approvalId)
      .single()

    if (approvalError) throw approvalError
    if (!approval) {
      message.error('Процесс согласования не найден')
      return false
    }

    if (approval.status_id !== 2) { // 2 = pending (На согласовании)
      message.error('Процесс согласования уже завершён')
      return false
    }

    // Проверяем права пользователя на текущий этап
    // stages приходит как массив, нужно найти этап по order_index
    const stages = approval.route?.stages || []
    const currentStage = stages.find((s: any) => s.order_index === approval.current_stage_index)
    if (!currentStage) {
      message.error('Текущий этап не найден')
      return false
    }

    // Проверяем роль пользователя
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (userProfile?.role_id !== currentStage.role_id) {
      message.error('У вас нет прав для отклонения на данном этапе')
      return false
    }

    // Обновляем текущий шаг
    const { error: stepError } = await supabase
      .from('approval_steps')
      .update({
        action: 'rejected',
        acted_by: userId,  // Исправлено с actor_id
        acted_at: new Date().toISOString(),
        comment
      })
      .eq('payment_approval_id', approvalId)  // Исправлено с approval_id
      .eq('stage_id', currentStage.id)  // Используем stage_id вместо stage_index

    if (stepError) throw stepError

    // Завершаем процесс согласования
    const { error: approvalRejectError } = await supabase
      .from('payment_approvals')
      .update({
        status_id: 4 // cancelled (Отменён)
      })
      .eq('id', approvalId)

    if (approvalRejectError) throw approvalRejectError

    // Обновляем статус платежа
    console.log('[ApprovalActions.rejectPayment] Updating payment status to 4 (Отменён) for payment_id:', approval.payment_id)
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status_id: 4 }) // cancelled (Отменён)
      .eq('id', approval.payment_id)

    if (paymentError) {
      console.error('[ApprovalActions.rejectPayment] Error updating payment status:', paymentError)
      throw paymentError
    }
    console.log('[ApprovalActions.rejectPayment] Payment status successfully updated to 4 (Отменён)')

    // Пересчитываем статус счета
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id, status_id')
      .eq('id', approval.payment_id)
      .single()

    console.log('[ApprovalActions.rejectPayment] Payment after status update:', payment)

    if (payment?.invoice_id) {
      const { recalculateInvoiceStatus } = await import('../invoiceOperations')
      console.log('[ApprovalActions.rejectPayment] Recalculating invoice status for invoice_id:', payment.invoice_id)
      await recalculateInvoiceStatus(payment.invoice_id)
    }

    message.success('Платёж отклонён')
    console.log('[ApprovalActions.rejectPayment] Payment rejection completed successfully')
    return true
  } catch (error) {
    console.error('[ApprovalOperations.rejectPayment] Error:', error)
    message.error('Ошибка отклонения платежа')
    return false
  }
}