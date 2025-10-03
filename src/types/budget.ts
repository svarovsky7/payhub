/**
 * Budget-related type definitions
 */

export interface ProjectBudget {
  id: number;
  project_id: number;
  allocated_amount: number;
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectBudgetWithProject extends ProjectBudget {
  projects?: {
    id: number;
    code?: string;
    name: string;
    description?: string;
    is_active?: boolean;
  };
}

export interface ProjectBudgetStats {
  project_id: number;
  project_name: string;
  allocated_amount: number;
  invoice_amount: number;
  payment_amount: number;
  remaining_amount: number;
}

export interface BudgetFormData {
  project_id: number;
  allocated_amount: number;
  description?: string;
}
