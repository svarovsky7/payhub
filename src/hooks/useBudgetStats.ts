import { useState, useEffect } from 'react'
import { fetchProjectBudgets } from '../services/budgetOperations'
import type { ProjectBudgetWithProject } from '../types/budget'
import type { PaymentApproval } from '../services/approvalOperations'
import { getCurrentStagePermissions } from '../utils/approvalCalculations'

export const useBudgetStats = (pendingApprovals: PaymentApproval[]) => {
  const [projectBudgets, setProjectBudgets] = useState<ProjectBudgetWithProject[]>([])

  // Load project budgets
  useEffect(() => {
    loadBudgets()
  }, [])

  const loadBudgets = async () => {
    try {
      const budgets = await fetchProjectBudgets()
      setProjectBudgets(budgets)
      console.log('[useBudgetStats.loadBudgets] Budgets loaded:', budgets.length)
    } catch (error) {
      console.error('[useBudgetStats.loadBudgets] Error:', error)
      // Don't show error to user - budgets are optional
    }
  }

  // Calculate budget statistics
  const calculateBudgetStats = () => {
    const totalBudget = projectBudgets.reduce((sum, b) => sum + Number(b.allocated_amount), 0)

    // Get unique project IDs from pending approvals
    const projectIds = new Set(
      pendingApprovals
        .map(a => a.payment?.invoice?.projects?.id)
        .filter(id => id !== null && id !== undefined)
    )

    // Calculate allocated budget for projects with pending payments
    const allocatedBudget = projectBudgets
      .filter(b => projectIds.has(b.project_id))
      .reduce((sum, b) => sum + Number(b.allocated_amount), 0)

    return { totalBudget, allocatedBudget }
  }

  // Check if any approval has permission to show budgets
  const canShowBudgets = pendingApprovals.some(approval => {
    const permissions = getCurrentStagePermissions(approval)
    return permissions?.can_show_budgets === true
  })

  const budgetStats = calculateBudgetStats()

  return {
    projectBudgets,
    budgetStats,
    canShowBudgets
  }
}
