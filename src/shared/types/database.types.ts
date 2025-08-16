export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      invoices: {
        Row: {
          id: number
          invoice_number: string
          invoice_date: string | null
          contractor_id: number
          payer_id: number
          total_amount: number
          description: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          project_id: number | null
          delivery_date: string | null
          delivery_days: number | null
          without_vat: boolean | null
          expected_delivery_date: string | null
          is_important: boolean | null
          responsible_person_id: number | null
        }
        Insert: {
          id?: number
          invoice_number: string
          invoice_date?: string | null
          contractor_id: number
          payer_id: number
          total_amount: number
          description?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          project_id?: number | null
          delivery_date?: string | null
          delivery_days?: number | null
          without_vat?: boolean | null
          expected_delivery_date?: string | null
          is_important?: boolean | null
          responsible_person_id?: number | null
        }
        Update: {
          id?: number
          invoice_number?: string
          invoice_date?: string | null
          contractor_id?: number
          payer_id?: number
          total_amount?: number
          description?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          project_id?: number | null
          delivery_date?: string | null
          delivery_days?: number | null
          without_vat?: boolean | null
          expected_delivery_date?: string | null
          is_important?: boolean | null
          responsible_person_id?: number | null
        }
      }
      invoice_items: {
        Row: {
          id: number
          invoice_id: number
          item_name: string
          unit: string
          quantity: number
          unit_price: number
          total_price: number | null
          delivery_days: number | null
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: number
          invoice_id: number
          item_name: string
          unit?: string
          quantity?: number
          unit_price?: number
          total_price?: number | null
          delivery_days?: number | null
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          invoice_id?: number
          item_name?: string
          unit?: string
          quantity?: number
          unit_price?: number
          total_price?: number | null
          delivery_days?: number | null
          sort_order?: number | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          project_id: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          project_id?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          project_id?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: number
          name: string
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      contractors: {
        Row: {
          id: number
          name: string
          inn: string | null
          kpp: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          name: string
          inn?: string | null
          kpp?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          name?: string
          inn?: string | null
          kpp?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      payers: {
        Row: {
          id: number
          name: string
          inn: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          name: string
          inn?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          name?: string
          inn?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      attachments: {
        Row: {
          id: number
          original_name: string
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          created_at: string
          created_by: string | null
          document_type: string | null
        }
        Insert: {
          id?: number
          original_name: string
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
          created_by?: string | null
          document_type?: string | null
        }
        Update: {
          id?: number
          original_name?: string
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
          created_by?: string | null
          document_type?: string | null
        }
      }
      invoice_documents: {
        Row: {
          id: number
          invoice_id: number
          attachment_id: number
          created_at: string
          created_by: string | null
          attachment_type: string | null
        }
        Insert: {
          id?: number
          invoice_id: number
          attachment_id: number
          created_at?: string
          created_by?: string | null
          attachment_type?: string | null
        }
        Update: {
          id?: number
          invoice_id?: number
          attachment_id?: number
          created_at?: string
          created_by?: string | null
          attachment_type?: string | null
        }
      }
      invoice_requests: {
        Row: {
          id: number
          invoice_id: number
          request_number: string
          request_date: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          invoice_id: number
          request_number: string
          request_date?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          invoice_id?: number
          request_number?: string
          request_date?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      project_budgets: {
        Row: {
          id: number
          project_id: number
          allocated_amount: number
          spent_amount: number
          remaining_amount: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          project_id: number
          allocated_amount: number
          spent_amount?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          allocated_amount?: number
          spent_amount?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_history: {
        Row: {
          id: number
          project_budget_id: number
          action_type: string
          amount: number
          old_allocated: number | null
          new_allocated: number | null
          old_spent: number | null
          new_spent: number | null
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          project_budget_id: number
          action_type: string
          amount: number
          old_allocated?: number | null
          new_allocated?: number | null
          old_spent?: number | null
          new_spent?: number | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          project_budget_id?: number
          action_type?: string
          amount?: number
          old_allocated?: number | null
          new_allocated?: number | null
          old_spent?: number | null
          new_spent?: number | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      responsible_persons: {
        Row: {
          id: number
          full_name: string
          position: string | null
          phone: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id?: number
          full_name: string
          position?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          full_name?: string
          position?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
        }
      }
      units: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          code?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      approvals: {
        Row: {
          id: number
          invoice_id: number
          stage_id: number | null
          status: 'pending' | 'approved' | 'rejected'
          comment: string | null
          approved_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          invoice_id: number
          stage_id?: number | null
          status?: 'pending' | 'approved' | 'rejected'
          comment?: string | null
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          invoice_id?: number
          stage_id?: number | null
          status?: 'pending' | 'approved' | 'rejected'
          comment?: string | null
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      approval_stages: {
        Row: {
          id: number
          stage_code: string
          stage_name: string
          required_role: string
          stage_order: number
          created_at: string
        }
        Insert: {
          id?: number
          stage_code: string
          stage_name: string
          required_role: string
          stage_order: number
          created_at?: string
        }
        Update: {
          id?: number
          stage_code?: string
          stage_name?: string
          required_role?: string
          stage_order?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      approval_status: 'pending' | 'approved' | 'rejected'
      invoice_status: 'draft' | 'rukstroy_review' | 'director_review' | 'supply_review' | 'in_payment' | 'paid' | 'rejected'
      attachment_type: 'invoice_file' | 'supporting_document' | 'photo'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}