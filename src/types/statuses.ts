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

export type InvoiceStatus = Status

export type PaymentStatus = Status

export type ContractStatus = Status
