import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('[supabase.ts] Initializing Supabase client:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'payhub-app'
    }
  }
})

export type UserProfile = {
  id: string
  email: string
  full_name: string
  created_at: string
  updated_at: string
  is_disabled?: boolean
}

export type Role = {
  id: number
  code: string
  name: string
  description?: string
  own_projects_only: boolean
  allowed_pages?: any // JSON field for storing allowed pages array
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

export type Contractor = {
  id: number
  name: string
  inn: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type ContractorAlternativeName = {
  id: number
  contractor_id: number
  alternative_name: string
  is_primary: boolean
  sort_order?: number
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
  delivery_cost?: number
  delivery_days?: number
  delivery_days_type?: 'working' | 'calendar'
  preliminary_delivery_date?: string
  status?: string // оставляем для совместимости
  status_id?: number
  description?: string
  due_date?: string // оставляем для совместимости, но не используем
  relevance_date?: string
  contract_id?: string // новое поле для связи с договором
  material_request_id?: string // новое поле для связи с заявкой на материалы
  responsible_id?: string // UUID ответственного менеджера (ссылка на user_profiles)
  recipient?: string // Получатель счета
  is_archived?: boolean // поле для архивирования счетов
  created_at: string
  updated_at: string
  // Связанные объекты (для JOIN запросов)
  payer?: Contractor
  supplier?: Contractor
  project?: Project
  invoice_type?: InvoiceType
  invoice_status?: InvoiceStatus
  employee?: Employee
  responsible_user?: UserProfile
}

export type Employee = {
  id: number // исправлено: integer в БД, не uuid
  first_name: string
  last_name: string
  middle_name?: string
  full_name?: string
  email?: string
  phone?: string
  position_id?: number
  department_id?: number
  is_active?: boolean
  created_at: string
  updated_at: string
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
  invoice?: Invoice
}

export type ContractStatus = {
  id: number
  code: string
  name: string
  color?: string
  description?: string
  sort_order?: number
  created_at: string
  updated_at: string
}

export type ContractProject = {
  id: string
  contract_id: string
  project_id: number
  created_at: string
  projects?: Project
}

export type Contract = {
  id: string
  contract_number: string
  contract_date: string
  payer_id?: number
  supplier_id?: number
  project_id?: number // deprecated - use contract_projects instead
  vat_rate?: number
  warranty_period_days?: number
  description?: string
  status_id?: number
  payment_terms?: string
  advance_percentage?: number
  created_at: string
  updated_at: string
  created_by?: string
  // Связанные объекты
  payer?: Contractor
  supplier?: Contractor
  project?: Project // deprecated - use contract_projects instead
  status?: ContractStatus
  contract_projects?: ContractProject[]
  contract_invoices?: any[]
  contract_attachments?: any[]
}

export type MaterialRequest = {
  id: string
  request_number: string
  request_date: string
  project_id?: number | null
  employee_id?: number | null
  total_items: number
  created_by?: string | null
  created_at: string
  updated_at: string
  // Relations
  project?: Project
  employee?: Employee
  items?: MaterialRequestItem[]
}

export type MaterialRequestItem = {
  id: string
  material_request_id: string
  material_name: string
  unit: string
  quantity: number
  nomenclature_id?: number | null
  sort_order: number
  created_at: string
  // Relations
  nomenclature?: {
    id: number
    name: string
    unit: string
    material_class?: {
      id: number
      name: string
    }
  }
}

// Letter Management System Types
export type LetterStatus = {
  id: number
  code: string
  name: string
  color?: string
  description?: string
  created_at: string
}

export type Letter = {
  id: string
  project_id?: number | null
  number: string
  status_id?: number | null
  letter_date: string
  subject?: string | null
  content?: string | null
  responsible_user_id?: string | null
  responsible_person_name?: string | null
  sender?: string | null
  sender_type?: 'individual' | 'contractor'
  sender_contractor_id?: number | null
  recipient?: string | null
  recipient_type?: 'individual' | 'contractor'
  recipient_contractor_id?: number | null
  direction: 'incoming' | 'outgoing'
  reg_number?: string | null
  reg_date?: string | null
  delivery_method?: string | null
  response_deadline?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Relations
  project?: Project
  status?: LetterStatus
  responsible_user?: UserProfile
  creator?: UserProfile
  parent_letters?: LetterLink[]
  child_letters?: LetterLink[]
  attachments?: LetterAttachment[]
  children?: Letter[] // Для expandable таблицы
  parent_id?: string // ID родительского письма (только для дочерних писем)
  sender_contractor?: Contractor // Связанный контрагент-отправитель
  recipient_contractor?: Contractor // Связанный контрагент-получатель
  letter_attachments?: { count: number }[] // Счётчик файлов
}

export type LetterAttachment = {
  id: string
  letter_id: string
  attachment_id: string
  created_at: string
  // Relations
  attachment?: {
    id: string
    original_name: string
    storage_path: string
    size_bytes: number
    mime_type?: string
    created_at: string
  }
}

export type LetterLink = {
  id: string
  parent_id: string
  child_id: string
  created_at: string
  // Relations
  parent_letter?: Letter
  child_letter?: Letter
}

export type LetterPublicShare = {
  id: string
  letter_id: string
  token: string
  created_at: string
  updated_at: string
  // Relations
  letters?: Letter
}

