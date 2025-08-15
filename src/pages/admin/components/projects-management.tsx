import { useState } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Space, 
  message,
  Popconfirm,
  Typography,
  Tag,
  DatePicker,
  Select,
  InputNumber
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ProjectOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { projectApi } from '@/entities/project';
import type { Project } from '@/shared/types';
import dayjs from 'dayjs';

const { Title } = Typography;

export function ProjectsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект создан');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      message.error('Ошибка при создании проекта');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) =>
      projectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект обновлен');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
      message.error('Ошибка при обновлении проекта');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект удален');
    },
    onError: (error) => {
      console.error('Failed to delete project:', error);
      message.error('Ошибка при удалении проекта');
    },
  });

  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      ...project,
      start_date: project.start_date ? dayjs(project.start_date) : null,
      end_date: project.end_date ? dayjs(project.end_date) : null,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    form.resetFields();
  };

  const handleSubmit = (values: {
    name: string;
    code?: string;
    description?: string;
    status?: string;
    budget?: number;
    start_date?: dayjs.Dayjs;
    end_date?: dayjs.Dayjs;
  }) => {
    const data = {
      ...values,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
    };
    
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'on_hold': return 'orange';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'on_hold': return 'Приостановлен';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const columns: ColumnsType<Project> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text) => (
        <Space>
          <ProjectOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Бюджет',
      dataIndex: 'budget',
      key: 'budget',
      width: 150,
      render: (amount) => amount ? new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
      }).format(amount) : '-',
    },
    {
      title: 'Дата начала',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 120,
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'Дата окончания',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 120,
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить проект?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Управление проектами</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить проект
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        scroll={{ x: 1400 }}
      />

      <Modal
        title={editingProject ? 'Редактирование проекта' : 'Новый проект'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код проекта"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус"
            initialValue="active"
          >
            <Select
              options={[
                { label: 'Активный', value: 'active' },
                { label: 'Приостановлен', value: 'on_hold' },
                { label: 'Завершен', value: 'completed' },
                { label: 'Отменен', value: 'cancelled' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="budget"
            label="Бюджет"
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/[₽\s,]/g, '')}
              min={0}
            />
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Дата начала"
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item
            name="end_date"
            label="Дата окончания"
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProject ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={handleCloseModal}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}