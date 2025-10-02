// Generic status interface
export interface Status {
  id: number
  name: string
  code?: string
  description?: string
  color?: string
  sort_order?: number | null
  is_active?: boolean
  created_at: string
  updated_at?: string
}

export interface InvoiceStatus extends Status {}

export interface PaymentStatus extends Status {}

export interface ContractStatus extends Status {}
