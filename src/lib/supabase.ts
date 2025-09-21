import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserProfile = {
  id: string
  email: string
  full_name: string
  created_at: string
  updated_at: string
}

export type UserProject = {
  id: number
  user_id: string
  project_id: number
  created_at: string
}

export type Role = {
  id: number
  code: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export type Project = {
  id: number
  code?: string
  name: string
  description?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export type ContractorType = {
  id: number
  code: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export type Contractor = {
  id: number
  type_id: number
  name: string
  inn?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type InvoiceType = {
  id: number
  code: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export type InvoiceStatus = {
  id: number
  code: string
  name: string
  description?: string
  sort_order?: number
  color?: string
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  user_id: string
  invoice_number: string
  invoice_date: string
  payer_id?: number
  supplier_id?: number
  project_id?: number
  invoice_type_id?: number
  amount: number // оставляем для совместимости
  amount_with_vat?: number
  vat_rate?: number
  vat_amount?: number
  amount_without_vat?: number
  delivery_days?: number
  delivery_days_type?: 'working' | 'calendar'
  preliminary_delivery_date?: string
  status?: string // оставляем для совместимости
  status_id?: number
  description?: string
  due_date?: string // оставляем для совместимости, но не используем
  created_at: string
  updated_at: string
  // Связанные объекты (для JOIN запросов)
  payer?: Contractor
  supplier?: Contractor
  project?: Project
  invoice_type?: InvoiceType
  invoice_status?: InvoiceStatus
}

export type Attachment = {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  created_by: string
  created_at: string
  updated_at: string
}

export type InvoiceAttachment = {
  id: string
  invoice_id: string
  attachment_id: string
  created_at: string
  attachment?: Attachment
}

export type PaymentStatus = {
  id: number
  code: string
  name: string
  description?: string
  sort_order?: number
  color?: string
  created_at: string
  updated_at: string
}

export type PaymentType = {
  id: number
  code: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export type Payment = {
  id: string
  invoice_id: string
  payment_number: number
  payment_date: string
  amount: number
  description?: string
  payment_type_id?: number
  status_id: number
  created_by?: string
  created_at: string
  updated_at: string
  // Связанные объекты
  payment_type?: PaymentType
  payment_status?: PaymentStatus
}

export type InvoicePayment = {
  id: string
  invoice_id: string
  payment_id: string
  allocated_amount: number
  created_at: string
  payment?: Payment
}