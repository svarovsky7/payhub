import React, { useState } from 'react';
import {
  Layout,
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Avatar,
  Dropdown,
  Modal,
  Form,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  UserOutlined,
  LogoutOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/shared/store';
import type {
  MaterialRequest,
  MaterialRequestFilters,
  CreateMaterialRequestData,
} from '@/shared/types';
import {
  RequestStatus,
} from '@/shared/types';
import { materialRequestApi, referenceDataApi } from '@/entities';
import { message } from '@/shared/ui';

const { Header, Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusColors = {
  [RequestStatus.DRAFT]: 'default',
  [RequestStatus.PENDING_MANAGER]: 'orange',
  [RequestStatus.PENDING_DIRECTOR]: 'purple',
  [RequestStatus.APPROVED]: 'green',
  [RequestStatus.PAID]: 'blue',
  [RequestStatus.REJECTED]: 'red',
};

const statusLabels = {
  [RequestStatus.DRAFT]: 'Черновик',
  [RequestStatus.PENDING_MANAGER]: 'На согласовании у руководителя',
  [RequestStatus.PENDING_DIRECTOR]: 'На согласовании у директора',
  [RequestStatus.APPROVED]: 'Утверждено',
  [RequestStatus.PAID]: 'Оплачено',
  [RequestStatus.REJECTED]: 'Отклонено',
};


export const MaterialRequestsPage: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const [filters, setFilters] = useState<MaterialRequestFilters>({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['material-requests', filters],
    queryFn: () => materialRequestApi.getAll(filters),
  });

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

  const createMutation = useMutation({
    mutationFn: materialRequestApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      message.success('Заявка на материалы создана успешно!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
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

  const handleCreateRequest = (values: any) => {
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
    
    createMutation.mutate(requestData);
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      requests.map((request) => ({
        'ID': request.id,
        'Описание материалов': request.materials_description,
        'Сумма': request.amount,
        'Статус': statusLabels[request.status],
        'Дата создания': new Date(request.created_at).toLocaleDateString('ru-RU'),
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

  const columns: ColumnsType<MaterialRequest> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
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
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: RequestStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
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
      width: 80,
      render: () => (
        <Dropdown
          menu={{
            items: [
              {
                key: '1',
                label: 'Подробности',
              },
              {
                key: '2',
                label: 'Редактировать',
              },
              {
                key: '3',
                label: 'Удалить',
                danger: true,
              },
            ],
          }}
          trigger={['click']}
        >
          <Button icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <UserOutlined />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Выход',
      icon: <LogoutOutlined />,
      onClick: signOut,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
          PayHub - Заявки на материалы
        </Title>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.full_name || user?.email}</span>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ padding: '24px' }}>
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
                {Object.values(RequestStatus).map((status) => (
                  <Select.Option key={status} value={status}>
                    {statusLabels[status]}
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
                  onClick={() => setIsModalVisible(true)}
                >
                  Новая заявка
                </Button>
                <Button icon={<FilterOutlined />}>Доп. фильтры</Button>
              </Space>
            </Col>
            <Col>
              <Button icon={<ExportOutlined />} onClick={handleExport}>
                Экспорт
              </Button>
            </Col>
          </Row>

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
          />
        </Card>

        <Modal
          title="Создать новую заявку на материалы"
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
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
              label="Сумма (руб.)"
              rules={[{ required: true, message: 'Пожалуйста, введите сумму!' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0.00"
                precision={2}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/,/g, '')}
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
      </Content>
    </Layout>
  );
};