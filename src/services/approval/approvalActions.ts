import { supabase } from '../../lib/supabase'
import { message } from 'antd'

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
    const currentStage = approval.route?.stages?.[approval.current_stage_index]
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
        actor_id: userId,
        acted_at: new Date().toISOString(),
        comment
      })
      .eq('approval_id', approvalId)
      .eq('stage_index', approval.current_stage_index)

    if (stepError) throw stepError

    // Проверяем, есть ли следующий этап
    const nextStageIndex = approval.current_stage_index + 1
    const hasNextStage = nextStageIndex < (approval.route?.stages?.length || 0)

    if (hasNextStage) {
      // Переходим к следующему этапу
      const { error: approvalUpdateError } = await supabase
        .from('payment_approvals')
        .update({
          current_stage_index: nextStageIndex
        })
        .eq('id', approvalId)

      if (approvalUpdateError) throw approvalUpdateError

      // Обновляем следующий шаг
      const { error: nextStepError } = await supabase
        .from('approval_steps')
        .update({
          action: 'pending'
        })
        .eq('approval_id', approvalId)
        .eq('stage_index', nextStageIndex)

      if (nextStepError) throw nextStepError

      message.success('Платёж согласован на текущем этапе')
    } else {
      // Это был последний этап - завершаем процесс
      const { error: approvalCompleteError } = await supabase
        .from('payment_approvals')
        .update({
          status_id: 3 // approved (В оплате)
        })
        .eq('id', approvalId)

      if (approvalCompleteError) throw approvalCompleteError

      // Обновляем статус платежа
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ status_id: 3 }) // approved (В оплате)
        .eq('id', approval.payment_id)

      if (paymentError) throw paymentError

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

      message.success('Платёж полностью согласован')
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
    const currentStage = approval.route?.stages?.[approval.current_stage_index]
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
        actor_id: userId,
        acted_at: new Date().toISOString(),
        comment
      })
      .eq('approval_id', approvalId)
      .eq('stage_index', approval.current_stage_index)

    if (stepError) throw stepError

    // Завершаем процесс согласования
    const { error: approvalRejectError } = await supabase
      .from('payment_approvals')
      .update({
        status_id: 5 // cancelled (Отменён)
      })
      .eq('id', approvalId)

    if (approvalRejectError) throw approvalRejectError

    // Обновляем статус платежа
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status_id: 5 }) // cancelled (Отменён)
      .eq('id', approval.payment_id)

    if (paymentError) throw paymentError

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

    message.success('Платёж отклонён')
    return true
  } catch (error) {
    console.error('[ApprovalOperations.rejectPayment] Error:', error)
    message.error('Ошибка отклонения платежа')
    return false
  }
}