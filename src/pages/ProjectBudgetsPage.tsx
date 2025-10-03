/**
 * Project Budgets Page
 * Displays project budgets with ability to allocate, adjust, and reset budgets
 * Shows invoices and payments related to each project
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Modal,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DollarOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../contexts/AuthContext';
import { useBudgetManagement } from '../hooks/useBudgetManagement';
import { AllocateBudgetModal } from '../components/projects/AllocateBudgetModal';
import type { ProjectBudgetStats, ProjectBudgetWithProject } from '../types/budget';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Project {
  id: number;
  code?: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_with_vat: number;
  status_id: number;
  invoice_statuses?: { name: string; color?: string };
}

interface Payment {
  id: string;
  payment_number: number;
  payment_date: string;
  amount: number;
  status_id: number;
  payment_statuses?: { name: string; color?: string };
}

export const ProjectBudgetsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    budgetStats,
    loading,
    loadBudgetStats,
    allocateBudget,
    resetBudget,
    // deleteBudget, // Reserved for future use
  } = useBudgetManagement(user?.id || '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<ProjectBudgetWithProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProjectStats, setSelectedProjectStats] = useState<ProjectBudgetStats | null>(null);
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([]);
  const [projectPayments, setProjectPayments] = useState<Payment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadProjects(), loadBudgetStats()]);
  };

  const loadProjects = async () => {
    console.log('[ProjectBudgetsPage.loadProjects] Loading projects');
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name, description, is_active')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('[ProjectBudgetsPage.loadProjects] Error:', error);
    }
  };

  const handleAllocate = (budget?: ProjectBudgetStats) => {
    if (budget) {
      // Edit existing budget
      setSelectedBudget({
        id: 0,
        project_id: budget.project_id,
        allocated_amount: budget.allocated_amount,
        description: '',
      } as ProjectBudgetWithProject);
      setSelectedProjectId(undefined);
    } else {
      // New budget
      setSelectedBudget(null);
      setSelectedProjectId(undefined);
    }
    setAllocateModalOpen(true);
  };

  const handleAllocateSubmit = async (data: any) => {
    await allocateBudget(data);
    setAllocateModalOpen(false);
    await loadBudgetStats();
  };

  const handleReset = async (projectId: number) => {
    await resetBudget(projectId);
    await loadBudgetStats();
  };

  // Reserved for future use
  // const handleDelete = async (projectId: number) => {
  //   await deleteBudget(projectId);
  //   await loadBudgetStats();
  // };

  const showProjectDetails = useCallback(async (stats: ProjectBudgetStats) => {
    console.log('[ProjectBudgetsPage.showProjectDetails] Loading details for project:', stats.project_id);
    setSelectedProjectStats(stats);
    setDetailsModalOpen(true);
    setDetailsLoading(true);

    try {
      // Load invoices for this project
      const { data: invoicesData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          amount_with_vat,
          status_id,
          invoice_statuses (name, color)
        `)
        .eq('project_id', stats.project_id)
        .order('invoice_date', { ascending: false });

      if (invoiceError) throw invoiceError;

      // Map the data to match Invoice interface
      const invoices: Invoice[] = (invoicesData || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        amount_with_vat: inv.amount_with_vat,
        status_id: inv.status_id,
        invoice_statuses: Array.isArray(inv.invoice_statuses) ? inv.invoice_statuses[0] : inv.invoice_statuses,
      }));

      setProjectInvoices(invoices);

      // Load payments for invoices of this project
      const { data: paymentsData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          payment_date,
          amount,
          status_id,
          payment_statuses (name, color),
          invoices!inner (project_id)
        `)
        .eq('invoices.project_id', stats.project_id)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;

      // Map the data to match Payment interface
      const payments: Payment[] = (paymentsData || []).map((pay: any) => ({
        id: pay.id,
        payment_number: pay.payment_number,
        payment_date: pay.payment_date,
        amount: pay.amount,
        status_id: pay.status_id,
        payment_statuses: Array.isArray(pay.payment_statuses) ? pay.payment_statuses[0] : pay.payment_statuses,
      }));

      setProjectPayments(payments);
    } catch (error) {
      console.error('[ProjectBudgetsPage.showProjectDetails] Error:', error);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(value);
  };

  const columns: ColumnsType<ProjectBudgetStats> = [
    {
      title: 'Проект',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 250,
    },
    {
      title: 'Выделено',
      dataIndex: 'allocated_amount',
      key: 'allocated_amount',
      width: 150,
      align: 'right',
      render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
    },
    {
      title: 'Счета',
      dataIndex: 'invoice_amount',
      key: 'invoice_amount',
      width: 150,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Платежи',
      dataIndex: 'payment_amount',
      key: 'payment_amount',
      width: 150,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Остаток',
      dataIndex: 'remaining_amount',
      key: 'remaining_amount',
      width: 150,
      align: 'right',
      render: (value: number) => {
        const color = value >= 0 ? 'green' : 'red';
        return <Text style={{ color }}>{formatCurrency(value)}</Text>;
      },
    },
    {
      title: 'Использовано',
      key: 'usage_percent',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const percent = record.allocated_amount > 0
          ? Math.round((record.invoice_amount / record.allocated_amount) * 100)
          : 0;
        const color = percent > 100 ? 'red' : percent > 80 ? 'orange' : 'blue';
        return <Tag color={color}>{percent}%</Tag>;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => showProjectDetails(record)}
          >
            Детали
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleAllocate(record)}
          >
            Изменить
          </Button>
          <Popconfirm
            title="Обнулить бюджет?"
            description="Это установит выделенную сумму в 0"
            onConfirm={() => handleReset(record.project_id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" size="small" danger icon={<ReloadOutlined />}>
              Обнулить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const invoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Номер',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount_with_vat',
      key: 'amount_with_vat',
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Статус',
      dataIndex: 'invoice_statuses',
      key: 'status',
      render: (status: any) => (
        <Tag color={status?.color}>{status?.name}</Tag>
      ),
    },
  ];

  const paymentColumns: ColumnsType<Payment> = [
    {
      title: 'Номер',
      dataIndex: 'payment_number',
      key: 'payment_number',
    },
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Статус',
      dataIndex: 'payment_statuses',
      key: 'status',
      render: (status: any) => (
        <Tag color={status?.color}>{status?.name}</Tag>
      ),
    },
  ];

  // Calculate summary statistics
  const totalAllocated = budgetStats.reduce((sum, b) => sum + b.allocated_amount, 0);
  const totalInvoices = budgetStats.reduce((sum, b) => sum + b.invoice_amount, 0);
  const totalPayments = budgetStats.reduce((sum, b) => sum + b.payment_amount, 0);
  const totalRemaining = budgetStats.reduce((sum, b) => sum + b.remaining_amount, 0);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3}>Бюджеты проектов</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAllocate()}
            >
              Выделить бюджет
            </Button>
          </div>

          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Всего выделено"
                  value={totalAllocated}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="₽"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Счета"
                  value={totalInvoices}
                  precision={2}
                  prefix={<FileTextOutlined />}
                  suffix="₽"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Платежи"
                  value={totalPayments}
                  precision={2}
                  suffix="₽"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Остаток"
                  value={totalRemaining}
                  precision={2}
                  suffix="₽"
                  valueStyle={{ color: totalRemaining >= 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={budgetStats}
            rowKey="project_id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1200 }}
          />
        </Space>
      </Card>

      <AllocateBudgetModal
        open={allocateModalOpen}
        onClose={() => {
          setAllocateModalOpen(false);
          setSelectedBudget(null);
          setSelectedProjectId(undefined);
        }}
        onSubmit={handleAllocateSubmit}
        projects={projects}
        existingBudget={selectedBudget}
        selectedProjectId={selectedProjectId}
      />

      <Modal
        title={`Детали бюджета: ${selectedProjectStats?.project_name}`}
        open={detailsModalOpen}
        onCancel={() => setDetailsModalOpen(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailsModalOpen(false)}>
            Закрыть
          </Button>,
        ]}
      >
        {selectedProjectStats && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Выделено">
                <Text strong>{formatCurrency(selectedProjectStats.allocated_amount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Остаток">
                <Text strong style={{ color: selectedProjectStats.remaining_amount >= 0 ? 'green' : 'red' }}>
                  {formatCurrency(selectedProjectStats.remaining_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Счета">
                {formatCurrency(selectedProjectStats.invoice_amount)}
              </Descriptions.Item>
              <Descriptions.Item label="Платежи">
                {formatCurrency(selectedProjectStats.payment_amount)}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>Счета по проекту</Title>
              <Table
                columns={invoiceColumns}
                dataSource={projectInvoices}
                rowKey="id"
                loading={detailsLoading}
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </div>

            <div>
              <Title level={5}>Платежи по проекту</Title>
              <Table
                columns={paymentColumns}
                dataSource={projectPayments}
                rowKey="id"
                loading={detailsLoading}
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};
