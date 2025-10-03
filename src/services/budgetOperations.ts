/**
 * Service for project budget operations
 */

import { supabase } from '../lib/supabase';
import type { ProjectBudget, ProjectBudgetWithProject, ProjectBudgetStats, BudgetFormData } from '../types/budget';

/**
 * Fetch all project budgets with project details
 */
export async function fetchProjectBudgets(): Promise<ProjectBudgetWithProject[]> {
  console.log('[budgetOperations.fetchProjectBudgets] Fetching all project budgets');

  const { data, error } = await supabase
    .from('project_budgets')
    .select(`
      *,
      projects (
        id,
        code,
        name,
        description,
        is_active
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[budgetOperations.fetchProjectBudgets] Error:', error);
    throw error;
  }

  console.log('[budgetOperations.fetchProjectBudgets] Fetched budgets:', data?.length);
  return data || [];
}

/**
 * Fetch budget for a specific project
 */
export async function fetchProjectBudget(projectId: number): Promise<ProjectBudgetWithProject | null> {
  console.log('[budgetOperations.fetchProjectBudget] Fetching budget for project:', projectId);

  const { data, error } = await supabase
    .from('project_budgets')
    .select(`
      *,
      projects (
        id,
        code,
        name,
        description,
        is_active
      )
    `)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No budget found - this is OK
      console.log('[budgetOperations.fetchProjectBudget] No budget found for project:', projectId);
      return null;
    }
    console.error('[budgetOperations.fetchProjectBudget] Error:', error);
    throw error;
  }

  console.log('[budgetOperations.fetchProjectBudget] Fetched budget:', data);
  return data;
}

/**
 * Create or update project budget
 */
export async function upsertProjectBudget(
  budgetData: BudgetFormData,
  userId: string
): Promise<ProjectBudget> {
  console.log('[budgetOperations.upsertProjectBudget] Upserting budget:', budgetData);

  // Check if budget already exists
  const existing = await fetchProjectBudget(budgetData.project_id);

  if (existing) {
    // Update existing budget
    const { data, error } = await supabase
      .from('project_budgets')
      .update({
        allocated_amount: budgetData.allocated_amount,
        description: budgetData.description,
      })
      .eq('project_id', budgetData.project_id)
      .select()
      .single();

    if (error) {
      console.error('[budgetOperations.upsertProjectBudget] Update error:', error);
      throw error;
    }

    console.log('[budgetOperations.upsertProjectBudget] Budget updated:', data);
    return data;
  } else {
    // Create new budget
    const { data, error } = await supabase
      .from('project_budgets')
      .insert({
        project_id: budgetData.project_id,
        allocated_amount: budgetData.allocated_amount,
        description: budgetData.description,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[budgetOperations.upsertProjectBudget] Insert error:', error);
      throw error;
    }

    console.log('[budgetOperations.upsertProjectBudget] Budget created:', data);
    return data;
  }
}

/**
 * Reset project budget to zero
 */
export async function resetProjectBudget(projectId: number): Promise<void> {
  console.log('[budgetOperations.resetProjectBudget] Resetting budget for project:', projectId);

  const { error } = await supabase
    .from('project_budgets')
    .update({
      allocated_amount: 0,
    })
    .eq('project_id', projectId);

  if (error) {
    console.error('[budgetOperations.resetProjectBudget] Error:', error);
    throw error;
  }

  console.log('[budgetOperations.resetProjectBudget] Budget reset successfully');
}

/**
 * Delete project budget
 */
export async function deleteProjectBudget(projectId: number): Promise<void> {
  console.log('[budgetOperations.deleteProjectBudget] Deleting budget for project:', projectId);

  const { error } = await supabase
    .from('project_budgets')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('[budgetOperations.deleteProjectBudget] Error:', error);
    throw error;
  }

  console.log('[budgetOperations.deleteProjectBudget] Budget deleted successfully');
}

/**
 * Fetch budget statistics with invoice and payment amounts
 */
export async function fetchProjectBudgetStats(projectId: number): Promise<ProjectBudgetStats | null> {
  console.log('[budgetOperations.fetchProjectBudgetStats] Fetching stats for project:', projectId);

  // Fetch budget
  const budget = await fetchProjectBudget(projectId);
  if (!budget) {
    return null;
  }

  // Fetch total invoice amount for this project
  const { data: invoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('amount_with_vat')
    .eq('project_id', projectId)
    .not('status_id', 'eq', 5); // Exclude cancelled invoices (status_id = 5)

  if (invoiceError) {
    console.error('[budgetOperations.fetchProjectBudgetStats] Invoice error:', invoiceError);
    throw invoiceError;
  }

  const invoiceAmount = invoices?.reduce((sum, inv) => sum + (Number(inv.amount_with_vat) || 0), 0) || 0;

  // Fetch total payment amount for invoices of this project
  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('amount, invoices!inner(project_id)')
    .eq('invoices.project_id', projectId)
    .not('status_id', 'eq', 4); // Exclude cancelled payments (status_id = 4)

  if (paymentError) {
    console.error('[budgetOperations.fetchProjectBudgetStats] Payment error:', paymentError);
    throw paymentError;
  }

  const paymentAmount = payments?.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0) || 0;

  const stats: ProjectBudgetStats = {
    project_id: projectId,
    project_name: budget.projects?.name || '',
    allocated_amount: Number(budget.allocated_amount),
    invoice_amount: invoiceAmount,
    payment_amount: paymentAmount,
    remaining_amount: Number(budget.allocated_amount) - invoiceAmount,
  };

  console.log('[budgetOperations.fetchProjectBudgetStats] Stats:', stats);
  return stats;
}

/**
 * Fetch all projects with their budget stats
 */
export async function fetchAllProjectBudgetStats(): Promise<ProjectBudgetStats[]> {
  console.log('[budgetOperations.fetchAllProjectBudgetStats] Fetching all project budget stats');

  const budgets = await fetchProjectBudgets();
  const stats: ProjectBudgetStats[] = [];

  for (const budget of budgets) {
    const projectStats = await fetchProjectBudgetStats(budget.project_id);
    if (projectStats) {
      stats.push(projectStats);
    }
  }

  console.log('[budgetOperations.fetchAllProjectBudgetStats] Fetched stats:', stats.length);
  return stats;
}
