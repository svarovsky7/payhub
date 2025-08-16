import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  InputNumber,
  Button,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  App,
  Divider,
  Tag,
  Modal,
  Timeline,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  WarningOutlined,
  HistoryOutlined,
  ProjectOutlined,
  WalletOutlined,
  FundOutlined,
  RiseOutlined,
  FallOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '@/entities';
import { useAuthStore } from '@/features/auth/model/auth-store';
import type { BudgetSummary, BudgetHistory } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const { Title, Text } = Typography;

interface BudgetAllocation {
  projectId: number;
  allocatedAmount: number;
  hasChanged: boolean;
}

export function BudgetingPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [allocations, setAllocations] = useState<Map<number, BudgetAllocation>>(new Map());
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedProjectHistory, setSelectedProjectHistory] = useState<{
    projectName: string;
    history: BudgetHistory[];
  } | null>(null);

  // Fetch budget summary
  const { data: budgetSummary = [], isLoading, error } = useQuery({
    queryKey: ['budget-summary'],
    queryFn: budgetApi.getBudgetSummary,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Initialize allocations when data loads
  useEffect(() => {
    if (budgetSummary.length > 0) {
      const initialAllocations = new Map<number, BudgetAllocation>();
      let total = 0;
      
      budgetSummary.forEach((project) => {
        initialAllocations.set(project.project_id, {
          projectId: project.project_id,
          allocatedAmount: project.allocated_amount,
          hasChanged: false,
        });
        total += project.allocated_amount;
      });
      
      setAllocations(initialAllocations);
      if (totalBudget === 0) {
        setTotalBudget(total);
      }
    }
  }, [budgetSummary, totalBudget]);

  // Update budgets mutation
  const updateBudgetsMutation = useMutation({
    mutationFn: async (budgets: Array<{ projectId: number; allocatedAmount: number }>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return budgetApi.updateMultipleBudgets(budgets, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      message.success('Бюджеты успешно обновлены');
      
      // Reset changed flags
      const updatedAllocations = new Map(allocations);
      updatedAllocations.forEach((allocation) => {
        allocation.hasChanged = false;
      });
      setAllocations(updatedAllocations);
    },
    onError: (error) => {
      console.error('Failed to update budgets:', error);
      message.error('Ошибка при обновлении бюджетов');
    },
  });

  // Load budget history
  const loadProjectHistory = async (projectId: number, projectName: string) => {
    try {
      const budget = await budgetApi.getProjectBudget(projectId);
      if (budget) {
        const history = await budgetApi.getBudgetHistory(budget.id);
        setSelectedProjectHistory({ projectName, history });
        setHistoryModalVisible(true);
      } else {
        message.info('История бюджета пока недоступна');
      }
    } catch (error) {
      console.error('Failed to load budget history:', error);
      message.error('Ошибка при загрузке истории');
    }
  };

  // Handle allocation change
  const handleAllocationChange = (projectId: number, value: number | null) => {
    const newAllocations = new Map(allocations);
    const allocation = newAllocations.get(projectId);
    
    if (allocation) {
      allocation.allocatedAmount = value || 0;
      allocation.hasChanged = true;
      setAllocations(newAllocations);
    }
  };

  // Save changes
  const handleSaveChanges = () => {
    const changedBudgets = Array.from(allocations.values())
      .filter(a => a.hasChanged)
      .map(a => ({
        projectId: a.projectId,
        allocatedAmount: a.allocatedAmount,
      }));

    if (changedBudgets.length === 0) {
      message.info('Нет изменений для сохранения');
      return;
    }

    updateBudgetsMutation.mutate(changedBudgets);
  };

  // Calculate totals
  const totalAllocated = Array.from(allocations.values()).reduce(
    (sum, a) => sum + a.allocatedAmount,
    0
  );
  const totalSpent = budgetSummary.reduce((sum, p) => sum + p.spent_amount, 0);
  const totalRemaining = budgetSummary.reduce((sum, p) => sum + p.remaining_amount, 0);
  const totalPending = budgetSummary.reduce((sum, p) => sum + (p.pending_amount || 0), 0);
  const unallocated = totalBudget - totalAllocated;

  // Distribute unallocated budget equally
  const handleDistributeEqually = () => {
    if (unallocated <= 0) {
      message.warning('Нет свободных средств для распределения');
      return;
    }

    const projectCount = allocations.size;
    if (projectCount === 0) return;

    const amountPerProject = Math.floor(unallocated / projectCount);
    const newAllocations = new Map(allocations);
    
    newAllocations.forEach((allocation) => {
      allocation.allocatedAmount += amountPerProject;
      allocation.hasChanged = true;
    });
    
    setAllocations(newAllocations);
    message.success('Средства распределены равномерно');
  };

  // Table columns
  const columns: ColumnsType<BudgetSummary> = [
    {
      title: 'Проект',
      dataIndex: 'project_name',
      key: 'project_name',
      fixed: 'left',
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 14 }}>
            <ProjectOutlined style={{ marginRight: 6, color: '#1890ff' }} />
            {name}
          </Text>
          {record.project_address && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.project_address}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Выделено',
      key: 'allocated',
      width: 180,
      render: (_, record) => {
        const allocation = allocations.get(record.project_id);
        return (
          <Space>
            <InputNumber
              value={allocation?.allocatedAmount || 0}
              onChange={(value) => handleAllocationChange(record.project_id, value)}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={(value) => value!.replace(/\s?/g, '')}
              min={0}
              style={{ width: 140 }}
              addonAfter="₽"
            />
            {allocation?.hasChanged && (
              <Badge status="processing" />
            )}
          </Space>
        );
      },
    },
    {
      title: 'Потрачено',
      dataIndex: 'spent_amount',
      key: 'spent_amount',
      width: 120,
      render: (amount) => (
        <Text style={{ color: '#ff4d4f' }}>
          {new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
          }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Остаток',
      dataIndex: 'remaining_amount',
      key: 'remaining_amount',
      width: 120,
      render: (amount) => (
        <Text strong style={{ color: amount > 0 ? '#52c41a' : '#ff4d4f' }}>
          {new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
          }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Освоение',
      key: 'utilization',
      width: 150,
      render: (_, record) => {
        const allocation = allocations.get(record.project_id);
        const allocated = allocation?.allocatedAmount || 0;
        const percent = allocated > 0 ? (record.spent_amount / allocated) * 100 : 0;
        
        return (
          <Progress
            percent={Math.round(percent)}
            size="small"
            status={percent > 90 ? 'exception' : percent > 70 ? 'normal' : 'success'}
            format={(p) => `${p}%`}
          />
        );
      },
    },
    {
      title: 'Ожидает',
      key: 'pending',
      width: 140,
      render: (_, record) => {
        if (record.pending_approvals === 0) {
          return <Text type="secondary">—</Text>;
        }
        
        return (
          <Tooltip title={`${record.pending_approvals} счетов на согласовании`}>
            <Space>
              <Badge count={record.pending_approvals} style={{ backgroundColor: '#faad14' }}>
                <Tag color="warning">
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                  }).format(record.pending_amount || 0)}
                </Tag>
              </Badge>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          icon={<HistoryOutlined />}
          onClick={() => loadProjectHistory(record.project_id, record.project_name)}
        >
          История
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        message="Ошибка загрузки"
        description="Не удалось загрузить данные бюджетов"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <WalletOutlined style={{ marginRight: 12 }} />
            Бюджетирование
          </Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['budget-summary'] })}
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveChanges}
              loading={updateBudgetsMutation.isPending}
              disabled={!Array.from(allocations.values()).some(a => a.hasChanged)}
            >
              Сохранить изменения
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Total Budget Input */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Общий бюджет</Text>
              <InputNumber
                value={totalBudget}
                onChange={(value) => setTotalBudget(value || 0)}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => value!.replace(/\s?/g, '')}
                min={0}
                style={{ width: '100%' }}
                size="large"
                addonAfter="₽"
                prefix={<BankOutlined />}
              />
            </Space>
          </Col>
          <Col span={16}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Распределено"
                  value={totalAllocated}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<FundOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Нераспределено"
                  value={unallocated}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: unallocated > 0 ? '#52c41a' : '#ff4d4f' }}
                  prefix={unallocated > 0 ? <RiseOutlined /> : <FallOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Потрачено"
                  value={totalSpent}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Остаток"
                  value={totalRemaining}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
        
        {unallocated > 0 && (
          <>
            <Divider />
            <Alert
              message="Есть нераспределенные средства"
              description={`У вас есть ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(unallocated)} нераспределенных средств`}
              type="info"
              showIcon
              action={
                <Button size="small" onClick={handleDistributeEqually}>
                  Распределить поровну
                </Button>
              }
            />
          </>
        )}
        
        {unallocated < 0 && (
          <>
            <Divider />
            <Alert
              message="Превышен бюджет"
              description={`Распределено на ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(Math.abs(unallocated))} больше, чем доступно`}
              type="error"
              showIcon
              icon={<WarningOutlined />}
            />
          </>
        )}
      </Card>

      {/* Projects Table */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>
            <ProjectOutlined style={{ marginRight: 8 }} />
            Распределение по проектам
          </Title>
          {totalPending > 0 && (
            <Alert
              message={`На согласовании счета на сумму ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(totalPending)}`}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
        
        <Table
          columns={columns}
          dataSource={budgetSummary}
          rowKey="project_id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          tableLayout="auto"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Итого</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(totalAllocated)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(totalSpent)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <Text strong style={{ color: '#52c41a' }}>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(totalRemaining)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <Progress
                    percent={Math.round((totalSpent / totalAllocated) * 100)}
                    size="small"
                    status={totalSpent > totalAllocated * 0.9 ? 'exception' : 'normal'}
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  {totalPending > 0 && (
                    <Tag color="warning">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(totalPending)}
                    </Tag>
                  )}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* Budget History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            История бюджета: {selectedProjectHistory?.projectName}
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedProjectHistory(null);
        }}
        footer={null}
        width={700}
      >
        {selectedProjectHistory?.history && selectedProjectHistory.history.length > 0 ? (
          <Timeline
            items={selectedProjectHistory.history.map((item) => ({
              color: item.action_type === 'allocation' ? 'green' : 
                     item.action_type === 'spent' ? 'red' : 'blue',
              children: (
                <div>
                  <Text strong>
                    {item.action_type === 'allocation' && 'Выделение бюджета'}
                    {item.action_type === 'adjustment' && 'Корректировка бюджета'}
                    {item.action_type === 'spent' && 'Расход средств'}
                  </Text>
                  <br />
                  <Text>
                    Сумма: {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(Math.abs(item.amount))}
                  </Text>
                  {item.description && (
                    <>
                      <br />
                      <Text type="secondary">{item.description}</Text>
                    </>
                  )}
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(item.created_at).format('DD MMMM YYYY, HH:mm')}
                  </Text>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="История изменений пока пуста" />
        )}
      </Modal>
    </div>
  );
}