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
  Typography,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/shared/store';
import type {
  MaterialRequest,
  MaterialRequestFilters,
} from '@/shared/types';
import {
  RequestStatus,
} from '@/shared/types';
import { materialRequestApi } from '@/entities';
import { message } from '@/shared/ui';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const statusColors = {
  [RequestStatus.PENDING_MANAGER]: 'orange',
  [RequestStatus.PENDING_DIRECTOR]: 'purple',
  [RequestStatus.APPROVED]: 'green',
  [RequestStatus.REJECTED]: 'red',
};

const statusLabels = {
  [RequestStatus.PENDING_MANAGER]: 'На согласовании у руководителя',
  [RequestStatus.PENDING_DIRECTOR]: 'На согласовании у директора',
  [RequestStatus.APPROVED]: 'Утверждено',
  [RequestStatus.REJECTED]: 'Отклонено',
};

export const ApprovalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<MaterialRequestFilters>({
    // Показываем только заявки на согласовании
    status: user?.role === 'CONSTRUCTION_MANAGER' ? 'pending_manager' : 'pending_director',
  });
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Фильтруем заявки в зависимости от роли
  const getFiltersForRole = () => {
    if (user?.role === 'CONSTRUCTION_MANAGER') {
      return {
        ...filters,
        constructionManagerId: user.id, // Руководитель видит только свои проекты
      };
    }
    if (user?.role === 'DIRECTOR') {
      return {
        ...filters,
        status: 'pending_director', // Директор видит заявки на директорском согласовании
      };
    }
    return filters;
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['material-requests', getFiltersForRole()],
    queryFn: () => materialRequestApi.getAll(getFiltersForRole()),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approvedAmount, comment }: { id: number; approvedAmount?: number; comment?: string }) => {
      if (user?.role === 'CONSTRUCTION_MANAGER') {
        return materialRequestApi.approveByManager(id, approvedAmount!, comment);
      } else {
        return materialRequestApi.approveByDirector(id, comment);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      message.success('Заявка успешно согласована!');
      setIsApprovalModalVisible(false);
      setSelectedRequest(null);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при согласовании заявки');
    },
  });

  const handleApprove = (request: MaterialRequest) => {
    setSelectedRequest(request);
    if (user?.role === 'CONSTRUCTION_MANAGER') {
      form.setFieldsValue({
        approved_amount: request.amount,
      });
      setIsApprovalModalVisible(true);
    } else {
      // Директор сразу утверждает без изменения суммы
      approveMutation.mutate({ id: request.id });
    }
  };

  const handleApprovalSubmit = (values: any) => {
    if (selectedRequest) {
      approveMutation.mutate({
        id: selectedRequest.id,
        approvedAmount: values.approved_amount,
        comment: values.comment,
      });
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      requests.map((request) => ({
        'ID': request.id,
        'Описание материалов': request.materials_description,
        'Запрошенная сумма': request.amount,
        'Согласованная сумма': request.approved_amount || '',
        'Статус': statusLabels[request.status as keyof typeof statusLabels],
        'Дата создания': new Date(request.created_at).toLocaleDateString('ru-RU'),
        'Комментарий': request.comment || 'Не указано',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Заявки на согласовании');
    XLSX.writeFile(workbook, 'заявки-на-согласовании.xlsx');
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
      title: 'Запрошенная сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number) => formatCurrency(amount),
    },
    ...(user?.role === 'DIRECTOR' ? [{
      title: 'Согласованная сумма',
      dataIndex: 'approved_amount',
      key: 'approved_amount',
      width: 130,
      render: (amount: number) => amount ? formatCurrency(amount) : '-',
    }] : []),
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {statusLabels[status as keyof typeof statusLabels]}
        </Tag>
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
      title: 'Действия',
      key: 'action',
      width: 120,
      render: (_, record) => {
        const canApprove = (
          (user?.role === 'CONSTRUCTION_MANAGER' && record.status === 'pending_manager') ||
          (user?.role === 'DIRECTOR' && record.status === 'pending_director')
        );

        return canApprove ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record)}
            >
              Согласовать
            </Button>
          </Space>
        ) : null;
      },
    },
  ];

  return (
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
            value={filters.status}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <Select.Option key={key} value={key}>
                {label}
              </Select.Option>
            ))}
          </Select>
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

      {/* Модальное окно для согласования руководителем */}
      <Modal
        title="Согласование заявки"
        open={isApprovalModalVisible}
        onCancel={() => {
          setIsApprovalModalVisible(false);
          setSelectedRequest(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedRequest && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Описание материалов:</Text>
              <br />
              <Text>{selectedRequest.materials_description}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Запрошенная сумма:</Text>
              <br />
              <Text>{formatCurrency(selectedRequest.amount)}</Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleApprovalSubmit}
            >
              <Form.Item
                name="approved_amount"
                label="Согласованная сумма (руб.)"
                rules={[{ required: true, message: 'Пожалуйста, введите согласованную сумму!' }]}
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
                  rows={3}
                  placeholder="Дополнительные комментарии к согласованию"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      setIsApprovalModalVisible(false);
                      setSelectedRequest(null);
                      form.resetFields();
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={approveMutation.isPending}
                  >
                    Согласовать
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </Card>
  );
};