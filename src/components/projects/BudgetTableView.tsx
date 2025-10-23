import React from 'react';
import { Table, Button, Space, Tag, Typography, Popconfirm } from 'antd';
import { FileTextOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProjectBudgetStats } from '../../types/budget';

interface BudgetTableViewProps {
  budgetStats: ProjectBudgetStats[];
  loading: boolean;
  onAllocate: (budget: ProjectBudgetStats) => void;
  onViewDetails: (budget: ProjectBudgetStats) => void;
  onReset: (projectId: number) => Promise<void>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(value);
};

export const BudgetTableView: React.FC<BudgetTableViewProps> = ({
  budgetStats,
  loading,
  onAllocate,
  onViewDetails,
  onReset,
}) => {
  const { Text } = Typography;
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
        const percent = record.allocated_amount > 0 ? Math.round((record.invoice_amount / record.allocated_amount) * 100) : 0;
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
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => onViewDetails(record)}>
            Детали
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onAllocate(record)}>
            Изменить
          </Button>
          <Popconfirm
            title="Обнулить бюджет?"
            description="Это установит выделенную сумму в 0"
            onConfirm={() => onReset(record.project_id)}
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

  return <Table columns={columns} dataSource={budgetStats} rowKey="project_id" loading={loading} pagination={{ pageSize: 20 }} scroll={{ x: 1200 }} />;
};
