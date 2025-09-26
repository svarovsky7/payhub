// Re-export all functions and types from separate modules
export { checkApprovalRoute } from './approval/approvalRoutes'
export {
  startApprovalProcess,
  type PaymentApproval,
  type ApprovalStep
} from './approval/approvalProcess'
export {
  approvePayment,
  rejectPayment
} from './approval/approvalActions'
export {
  loadApprovalsForRole,
  loadApprovalHistory,
  checkPaymentApprovalStatus
} from './approval/approvalQueries'

// Legacy type exports for backward compatibility

export interface WorkflowStage {
  id: number
  route_id: number
  order_index: number
  role_id: number
  name: string
  role?: any
}