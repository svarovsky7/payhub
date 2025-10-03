import type { PaymentApproval } from '../services/approvalOperations'

interface WorkflowStage {
  order_index: number
  permissions?: Record<string, boolean | string | number>
}

/**
 * Calculate VAT amounts from total amount with VAT
 */
export const calculateVatAmounts = (amountWithVat: number, vatRate: number) => {
  const vatAmount = amountWithVat * (vatRate / (100 + vatRate))
  const amountWithoutVat = amountWithVat - vatAmount
  return { vatAmount, amountWithoutVat }
}

/**
 * Get current stage permissions for an approval
 */
export const getCurrentStagePermissions = (approval: PaymentApproval) => {
  const currentStage = approval.route?.stages?.find(
    (stage: WorkflowStage) => stage.order_index === approval.current_stage_index
  )
  return currentStage?.permissions || {}
}
