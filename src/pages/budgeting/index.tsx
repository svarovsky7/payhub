import { useState, useEffect } from 'react';
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
  Popconfirm,
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
  BankOutlined,
  ClearOutlined,
  DeleteOutlined,
  UserOutlined,
  DownOutlined,
  RightOutlined,
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
  const [additionalBudget, setAdditionalBudget] = useState<number>(0);
  const [newAllocations, setNewAllocations] = useState<Map<number, number>>(new Map());
  const [allocations, setAllocations] = useState<Map<number, BudgetAllocation>>(new Map());
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedProjectHistory, setSelectedProjectHistory] = useState<{
    projectName: string;
    projectBudgetId: number;
    history: BudgetHistory[];
  } | null>(null);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState<Set<number>>(new Set());

  // Fetch budget summary
  const { data: budgetSummary = [], isLoading, error } = useQuery({
    queryKey: ['budget-summary'],
    queryFn: budgetApi.getBudgetSummary,
    refetchInterval: false, // Disable automatic refetch
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes
  });

  // Initialize allocations when data loads
  useEffect(() => {
    if (budgetSummary.length > 0) {
      const initialAllocations = new Map<number, BudgetAllocation>();
      const initialNewAllocations = new Map<number, number>();
      let total = 0;
      
      budgetSummary.forEach((project) => {
        initialAllocations.set(project.project_id, {
          projectId: project.project_id,
          allocatedAmount: project.allocated_amount,
          hasChanged: false,
        });
        // Initialize new allocations with 0
        initialNewAllocations.set(project.project_id, 0);
        total += project.allocated_amount;
      });
      
      setAllocations(initialAllocations);
      setNewAllocations(initialNewAllocations);
      setTotalBudget(total);
    }
  }, [budgetSummary]);

  // Update budgets mutation
  const updateBudgetsMutation = useMutation({
    mutationFn: async (budgets: Array<{ projectId: number; allocatedAmount: number }>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return budgetApi.updateMultipleBudgets(budgets, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      message.success('Бюджеты успешно обновлены');
      
      // Update total budget with new allocations
      setTotalBudget(prev => prev + additionalBudget);
      
      // Reset additional budget and new allocations
      setAdditionalBudget(0);
      const resetNewAllocations = new Map<number, number>();
      budgetSummary.forEach((project) => {
        resetNewAllocations.set(project.project_id, 0);
      });
      setNewAllocations(resetNewAllocations);
    },
    onError: (error) => {
      console.error('Failed to update budgets:', error);
      message.error('Ошибка при обновлении бюджетов');
    },
  });

  // Reset all budgets mutation
  const resetBudgetsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return budgetApi.resetAllBudgets(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      message.success('Все бюджеты обнулены');
      
      // Reset all local state
      setTotalBudget(0);
      setAdditionalBudget(0);
      const resetAllocations = new Map<number, BudgetAllocation>();
      const resetNewAllocations = new Map<number, number>();
      budgetSummary.forEach((project) => {
        resetAllocations.set(project.project_id, {
          projectId: project.project_id,
          allocatedAmount: 0,
          hasChanged: false,
        });
        resetNewAllocations.set(project.project_id, 0);
      });
      setAllocations(resetAllocations);
      setNewAllocations(resetNewAllocations);
    },
    onError: (error) => {
      console.error('Failed to reset budgets:', error);
      message.error('Ошибка при обнулении бюджетов');
    },
  });

  // Clear budget history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async (projectBudgetId: number) => {
      return budgetApi.clearBudgetHistory(projectBudgetId);
    },
    onSuccess: () => {
      // Set empty history after clearing
      if (selectedProjectHistory) {
        setSelectedProjectHistory({
          ...selectedProjectHistory,
          history: []
        });
      }
      message.success('История бюджета полностью очищена');
    },
    onError: (error) => {
      console.error('Failed to clear budget history:', error);
      message.error('Ошибка при очистке истории');
    },
  });

  // Load budget history
  const loadProjectHistory = async (projectId: number, projectName: string) => {
    try {
      const budget = await budgetApi.getProjectBudget(projectId);
      if (budget) {
        const history = await budgetApi.getBudgetHistory(budget.id);
        openHistoryModal(projectName, budget.id, history);
      } else {
        message.info('История бюджета пока недоступна');
      }
    } catch (error) {
      console.error('Failed to load budget history:', error);
      message.error('Ошибка при загрузке истории');
    }
  };

  // Handle new allocation change
  const handleNewAllocationChange = (projectId: number, value: number | null) => {
    const updatedNewAllocations = new Map(newAllocations);
    updatedNewAllocations.set(projectId, value || 0);
    setNewAllocations(updatedNewAllocations);
  };

  // Save changes - add new allocations to existing ones
  const handleSaveChanges = () => {
    const changedBudgets: Array<{ projectId: number; allocatedAmount: number }> = [];
    
    // Check if there are any new allocations to save
    let hasChanges = false;
    newAllocations.forEach((newAmount, projectId) => {
      if (newAmount > 0) {
        hasChanges = true;
        const currentAllocation = allocations.get(projectId);
        if (currentAllocation) {
          // Add new amount to existing allocation
          changedBudgets.push({
            projectId: projectId,
            allocatedAmount: currentAllocation.allocatedAmount + newAmount,
          });
        }
      }
    });

    if (!hasChanges) {
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
  const totalNewAllocations = Array.from(newAllocations.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const totalSpent = budgetSummary.reduce((sum, p) => sum + p.spent_amount, 0);
  const totalRemaining = budgetSummary.reduce((sum, p) => sum + p.remaining_amount, 0);
  const totalPending = budgetSummary.reduce((sum, p) => sum + (p.pending_amount || 0), 0);
  const unallocatedNew = additionalBudget - totalNewAllocations;

  // Distribute unallocated new budget equally
  const handleDistributeEqually = () => {
    if (unallocatedNew <= 0) {
      message.warning('Нет новых средств для распределения');
      return;
    }

    const projectCount = newAllocations.size;
    if (projectCount === 0) return;

    const amountPerProject = Math.floor(unallocatedNew / projectCount);
    const updatedNewAllocations = new Map(newAllocations);
    
    updatedNewAllocations.forEach((_, projectId) => {
      const currentNewAmount = updatedNewAllocations.get(projectId) || 0;
      updatedNewAllocations.set(projectId, currentNewAmount + amountPerProject);
    });
    
    setNewAllocations(updatedNewAllocations);
    message.success('Новые средства распределены равномерно');
  };

  // Handle budget reset
  const handleResetBudgets = () => {
    resetBudgetsMutation.mutate();
  };

  // Handle clear history
  const handleClearHistory = () => {
    if (selectedProjectHistory) {
      clearHistoryMutation.mutate(selectedProjectHistory.projectBudgetId);
    }
  };

  // Toggle history item expansion
  const toggleHistoryItemExpansion = (itemId: number) => {
    const newExpanded = new Set(expandedHistoryItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedHistoryItems(newExpanded);
  };

  // Reset expanded items when opening new history
  const openHistoryModal = (projectName: string, projectBudgetId: number, history: BudgetHistory[]) => {
    setSelectedProjectHistory({ projectName, projectBudgetId, history });
    setExpandedHistoryItems(new Set());
    setHistoryModalVisible(true);
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
      title: 'Уже выделено',
      key: 'allocated',
      width: 120,
      render: (_, record) => {
        const allocation = allocations.get(record.project_id);
        return (
          <Text strong>
            {new Intl.NumberFormat('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 0,
            }).format(allocation?.allocatedAmount || 0)}
          </Text>
        );
      },
    },
    {
      title: 'Добавить',
      key: 'new_allocation',
      width: 180,
      render: (_, record) => {
        const newAmount = newAllocations.get(record.project_id) || 0;
        return (
          <Space>
            <InputNumber
              value={newAmount}
              onChange={(value) => handleNewAllocationChange(record.project_id, value)}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={(value) => Number(value!.replace(/\s?/g, ''))}
              min={0}
              style={{ width: 140 }}
              addonAfter="₽"
              placeholder="0"
            />
            {newAmount > 0 && (
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
            <Popconfirm
              title="Обнулить все бюджеты?"
              description="Будут удалены ВСЕ распределения, остатки и суммы потраченных средств по всем проектам. Это действие необратимо!"
              onConfirm={handleResetBudgets}
              okText="Да, обнулить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              icon={<WarningOutlined style={{ color: 'red' }} />}
            >
              <Button
                danger
                icon={<ClearOutlined />}
                loading={resetBudgetsMutation.isPending}
              >
                Обнулить все
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveChanges}
              loading={updateBudgetsMutation.isPending}
              disabled={totalNewAllocations === 0}
            >
              Сохранить изменения
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Budget Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Текущий общий бюджет</Text>
              <Statistic
                value={totalBudget}
                precision={0}
                suffix="₽"
                valueStyle={{ color: '#1890ff', fontSize: 28 }}
                prefix={<BankOutlined />}
              />
              <Text type="secondary">Уже распределено по проектам</Text>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card style={{ borderColor: '#52c41a', borderWidth: 2 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Добавить новые средства</Text>
              <InputNumber
                value={additionalBudget}
                onChange={(value) => setAdditionalBudget(value || 0)}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => Number(value!.replace(/\s?/g, ''))}
                min={0}
                style={{ width: '100%' }}
                size="large"
                addonAfter="₽"
                placeholder="Введите сумму для добавления"
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Statistics */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col span={24}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="Всего выделено"
                  value={totalAllocated}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<FundOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Новые средства"
                  value={additionalBudget}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<RiseOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="К распределению"
                  value={unallocatedNew}
                  precision={0}
                  suffix="₽"
                  valueStyle={{ color: unallocatedNew > 0 ? '#faad14' : '#52c41a' }}
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
        
        {unallocatedNew > 0 && (
          <>
            <Divider />
            <Alert
              message="Есть нераспределенные средства"
              description={`У вас есть ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(unallocatedNew)} новых нераспределенных средств`}
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
        
        {unallocatedNew < 0 && (
          <>
            <Divider />
            <Alert
              message="Превышен бюджет"
              description={`Распределено на ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(Math.abs(unallocatedNew))} больше новых средств, чем добавлено`}
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
                  <Text strong style={{ color: '#52c41a' }}>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(totalNewAllocations)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(totalSpent)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <Text strong style={{ color: '#52c41a' }}>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(totalRemaining)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <Progress
                    percent={Math.round((totalSpent / totalAllocated) * 100)}
                    size="small"
                    status={totalSpent > totalAllocated * 0.9 ? 'exception' : 'normal'}
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
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
                <Table.Summary.Cell index={7} />
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
          setExpandedHistoryItems(new Set());
        }}
        footer={
          <Space>
            <Popconfirm
              title="Очистить всю историю?"
              description="Все записи истории бюджета для этого проекта будут удалены. Это действие необратимо!"
              onConfirm={handleClearHistory}
              okText="Да, очистить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              icon={<WarningOutlined style={{ color: 'red' }} />}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={clearHistoryMutation.isPending}
              >
                Очистить историю
              </Button>
            </Popconfirm>
            <Button onClick={() => {
              setHistoryModalVisible(false);
              setSelectedProjectHistory(null);
              setExpandedHistoryItems(new Set());
            }}>
              Закрыть
            </Button>
          </Space>
        }
        width={700}
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          {selectedProjectHistory?.history && selectedProjectHistory.history.length > 0 ? (
            <Timeline
              items={selectedProjectHistory.history.map((item) => {
                const isExpanded = expandedHistoryItems.has(item.id);
                return {
                  color: item.action_type === 'allocation' ? 'green' : 
                         item.action_type === 'spent' ? 'red' : 'blue',
                  children: (
                    <div>
                      {/* Compact header - always visible */}
                      <div 
                        style={{ 
                          cursor: 'pointer',
                          padding: '4px 0',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => toggleHistoryItemExpansion(item.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Space>
                          {isExpanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
                          <Text strong style={{ fontSize: 13 }}>
                            {item.action_type === 'allocation' && 'Выделение бюджета'}
                            {item.action_type === 'adjustment' && 'Корректировка бюджета'}
                            {item.action_type === 'spent' && 'Расход средств'}
                          </Text>
                          {item.amount !== 0 && (
                            <Text style={{ fontSize: 12, color: '#666' }}>
                              {new Intl.NumberFormat('ru-RU', {
                                style: 'currency',
                                currency: 'RUB',
                                minimumFractionDigits: 0,
                              }).format(Math.abs(item.amount))}
                            </Text>
                          )}
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(item.created_at).format('DD.MM.YY HH:mm')}
                          </Text>
                        </Space>
                      </div>
                      
                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{ marginTop: 12, marginLeft: 20, paddingLeft: 12, borderLeft: '2px solid #f0f0f0' }}>
                          {item.amount !== 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <Text>
                                <strong>Сумма:</strong> {new Intl.NumberFormat('ru-RU', {
                                  style: 'currency',
                                  currency: 'RUB',
                                  minimumFractionDigits: 0,
                                }).format(Math.abs(item.amount))}
                              </Text>
                            </div>
                          )}
                          
                          {item.description && (
                            <div style={{ marginBottom: 8 }}>
                              <Text>
                                <strong>Описание:</strong>
                              </Text>
                              <br />
                              <Text type="secondary">{item.description}</Text>
                            </div>
                          )}
                          
                          <div style={{ marginBottom: 8 }}>
                            <Text>
                              <strong>Дата:</strong> {dayjs(item.created_at).format('DD MMMM YYYY, HH:mm')}
                            </Text>
                          </div>
                          
                          {item.creator && (
                            <div>
                              <Text>
                                <strong>Пользователь:</strong>
                              </Text>
                              <br />
                              <Text type="secondary">
                                <UserOutlined style={{ marginRight: 4 }} />
                                {item.creator.full_name || item.creator.email}
                              </Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ),
                };
              })}
            />
          ) : (
            <Empty description="История изменений пока пуста" />
          )}
        </div>
      </Modal>
    </div>
  );
}