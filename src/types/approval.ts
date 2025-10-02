// TypeScript types for approval/workflow system
// Replaces usage of 'any' in approval-related components

export interface WorkflowStage {
  id: number
  route_id: number
  order_index: number
  role_id: number
  name?: string
  payment_status_id?: number | null
  permissions?: Record<string, boolean> | null
  is_active?: boolean
  created_at: string
  updated_at: string
  // Relations
  role?: {
    id: number
    code: string
    name: string
  }
}

export interface ApprovalRoute {
  id: number
  invoice_type_id: number
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  stages?: WorkflowStage[]
  invoice_type?: {
    id: number
    code: string
    name: string
  }
}

export interface ApprovalStep {
  id: string
  payment_approval_id: string
  stage_id: number
  action: 'pending' | 'approved' | 'rejected'
  acted_by?: string | null
  acted_at?: string | null
  comment?: string | null
  created_at: string
  // Relations
  stage?: WorkflowStage
  user?: {
    id: string
    email: string
    full_name: string
  }
}

export interface PaymentApproval {
  id: string
  payment_id: string
  route_id: number
  status_id: number
  current_stage_index: number
  created_at: string
  updated_at: string
  // Relations
  route?: ApprovalRoute
  payment?: {
    id: string
    payment_number: number
    payment_date: string
    amount: number
    invoice_id: string
  }
  status?: {
    id: number
    code: string
    name: string
    color?: string
  }
  steps?: ApprovalStep[]
}

// Form data types
export interface CreateRouteFormData {
  name: string
  invoice_type_id: number
  is_active: boolean
  stages: WorkflowStageFormData[]
}

export interface WorkflowStageFormData {
  order_index: number
  role_id: number
  name?: string
  payment_status_id?: number | null
  permissions?: Record<string, boolean>
}

// API response types
export interface ApprovalActionResult {
  success: boolean
  message?: string
  approval?: PaymentApproval
}

export interface ApprovalStagePermissions {
  can_edit_amount?: boolean
  can_edit_date?: boolean
  can_add_files?: boolean
  can_edit_description?: boolean
}
