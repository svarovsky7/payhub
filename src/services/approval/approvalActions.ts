import { supabase } from '../../lib/supabase'
import { message } from 'antd'
import type { WorkflowStage } from '../../components/admin/approval-routes/types'
import { recalculateInvoiceStatus } from '../invoiceOperations'

// Функция для обновления статуса счета согласно этапу согласования
const updateInvoiceStatusFromStage = async (
  invoiceId: string,
  stageInvoiceStatusId?: number | null,
  isLastStage?: boolean
) => {
  console.log('[updateInvoiceStatusFromStage] CALLED', {
    invoiceId,
    stageInvoiceStatusId,
    isLastStage,
  });

  if (!stageInvoiceStatusId && !isLastStage) {
    console.log('[updateInvoiceStatusFromStage] SKIPPED: No status to set.');
    return
  }

  try {
    if (isLastStage && stageInvoiceStatusId) {
      // Последний этап - проверяем полностью ли оплачен счет
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          id,
          amount_with_vat,
          delivery_cost,
          invoice_payments (
            allocated_amount,
            payments (
              status_id
            )
          )
        `)
        .eq('id', invoiceId)
        .single()

      if (invoice) {
        // Сумма счета с доставкой
        const totalAmount = (invoice.amount_with_vat || 0) + (invoice.delivery_cost || 0)
        
        // Сумма оплаченных платежей (со статусом "оплачен" - id=5)
        const paidAmount = ((invoice.invoice_payments || []) as any[])
          .reduce((sum, ip) => {
            if (ip.payments?.status_id === 5) { // 5 - статус платежа "оплачен"
              return sum + (ip.allocated_amount || 0)
            }
            return sum
          }, 0)

        // Определяем финальный статус в зависимости от суммы оплаты
        let finalStatusId = stageInvoiceStatusId
        
        // Если частичная оплата и выбранный статус = 3 (paid), меняем на 4 (partial)
        if (paidAmount > 0 && Math.abs(paidAmount - totalAmount) > 0.01) {
          // Частичная оплата
          if (stageInvoiceStatusId === 3) { // если выбран статус "paid"
            finalStatusId = 4 // используем "partial"
          }
        }

        console.log('[updateInvoiceStatusFromStage] FINAL STAGE: Calculated status:', {
          totalAmount,
          paidAmount,
          stageInvoiceStatusId,
          finalStatusId,
        });

        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status_id: finalStatusId })
          .eq('id', invoiceId)

        if (updateError) {
          console.error('[ApprovalActions.updateInvoiceStatusFromStage] Error:', updateError)
        }
      }
    } else if (stageInvoiceStatusId) {
      // Промежуточный этап - просто устанавливаем статус
      console.log(`[updateInvoiceStatusFromStage] INTERMEDIATE STAGE: Setting invoice status to: ${stageInvoiceStatusId}`);
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status_id: stageInvoiceStatusId })
        .eq('id', invoiceId)

      if (updateError) {
        console.error('[ApprovalActions.updateInvoiceStatusFromStage] Error:', updateError)
      }
    }
  } catch (error) {
    console.error('[ApprovalActions.updateInvoiceStatusFromStage] Error:', error)
  }
}

export const approvePayment = async (
  approvalId: string,
  userId: string,
  comment?: string,
  isBulkOperation: boolean = false
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
    const stages = (approval.route?.stages || []) as WorkflowStage[]
    const currentStage = stages.find((s: WorkflowStage) => s.order_index === approval.current_stage_index)
    
    console.log('[approvePayment] START', {
      approvalId,
      userId,
      paymentId: approval.payment_id,
      currentStageIndex: approval.current_stage_index,
      currentStageName: currentStage?.name,
      stagePaymentStatusId: currentStage?.payment_status_id,
      stageInvoiceStatusId: currentStage?.invoice_status_id,
    });

    if (!currentStage) {
      message.error('Текущий этап не найден')
      return false
    }

    // Проверяем роль пользователя
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .maybeSingle()

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

    if (nextStage) {
      // Это НЕ последний этап. Обновляем статус платежа, если он указан.
      if (currentStage.payment_status_id) {
        console.log(`[approvePayment] Updating payment status to: ${currentStage.payment_status_id}`);
        const { error: paymentStatusError } = await supabase
          .from('payments')
          .update({ status_id: currentStage.payment_status_id })
          .eq('id', approval.payment_id)

        if (paymentStatusError) throw paymentStatusError
      }
      
      // Обновляем статус счета, если он указан на этапе
      if (currentStage.invoice_status_id) {
        const { data: payment } = await supabase
          .from('payments')
          .select('invoice_id')
          .eq('id', approval.payment_id)
          .single()

        if (payment?.invoice_id) {
          await updateInvoiceStatusFromStage(
            payment.invoice_id,
            currentStage.invoice_status_id,
            false
          )
        }
      }
      
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

      if (!isBulkOperation) {
        message.success('Платёж согласован на текущем этапе')
      }
    } else {
      // Это был последний этап - завершаем процесс
      const { error: approvalCompleteError } = await supabase
        .from('payment_approvals')
        .update({
          status_id: 5 // approved (В оплате)
        })
        .eq('id', approvalId)

      if (approvalCompleteError) throw approvalCompleteError

      // Устанавливаем статус платежа согласно настройкам ЭТАПА, по умолчанию - "В оплате"
      const finalPaymentStatus = currentStage.payment_status_id || 5
      console.log(`[approvePayment] FINAL STAGE: Updating payment status to: ${finalPaymentStatus}`);
      const { error: paymentStatusError } = await supabase
        .from('payments')
        .update({ status_id: finalPaymentStatus }) // Используем статус из настроек
        .eq('id', approval.payment_id)

      if (paymentStatusError) throw paymentStatusError

      // Обновляем статус счета на последнем этапе
      const { data: payment } = await supabase
        .from('payments')
        .select('invoice_id')
        .eq('id', approval.payment_id)
        .single()

      if (payment?.invoice_id && currentStage.invoice_status_id) {
        await updateInvoiceStatusFromStage(
          payment.invoice_id,
          currentStage.invoice_status_id,
          true // последний этап
        )
      }

      if (!isBulkOperation) {
        message.success('Платёж полностью согласован')
      }
    }

    // Пересчитываем статус счета, т.к. статус платежа изменился
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', approval.payment_id)
      .single()

    if (payment?.invoice_id) {
      console.log(`[approvePayment] Recalculating status for invoice ${payment.invoice_id} after approval.`);
      await recalculateInvoiceStatus(payment.invoice_id)
    }
    
    console.log('[approvePayment] END SUCCESS', { approvalId });

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
  comment: string,
  isBulkOperation: boolean = false
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
    const stages = (approval.route?.stages || []) as WorkflowStage[]
    const currentStage = stages.find((s: WorkflowStage) => s.order_index === approval.current_stage_index)
    if (!currentStage) {
      message.error('Текущий этап не найден')
      return false
    }

    // Проверяем роль пользователя
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .maybeSingle()

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

    const { data: paymentForInvoice } = await supabase
      .from('payments')
      .select('invoice_id')
      .eq('id', approval.payment_id)
      .single();

    if (paymentForInvoice?.invoice_id) {
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status_id: 5 }) // cancelled
        .eq('id', paymentForInvoice.invoice_id);

      if (invoiceError) {
        console.error('[ApprovalActions.rejectPayment] Error updating invoice status:', invoiceError);
        // Можно обработать ошибку дальше, если это необходимо
      }
    }

    // НЕ вызываем recalculateInvoiceStatus, т.к. статус был явно установлен на "Отменен"
    
    if (!isBulkOperation) {
      message.success('Платёж отклонён')
    }
    console.log('[ApprovalActions.rejectPayment] Payment rejection completed successfully')
    return true
  } catch (error) {
    console.error('[ApprovalOperations.rejectPayment] Error:', error)
    message.error('Ошибка отклонения платежа')
    return false
  }
}