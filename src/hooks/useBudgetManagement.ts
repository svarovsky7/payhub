/**
 * Hook for project budget management
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import type { ProjectBudgetWithProject, ProjectBudgetStats, BudgetFormData } from '../types/budget';
import * as budgetService from '../services/budgetOperations';

export function useBudgetManagement(userId: string) {
  const [budgets, setBudgets] = useState<ProjectBudgetWithProject[]>([]);
  const [budgetStats, setBudgetStats] = useState<ProjectBudgetStats[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Load all project budgets
   */
  const loadBudgets = useCallback(async () => {
    console.log('[useBudgetManagement.loadBudgets] Loading budgets');
    setLoading(true);
    try {
      const data = await budgetService.fetchProjectBudgets();
      setBudgets(data);
      console.log('[useBudgetManagement.loadBudgets] Budgets loaded:', data.length);
    } catch (error) {
      console.error('[useBudgetManagement.loadBudgets] Error:', error);
      message.error('Ошибка загрузки бюджетов');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load budget statistics for all projects
   */
  const loadBudgetStats = useCallback(async () => {
    console.log('[useBudgetManagement.loadBudgetStats] Loading budget stats');
    setLoading(true);
    try {
      const data = await budgetService.fetchAllProjectBudgetStats();
      setBudgetStats(data);
      console.log('[useBudgetManagement.loadBudgetStats] Stats loaded:', data.length);
    } catch (error) {
      console.error('[useBudgetManagement.loadBudgetStats] Error:', error);
      message.error('Ошибка загрузки статистики бюджетов');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load budget for a specific project
   */
  const loadProjectBudget = useCallback(async (projectId: number) => {
    console.log('[useBudgetManagement.loadProjectBudget] Loading budget for project:', projectId);
    try {
      const data = await budgetService.fetchProjectBudget(projectId);
      return data;
    } catch (error) {
      console.error('[useBudgetManagement.loadProjectBudget] Error:', error);
      message.error('Ошибка загрузки бюджета проекта');
      throw error;
    }
  }, []);

  /**
   * Load budget statistics for a specific project
   */
  const loadProjectBudgetStats = useCallback(async (projectId: number) => {
    console.log('[useBudgetManagement.loadProjectBudgetStats] Loading stats for project:', projectId);
    try {
      const data = await budgetService.fetchProjectBudgetStats(projectId);
      return data;
    } catch (error) {
      console.error('[useBudgetManagement.loadProjectBudgetStats] Error:', error);
      message.error('Ошибка загрузки статистики бюджета');
      throw error;
    }
  }, []);

  /**
   * Allocate or update budget for a project
   */
  const allocateBudget = useCallback(async (projectId: number, allocatedAmount: number) => {
    const budgetData: BudgetFormData = {
      project_id: projectId,
      allocated_amount: allocatedAmount,
    };
    console.log('[useBudgetManagement.allocateBudget] Allocating budget:', budgetData);

    try {
      const result = await budgetService.upsertProjectBudget(budgetData, userId);

      // Update local state optimistically
      setBudgets(prev => {
        const index = prev.findIndex(b => b.project_id === budgetData.project_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...result };
          return updated;
        } else {
          return [...prev, result as ProjectBudgetWithProject];
        }
      });

      message.success('Бюджет успешно выделен');
      console.log('[useBudgetManagement.allocateBudget] Budget allocated:', result);
      return result;
    } catch (error) {
      console.error('[useBudgetManagement.allocateBudget] Error:', error);
      message.error('Ошибка выделения бюджета');
      throw error;
    }
  }, [userId]);

  /**
   * Reset budget for a project to zero
   */
  const resetBudget = useCallback(async (projectId: number) => {
    console.log('[useBudgetManagement.resetBudget] Resetting budget for project:', projectId);

    // Optimistic update
    setBudgets(prev =>
      prev.map(b => (b.project_id === projectId ? { ...b, allocated_amount: 0 } : b))
    );

    try {
      await budgetService.resetProjectBudget(projectId);
      message.success('Бюджет обнулен');
      console.log('[useBudgetManagement.resetBudget] Budget reset');
    } catch (error) {
      console.error('[useBudgetManagement.resetBudget] Error:', error);
      message.error('Ошибка обнуления бюджета');
      // Revert optimistic update
      await loadBudgets();
      throw error;
    }
  }, [loadBudgets]);

  /**
   * Delete budget for a project
   */
  const deleteBudget = useCallback(async (projectId: number) => {
    console.log('[useBudgetManagement.deleteBudget] Deleting budget for project:', projectId);

    // Optimistic update
    setBudgets(prev => prev.filter(b => b.project_id !== projectId));

    try {
      await budgetService.deleteProjectBudget(projectId);
      message.success('Бюджет удален');
      console.log('[useBudgetManagement.deleteBudget] Budget deleted');
    } catch (error) {
      console.error('[useBudgetManagement.deleteBudget] Error:', error);
      message.error('Ошибка удаления бюджета');
      // Revert optimistic update
      await loadBudgets();
      throw error;
    }
  }, [loadBudgets]);

  return {
    budgets,
    budgetStats,
    loading,
    loadBudgets,
    loadBudgetStats,
    loadProjectBudget,
    loadProjectBudgetStats,
    allocateBudget,
    resetBudget,
    deleteBudget,
  };
}
