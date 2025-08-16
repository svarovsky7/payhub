import { useState } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  message,
  Tag,
  Typography
} from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '@/entities/user';
import { projectApi } from '@/entities/project';
import type { User } from '@/shared/types';

const { Title } = Typography;

export function UsersManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: { id: string; data: Partial<User>; projectIds: number[] }) => {
      await userApi.update(values.id, values.data);
      await userApi.assignProjects(values.id, values.projectIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('Пользователь обновлен');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
      message.error('Ошибка при обновлении пользователя');
    },
  });

  const handleEdit = async (user: User) => {
    setEditingUser(user);
    try {
      const userProjects = await userApi.getUserProjects(user.id);
      form.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
        project: userProjects[0] || undefined,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to load user projects:', error);
      // Still open modal even if projects fail to load
      form.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
        project: undefined,
      });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async (values: {
    full_name: string;
    email: string;
    project?: number;
  }) => {
    if (!editingUser) return;
    
    updateMutation.mutate({
      id: editingUser.id,
      data: {
        full_name: values.full_name,
      },
      projectIds: values.project ? [values.project] : [],
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 250,
      render: (text) => (
        <Space>
          <UserOutlined />
          {text || 'Не указано'}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 250,
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Да' : 'Нет'}
        </Tag>
      ),
    },
    {
      title: 'Проект',
      key: 'project',
      width: 200,
      render: (_, record) => {
        const project = projects.find(p => p.id === record.project_id);
        return project ? (
          <Tag color="blue">{project.name}</Tag>
        ) : (
          <span style={{ color: '#999' }}>Не назначен</span>
        );
      },
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleDateString('ru-RU') : '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Изменить
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Управление пользователями</Title>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        scroll={{ x: 'max-content' }}
        tableLayout="auto"
      />

      <Modal
        title="Редактирование пользователя"
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
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="project"
            label="Проект"
          >
            <Select
              placeholder="Выберите проект"
              allowClear
              options={projects.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Сохранить
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