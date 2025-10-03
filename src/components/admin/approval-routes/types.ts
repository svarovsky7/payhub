import type { InvoiceType } from '../../../lib/supabase'

export interface Role {
  id: number
  code: string
  name: string
}

export interface StagePermissions {
  can_edit_invoice?: boolean
  can_add_files?: boolean
  can_edit_amount?: boolean
  can_show_budgets?: boolean
  [key: string]: boolean | undefined // Для будущих разрешений
}

export interface WorkflowStage {
  id?: number
  route_id?: number
  order_index: number
  role_id: number
  name: string
  payment_status_id?: number
  role?: Role
  payment_status?: any
  permissions?: StagePermissions
}

export interface ApprovalRoute {
  id: number
  invoice_type_id: number
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  invoice_type?: InvoiceType
  stages?: WorkflowStage[]
}