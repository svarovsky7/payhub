import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  ColorPicker,
  Switch,
  InputNumber,
  Space,
  Popconfirm,
  Tag,
  Card,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { materialRequestStatusApi } from '@/entities';
import type { 
  MaterialRequestStatus, 
  CreateMaterialRequestStatusData,
  UpdateMaterialRequestStatusData 
} from '@/shared/types';
import { message } from '@/shared/ui';

const { Title } = Typography;
const { TextArea } = Input;

export const StatusesManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStatus, setEditingStatus] = useState<MaterialRequestStatus | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['material-request-statuses-all'],
    queryFn: materialRequestStatusApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: materialRequestStatusApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-request-statuses-all'] });
      queryClient.invalidateQueries({ queryKey: ['material-request-statuses'] });
      message.success('Статус успешно создан!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      console.error('Error creating status:', error);
      message.error('Ошибка при создании статуса');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaterialRequestStatusData }) =>
      materialRequestStatusApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-request-statuses-all'] });
      queryClient.invalidateQueries({ queryKey: ['material-request-statuses'] });
      message.success('Статус успешно обновлен!');
      setIsModalVisible(false);
      form.resetFields();
      setEditingStatus(null);
    },
    onError: () => {
      message.error('Ошибка при обновлении статуса');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: materialRequestStatusApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-request-statuses-all'] });
      queryClient.invalidateQueries({ queryKey: ['material-request-statuses'] });
      message.success('Статус успешно удален!');
    },
    onError: () => {
      message.error('Ошибка при удалении статуса');
    },
  });

  const handleCreateOrUpdate = (values: Record<string, unknown>) => {
    const statusData: CreateMaterialRequestStatusData | UpdateMaterialRequestStatusData = {
      name: values.name,
      description: values.description,
      color: typeof values.color === 'string' ? values.color : values.color?.toHexString(),
      order_index: values.order_index,
      is_active: values.is_active ?? true,
    };

    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data: statusData });
    } else {
      const createData = statusData as CreateMaterialRequestStatusData;
      createData.code = values.code;
      createMutation.mutate(createData);
    }
  };

  const handleEdit = (record: MaterialRequestStatus) => {
    setEditingStatus(record);
    form.setFieldsValue({
      ...record,
      color: record.color,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const columns: ColumnsType<MaterialRequestStatus> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: MaterialRequestStatus) => (
        <Tag color={record.color}>{name}</Tag>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Цвет',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: color,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
            }}
          />
          <span style={{ fontSize: '12px', color: '#666' }}>{color}</span>
        </div>
      ),
    },
    {
      title: 'Порядок',
      dataIndex: 'order_index',
      key: 'order_index',
      width: 100,
      sorter: (a, b) => a.order_index - b.order_index,
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Да' : 'Нет'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_, record: MaterialRequestStatus) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить статус?"
            description="Это действие нельзя отменить."
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
            okType="danger"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              title="Удалить"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Управление статусами заявок</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingStatus(null);
            form.resetFields();
            form.setFieldsValue({ 
              is_active: true, 
              order_index: statuses.length + 1,
              color: '#1890ff'
            });
            setIsModalVisible(true);
          }}
        >
          Добавить статус
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={statuses}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} из ${total} записей`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingStatus ? 'Редактировать статус' : 'Создать новый статус'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingStatus(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrUpdate}
          initialValues={{
            is_active: true,
            order_index: 1,
            color: '#1890ff',
          }}
        >
          {!editingStatus && (
            <Form.Item
              name="code"
              label="Код статуса"
              rules={[
                { required: true, message: 'Введите код статуса!' },
                { pattern: /^[a-z_]+$/, message: 'Код должен содержать только строчные буквы и подчеркивания!' }
              ]}
            >
              <Input placeholder="draft, pending_manager, approved..." />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Название статуса"
            rules={[{ required: true, message: 'Введите название статуса!' }]}
          >
            <Input placeholder="Черновик, На согласовании..." />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea
              rows={3}
              placeholder="Описание статуса для пользователей"
            />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет"
            rules={[{ required: true, message: 'Выберите цвет!' }]}
          >
            <ColorPicker showText format="hex" />
          </Form.Item>

          <Form.Item
            name="order_index"
            label="Порядковый номер"
            rules={[{ required: true, message: 'Укажите порядковый номер!' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="1, 2, 3..."
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                  setEditingStatus(null);
                }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingStatus ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};