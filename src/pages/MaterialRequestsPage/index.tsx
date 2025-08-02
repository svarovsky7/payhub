import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Modal,
  Form,
  InputNumber,
  Checkbox,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useAuthStore } from '@/shared/store';
import type {
  MaterialRequest,
  MaterialRequestFilters,
  CreateMaterialRequestData,
} from '@/shared/types';
import {
  RequestStatus,
} from '@/shared/types';
import { materialRequestApi, materialRequestStatusApi, referenceDataApi } from '@/entities';
import { message } from '@/shared/ui';
import { supabase } from '@/shared/api';

// const { Title } = Typography;
const { RangePicker } = DatePicker;

// Статусы теперь загружаются динамически из базы данных


export const MaterialRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<MaterialRequestFilters>({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [userProjectId, setUserProjectId] = useState<number | null>(null);
  const [isColumnSettingsVisible, setIsColumnSettingsVisible] = useState(false);
  
  const defaultColumns = [
    'id', 'project', 'material_request_number', 'invoice_number', 
    'contractor', 'payer', 'responsible_person', 'construction_manager',
    'materials_description', 'amount', 'status', 'created_by', 'created_at', 'comment', 'action'
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('materialRequestsVisibleColumns');
    return saved ? JSON.parse(saved) : defaultColumns;
  });
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('materialRequestsColumnOrder');
    return saved ? JSON.parse(saved) : defaultColumns;
  });

  // Загружаем проект пользователя
  React.useEffect(() => {
    const loadUserProject = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', user.id)
          .maybeSingle(); // Используем maybeSingle вместо single для избежания ошибки если записи нет
        
        if (!error && data) {
          setUserProjectId(data.project_id);
        }
      } catch (error) {
        console.error('Error loading user project:', error);
        // Не показываем ошибку пользователю, так как это не критично
      }
    };
    
    loadUserProject();
  }, [user]);

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['material-requests', filters],
    queryFn: () => materialRequestApi.getAll(filters),
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 минут
    onSuccess: (data) => {
      console.log('Material requests loaded successfully:', data.length, 'items');
    },
    onError: (error) => {
      console.error('Error loading material requests:', error);
    },
  });

  // Логирование состояния загрузки
  React.useEffect(() => {
    console.log('MaterialRequestsPage state:', {
      isLoading,
      requestsCount: requests?.length || 0,
      error: error?.message,
      filters
    });
  }, [isLoading, requests, error, filters]);

  // Загружаем справочные данные
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: referenceDataApi.getProjects,
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: referenceDataApi.getContractors,
  });

  const { data: payers = [] } = useQuery({
    queryKey: ['payers'],
    queryFn: referenceDataApi.getPayers,
  });

  const { data: responsiblePersons = [] } = useQuery({
    queryKey: ['responsible-persons'],
    queryFn: referenceDataApi.getResponsiblePersons,
  });

  const { data: constructionManagers = [] } = useQuery({
    queryKey: ['construction-managers'],
    queryFn: referenceDataApi.getConstructionManagers,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['material-request-statuses'],
    queryFn: materialRequestStatusApi.getActive,
  });

  const createMutation = useMutation({
    mutationFn: materialRequestApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      message.success('Заявка на материалы создана успешно!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      console.error('Error creating material request:', error);
      let errorMessage = 'Ошибка при создании заявки';
      
      if (error?.details) {
        if (error.details.includes('project_id')) {
          errorMessage = 'Выбранный проект не найден. Проверьте данные.';
        } else if (error.details.includes('contractor_id')) {
          errorMessage = 'Выбранный контрагент не найден. Проверьте данные.';
        } else if (error.details.includes('payer_id')) {
          errorMessage = 'Выбранный плательщик не найден. Проверьте данные.';
        } else if (error.details.includes('responsible_person_id')) {
          errorMessage = 'Выбранное ответственное лицо не найдено. Проверьте данные.';
        } else if (error.details.includes('construction_manager_id')) {
          errorMessage = 'Выбранный руководитель не найден. Проверьте данные.';
        }
      }
      
      message.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MaterialRequest> }) => 
      materialRequestApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      message.success('Заявка успешно обновлена!');
      setIsModalVisible(false);
      form.resetFields();
      setEditingRequest(null);
    },
    onError: () => {
      message.error('Ошибка при обновлении заявки');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: materialRequestApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      message.success('Заявка успешно удалена!');
    },
    onError: () => {
      message.error('Ошибка при удалении заявки');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, statusCode }: { requestId: number; statusCode: string }) =>
      materialRequestStatusApi.updateMaterialRequestStatus(requestId, statusCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      message.success('Статус заявки успешно обновлен!');
    },
    onError: () => {
      message.error('Ошибка при обновлении статуса');
    },
  });

  const handleCreateRequest = (values: Record<string, unknown>) => {
    const requestData: CreateMaterialRequestData = {
      project_id: values.project_id,
      construction_manager_id: values.construction_manager_id,
      contractor_id: values.contractor_id,
      payer_id: values.payer_id,
      responsible_person_id: values.responsible_person_id,
      materials_description: values.materials_description,
      amount: values.amount,
      comment: values.comment,
      material_request_number: values.material_request_number,
      invoice_number: values.invoice_number,
    };
    
    if (editingRequest) {
      updateMutation.mutate({ id: editingRequest.id, data: requestData });
    } else {
      createMutation.mutate(requestData);
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      requests.map((request: MaterialRequest & { projects?: { name?: string }; contractors?: { name?: string }; payers?: { name?: string }; responsible_persons?: { full_name?: string }; user_profiles?: { full_name?: string }; created_by_profile?: { full_name?: string } }) => ({
        'ID': request.id,
        'Проект': request.projects?.name || 'Не указан',
        'Номер заявки': request.material_request_number || 'Не указан',
        'Номер счета': request.invoice_number || 'Не указан',
        'Контрагент': request.contractors?.name || 'Не указан',
        'Плательщик': request.payers?.name || 'Не указан',
        'МОЛ': request.responsible_persons?.full_name || 'Не указан',
        'Руководитель': request.user_profiles?.full_name || 'Не указан',
        'Описание материалов': request.materials_description,
        'Сумма': request.amount,
        'Статус': statuses.find(s => s.code === request.status)?.name || request.status,
        'Кто добавил': request.created_by_profile?.full_name || 'Неизвестно',
        'Дата создания': formatDate(request.created_at),
        'Комментарий': request.comment || 'Не указано',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Заявки на материалы');
    XLSX.writeFile(workbook, 'заявки-на-материалы.xlsx');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    if (visible) {
      setVisibleColumns(prev => [...prev, columnKey]);
    } else {
      setVisibleColumns(prev => prev.filter(key => key !== columnKey));
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(columnOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setColumnOrder(items);
  };

  const handleEdit = (record: MaterialRequest) => {
    setEditingRequest(record);
    form.setFieldsValue({
      ...record,
      project_id: record.project_id,
      construction_manager_id: record.construction_manager_id,
      contractor_id: record.contractor_id,
      payer_id: record.payer_id,
      responsible_person_id: record.responsible_person_id,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (record: MaterialRequest) => {
    Modal.confirm({
      title: 'Удалить заявку?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleStatusChange = (requestId: number, statusCode: string) => {
    updateStatusMutation.mutate({ requestId, statusCode });
  };

  const allColumns = [
    { key: 'id', title: 'ID' },
    { key: 'project', title: 'Проект' },
    { key: 'material_request_number', title: 'Номер заявки' },
    { key: 'invoice_number', title: 'Номер счета' },
    { key: 'contractor', title: 'Контрагент' },
    { key: 'payer', title: 'Плательщик' },
    { key: 'responsible_person', title: 'МОЛ' },
    { key: 'construction_manager', title: 'Руководитель' },
    { key: 'materials_description', title: 'Описание материалов' },
    { key: 'amount', title: 'Сумма' },
    { key: 'status', title: 'Статус' },
    { key: 'created_by', title: 'Кто добавил' },
    { key: 'created_at', title: 'Дата создания' },
    { key: 'comment', title: 'Комментарий' },
    { key: 'action', title: 'Действия' },
  ];

  const allTableColumns: ColumnsType<MaterialRequest> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a: MaterialRequest, b: MaterialRequest) => a.id - b.id,
    },
    {
      title: 'Проект',
      dataIndex: ['projects', 'name'],
      key: 'project',
      ellipsis: true,
      sorter: (a: MaterialRequest & { projects?: { name?: string } }, b: MaterialRequest & { projects?: { name?: string } }) => {
        const nameA = a.projects?.name || '';
        const nameB = b.projects?.name || '';
        return nameA.localeCompare(nameB, 'ru');
      },
      render: (_, record: MaterialRequest & { projects?: { name?: string } }) => record.projects?.name || 'Не указан',
    },
    {
      title: 'Номер заявки',
      dataIndex: 'material_request_number',
      key: 'material_request_number',
      sorter: (a: MaterialRequest, b: MaterialRequest) => {
        const numA = a.material_request_number || '';
        const numB = b.material_request_number || '';
        return numA.localeCompare(numB, 'ru');
      },
      render: (text?: string) => text || 'Не указан',
    },
    {
      title: 'Номер счета',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text?: string) => text || 'Не указан',
    },
    {
      title: 'Контрагент',
      dataIndex: ['contractors', 'name'],
      key: 'contractor',
      ellipsis: true,
      render: (_, record: MaterialRequest & { contractors?: { name?: string } }) => record.contractors?.name || 'Не указан',
    },
    {
      title: 'Плательщик',
      dataIndex: ['payers', 'name'],
      key: 'payer',
      ellipsis: true,
      render: (_, record: MaterialRequest & { payers?: { name?: string } }) => record.payers?.name || 'Не указан',
    },
    {
      title: 'МОЛ',
      dataIndex: ['responsible_persons', 'full_name'],
      key: 'responsible_person',
      ellipsis: true,
      render: (_, record: MaterialRequest & { responsible_persons?: { full_name?: string } }) => record.responsible_persons?.full_name || 'Не указан',
    },
    {
      title: 'Руководитель',
      dataIndex: ['user_profiles', 'full_name'],
      key: 'construction_manager',
      ellipsis: true,
      render: (_, record: MaterialRequest & { user_profiles?: { full_name?: string } }) => record.user_profiles?.full_name || 'Не указан',
    },
    {
      title: 'Описание материалов',
      dataIndex: 'materials_description',
      key: 'materials_description',
      ellipsis: true,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      sorter: (a: MaterialRequest, b: MaterialRequest) => a.amount - b.amount,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      sorter: (a: MaterialRequest, b: MaterialRequest) => {
        const orderA = Object.keys(RequestStatus).indexOf(a.status.toUpperCase());
        const orderB = Object.keys(RequestStatus).indexOf(b.status.toUpperCase());
        return orderA - orderB;
      },
      render: (status: RequestStatus, record: MaterialRequest) => {
        return (
          <Select
            value={status}
            style={{ width: '100%' }}
            size="small"
            onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
            loading={updateStatusMutation.isPending}
          >
            {statuses.map(s => (
              <Select.Option key={s.code} value={s.code}>
                <Tag color={s.color} style={{ margin: 0 }}>
                  {s.name}
                </Tag>
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: 'Кто добавил',
      dataIndex: ['created_by_profile', 'full_name'],
      key: 'created_by',
      ellipsis: true,
      render: (_, record: MaterialRequest & { created_by_profile?: { full_name?: string } }) => record.created_by_profile?.full_name || 'Неизвестно',
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      sorter: (a: MaterialRequest, b: MaterialRequest) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (comment?: string) => comment || 'Не указано',
    },
    {
      title: 'Действия',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: MaterialRequest) => {
        const canEdit = record.status === 'draft' && record.created_by === user?.id;
        const canDelete = record.status === 'draft' && record.created_by === user?.id;
        
        return (
          <Space size="small">
            <Tooltip title={canEdit ? "Редактировать" : "Можно редактировать только черновики, созданные вами"}>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                disabled={!canEdit}
                onClick={() => handleEdit(record)}
                style={{
                  color: canEdit ? '#1890ff' : undefined,
                  opacity: canEdit ? 1 : 0.25
                }}
              />
            </Tooltip>
            <Tooltip title={canDelete ? "Удалить" : "Можно удалять только черновики, созданные вами"}>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                disabled={!canDelete}
                onClick={() => handleDelete(record)}
                style={{
                  color: canDelete ? '#ff4d4f' : undefined,
                  opacity: canDelete ? 1 : 0.25
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  // Фильтруем и сортируем столбцы по видимости и порядку
  const columns = columnOrder
    .filter(columnKey => visibleColumns.includes(columnKey))
    .map(columnKey => allTableColumns.find(column => column.key === columnKey))
    .filter(Boolean) as ColumnsType<MaterialRequest>;


  return (
    <>
      <Card>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Поиск заявок..."
                prefix={<SearchOutlined />}
                allowClear
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Фильтр по статусу"
                allowClear
                style={{ width: '100%' }}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                {statuses.map((status) => (
                  <Select.Option key={status.code} value={status.code}>
                    <Tag color={status.color} style={{ margin: 0 }}>
                      {status.name}
                    </Tag>
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Поиск по материалам..."
                prefix={<SearchOutlined />}
                allowClear
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={(dates) => {
                  if (dates) {
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: dates[0]?.format('YYYY-MM-DD'),
                      dateTo: dates[1]?.format('YYYY-MM-DD'),
                    }));
                  } else {
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: undefined,
                      dateTo: undefined,
                    }));
                  }
                }}
              />
            </Col>
          </Row>

          <Row justify="space-between" style={{ marginBottom: 16 }}>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingRequest(null);
                    form.resetFields();
                    // Автозаполнение проекта для нового запроса
                    if (userProjectId) {
                      form.setFieldValue('project_id', userProjectId);
                    }
                    setIsModalVisible(true);
                  }}
                >
                  Новая заявка
                </Button>
                <Button icon={<FilterOutlined />}>Доп. фильтры</Button>
                <Button 
                  icon={<SettingOutlined />} 
                  onClick={() => setIsColumnSettingsVisible(true)}
                  title="Настройка столбцов"
                >
                  Столбцы
                </Button>
              </Space>
            </Col>
            <Col>
              <Button icon={<ExportOutlined />} onClick={handleExport}>
                Экспорт
              </Button>
            </Col>
          </Row>

          {error && (
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6 }}>
              <strong>Ошибка загрузки данных:</strong> {(error as Error).message}
              <Button 
                type="link" 
                onClick={() => window.location.reload()}
                style={{ marginLeft: 8 }}
              >
                Обновить страницу
              </Button>
            </div>
          )}

          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            loading={isLoading}
            pagination={{
              total: requests.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} из ${total} записей`,
            }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: isLoading ? 'Загрузка данных...' : 'Нет данных для отображения'
            }}
          />
        </Card>

        <Modal
          title={editingRequest ? "Редактировать заявку на материалы" : "Создать новую заявку на материалы"}
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
            setEditingRequest(null);
          }}
          footer={null}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateRequest}
            initialValues={{
              construction_manager_id: user?.id,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="project_id"
                  label="Проект"
                  rules={[{ required: true, message: 'Выберите проект!' }]}
                >
                  <Select placeholder="Выберите проект">
                    {projects.map(project => (
                      <Select.Option key={project.id} value={project.id}>
                        {project.code} - {project.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="construction_manager_id"
                  label="Руководитель строительства"
                  rules={[{ required: true, message: 'Выберите руководителя!' }]}
                >
                  <Select placeholder="Выберите руководителя">
                    {constructionManagers.map(manager => (
                      <Select.Option key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contractor_id"
                  label="Контрагент"
                  rules={[{ required: true, message: 'Выберите контрагента!' }]}
                >
                  <Select placeholder="Выберите контрагента">
                    {contractors.map(contractor => (
                      <Select.Option key={contractor.id} value={contractor.id}>
                        {contractor.name} {contractor.inn && `(${contractor.inn})`}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="payer_id"
                  label="Плательщик"
                  rules={[{ required: true, message: 'Выберите плательщика!' }]}
                >
                  <Select placeholder="Выберите плательщика">
                    {payers.map(payer => (
                      <Select.Option key={payer.id} value={payer.id}>
                        {payer.name} {payer.inn && `(${payer.inn})`}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="responsible_person_id"
              label="Материально ответственное лицо"
              rules={[{ required: true, message: 'Выберите ответственное лицо!' }]}
            >
              <Select placeholder="Выберите ответственное лицо">
                {responsiblePersons.map(person => (
                  <Select.Option key={person.id} value={person.id}>
                    {person.full_name} - {person.position}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="material_request_number"
                  label="Номер заявки на материалы"
                >
                  <Input placeholder="Введите номер заявки" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="invoice_number"
                  label="Номер счета на оплату"
                >
                  <Input placeholder="Введите номер счета" />
                </Form.Item>
              </Col>
            </Row>


            <Form.Item
              name="materials_description"
              label="Описание материалов"
              rules={[{ required: true, message: 'Пожалуйста, введите описание материалов!' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Опишите необходимые материалы"
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Сумма с НДС 20% (руб.)"
              rules={[{ required: true, message: 'Пожалуйста, введите сумму!' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0,00"
                precision={2}
                formatter={(value) => {
                  if (!value) return '';
                  // Форматируем число с пробелами для тысяч и запятой для дробной части
                  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
                }}
                parser={(value) => {
                  if (!value) return 0;
                  // Парсим число, заменяя запятую на точку и убирая пробелы
                  return Number(value.replace(/\s/g, '').replace(',', '.') || 0);
                }}
              />
            </Form.Item>

            <Form.Item name="comment" label="Комментарий">
              <Input.TextArea
                rows={2}
                placeholder="Дополнительная информация"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                >
                  Создать заявку
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Модальное окно настройки столбцов */}
        <Modal
          title="Настройка столбцов таблицы"
          open={isColumnSettingsVisible}
          onCancel={() => setIsColumnSettingsVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsColumnSettingsVisible(false)}>
              Отмена
            </Button>,
            <Button 
              key="reset" 
              onClick={() => {
                const defaultColumns = [
                  'id', 'project', 'material_request_number', 'invoice_number', 
                  'contractor', 'payer', 'responsible_person', 'construction_manager',
                  'materials_description', 'amount', 'status', 'created_by', 'created_at', 'comment', 'action'
                ];
                setVisibleColumns(defaultColumns);
                setColumnOrder(defaultColumns);
                // Сбрасываем настройки в localStorage
                localStorage.removeItem('materialRequestsColumnOrder');
                localStorage.removeItem('materialRequestsVisibleColumns');
                message.success('Настройки столбцов сброшены к значениям по умолчанию');
              }}
            >
              Сбросить
            </Button>,
            <Button 
              key="ok" 
              type="primary" 
              onClick={() => {
                // Сохраняем настройки в localStorage
                localStorage.setItem('materialRequestsColumnOrder', JSON.stringify(columnOrder));
                localStorage.setItem('materialRequestsVisibleColumns', JSON.stringify(visibleColumns));
                setIsColumnSettingsVisible(false);
                message.success('Настройки столбцов сохранены');
              }}
            >
              Применить
            </Button>,
          ]}
          width={700}
        >
          <div style={{ marginBottom: 24 }}>
            <h4>Настройка видимости и порядка столбцов</h4>
            <p style={{ color: '#666', marginBottom: 0 }}>Перетащите столбцы для изменения порядка. Используйте чекбоксы для показа/скрытия столбцов.</p>
          </div>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? '#f0f8ff' : 'transparent',
                    borderRadius: '6px',
                    padding: '8px',
                    minHeight: '400px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {columnOrder.map((columnKey, index) => {
                    const column = allColumns.find(col => col.key === columnKey);
                    if (!column) return null;
                    
                    const isActionColumn = column.key === 'action';
                    
                    return (
                      <Draggable 
                        key={column.key} 
                        draggableId={column.key} 
                        index={index}
                        isDragDisabled={isActionColumn}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              marginBottom: '8px',
                              padding: '12px 16px',
                              backgroundColor: snapshot.isDragging ? '#e6f7ff' : '#fafafa',
                              border: '1px solid #d9d9d9',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: snapshot.isDragging ? 'none' : 'all 0.2s ease',
                              boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                              cursor: isActionColumn ? 'not-allowed' : 'move',
                              opacity: isActionColumn ? 0.6 : 1
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                              <div 
                                {...provided.dragHandleProps}
                                style={{ 
                                  marginRight: '12px',
                                  color: isActionColumn ? '#bfbfbf' : '#8c8c8c',
                                  cursor: isActionColumn ? 'not-allowed' : 'grab'
                                }}
                              >
                                <HolderOutlined />
                              </div>
                              <Checkbox
                                checked={visibleColumns.includes(column.key)}
                                onChange={(e) => handleColumnVisibilityChange(column.key, e.target.checked)}
                                disabled={isActionColumn}
                                style={{ marginRight: '12px' }}
                              />
                              <span style={{ 
                                fontWeight: isActionColumn ? 'normal' : '500',
                                color: isActionColumn ? '#8c8c8c' : '#262626'
                              }}>
                                {column.title}
                              </span>
                              {isActionColumn && (
                                <Tag size="small" style={{ marginLeft: '8px' }}>Зафиксирован</Tag>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <Divider style={{ margin: '16px 0' }} />
          
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            <p style={{ marginBottom: '4px' }}>💡 <strong>Советы:</strong></p>
            <p style={{ marginBottom: '4px' }}>• Перетащите столбцы за иконку ⋮⋮ для изменения порядка</p>
            <p style={{ marginBottom: '4px' }}>• Столбец "Действия" всегда остается видимым и в конце таблицы</p>
            <p style={{ marginBottom: '0' }}>• Настройки сохраняются автоматически в браузере</p>
          </div>
        </Modal>
    </>
  );
};