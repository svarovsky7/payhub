import { supabase } from '@/shared/api/supabase';
import type { ProjectBudget, BudgetHistory, BudgetSummary } from '@/shared/types';

export const budgetApi = {
  /**
   * Get budget summary for all projects
   */
  async getBudgetSummary(): Promise<BudgetSummary[]> {
    const { data, error } = await supabase
      .from('budget_summary')
      .select('*')
      .order('project_name');

    if (error) {
      console.error('Failed to fetch budget summary:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get budget for a specific project
   */
  async getProjectBudget(projectId: number): Promise<ProjectBudget | null> {
    const { data, error } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Failed to fetch project budget:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create or update project budget
   */
  async upsertProjectBudget(
    projectId: number, 
    allocatedAmount: number,
    userId: string
  ): Promise<ProjectBudget> {
    // First check if budget exists
    const existingBudget = await this.getProjectBudget(projectId);
    
    if (existingBudget) {
      // Update existing budget
      const oldAllocated = existingBudget.allocated_amount;
      
      const { data, error } = await supabase
        .from('project_budgets')
        .update({
          allocated_amount: allocatedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update project budget:', error);
        throw error;
      }

      // Add history record
      await this.addBudgetHistory({
        project_budget_id: data.id,
        action_type: 'adjustment',
        amount: allocatedAmount - oldAllocated,
        old_allocated: oldAllocated,
        new_allocated: allocatedAmount,
        description: `Budget adjusted from ${oldAllocated} to ${allocatedAmount}`,
        created_by: userId,
      });

      return data;
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from('project_budgets')
        .insert({
          project_id: projectId,
          allocated_amount: allocatedAmount,
          spent_amount: 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create project budget:', error);
        throw error;
      }

      // Add history record
      await this.addBudgetHistory({
        project_budget_id: data.id,
        action_type: 'allocation',
        amount: allocatedAmount,
        new_allocated: allocatedAmount,
        description: `Initial budget allocation of ${allocatedAmount}`,
        created_by: userId,
      });

      return data;
    }
  },

  /**
   * Update multiple project budgets at once
   */
  async updateMultipleBudgets(
    budgets: Array<{ projectId: number; allocatedAmount: number }>,
    userId: string
  ): Promise<void> {
    for (const budget of budgets) {
      await this.upsertProjectBudget(budget.projectId, budget.allocatedAmount, userId);
    }
  },

  /**
   * Get budget history for a project
   */
  async getBudgetHistory(projectBudgetId: number): Promise<BudgetHistory[]> {
    const { data, error } = await supabase
      .from('budget_history')
      .select('*')
      .eq('project_budget_id', projectBudgetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch budget history:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Add budget history record
   */
  async addBudgetHistory(history: Omit<BudgetHistory, 'id' | 'created_at'>): Promise<BudgetHistory> {
    const { data, error } = await supabase
      .from('budget_history')
      .insert(history)
      .select()
      .single();

    if (error) {
      console.error('Failed to add budget history:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get total allocated budget
   */
  async getTotalAllocatedBudget(): Promise<number> {
    const { data, error } = await supabase
      .from('project_budgets')
      .select('allocated_amount');

    if (error) {
      console.error('Failed to fetch total allocated budget:', error);
      throw error;
    }

    return (data || []).reduce((sum, budget) => sum + budget.allocated_amount, 0);
  },

  /**
   * Get total spent amount across all projects
   */
  async getTotalSpentAmount(): Promise<number> {
    const { data, error } = await supabase
      .from('project_budgets')
      .select('spent_amount');

    if (error) {
      console.error('Failed to fetch total spent amount:', error);
      throw error;
    }

    return (data || []).reduce((sum, budget) => sum + budget.spent_amount, 0);
  },
};