/**
 * Project Budgets Page - Refactored
 * Displays project budgets with ability to allocate, adjust, and reset budgets
 */

import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useBudgetManagement } from '../hooks/useBudgetManagement';
import { loadProjects } from '../services/contractOperations';
import { AllocateBudgetModal } from '../components/projects/AllocateBudgetModal';
import { BudgetTableView } from '../components/projects/BudgetTableView';
import { BudgetDetailsModal } from '../components/projects/BudgetDetailsModal';
import { BudgetStatsCards } from '../components/projects/BudgetStatsCards';

const { Title } = Typography;

export const ProjectBudgetsPage: React.FC = () => {
  const { user } = useAuth();
  const { budgetStats, loading, loadBudgetStats, allocateBudget, resetBudget } = useBudgetManagement(user?.id || '');

  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: number; code?: string; name: string; is_active?: boolean }>>([]);

  useEffect(() => {
    loadBudgetStats();
  }, [loadBudgetStats]);

  useEffect(() => {
    const loadProjectsList = async () => {
      const data = await loadProjects();
      setProjects(data as any);
    };
    loadProjectsList();
  }, []);

  const handleAllocate = async (values: any) => {
    if (selectedProjectId) {
      await allocateBudget(selectedProjectId, values.allocated_amount);
      setAllocateModalOpen(false);
      setSelectedProjectId(undefined);
      await loadBudgetStats();
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Бюджеты проектов
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadBudgetStats}>
            Обновить
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAllocateModalOpen(true)}>
            Выделить бюджет
          </Button>
        </Space>
      </div>

      <BudgetStatsCards stats={budgetStats} />

      <Card style={{ marginTop: 24 }}>
        <BudgetTableView
          budgetStats={budgetStats}
          loading={loading}
          onAllocate={(budget) => {
            setSelectedProjectId(budget.project_id);
            setAllocateModalOpen(true);
          }}
          onViewDetails={(budget) => {
            setSelectedProjectId(budget.project_id);
            setDetailsModalOpen(true);
          }}
          onReset={resetBudget}
        />
      </Card>

      <AllocateBudgetModal
        open={allocateModalOpen}
        onClose={() => {
          setAllocateModalOpen(false);
          setSelectedProjectId(undefined);
        }}
        onSubmit={handleAllocate}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />

      <BudgetDetailsModal
        open={detailsModalOpen}
        projectId={selectedProjectId}
        onCancel={() => {
          setDetailsModalOpen(false);
          setSelectedProjectId(undefined);
        }}
      />
    </div>
  );
};
