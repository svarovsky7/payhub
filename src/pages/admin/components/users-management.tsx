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
    const userProjects = await userApi.getUserProjects(user.id);
    form.setFieldsValue({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      position: user.position,
      department: user.department,
      projects: userProjects,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async (values: {
    full_name: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
    projects?: number[];
  }) => {
    if (!editingUser) return;
    
    updateMutation.mutate({
      id: editingUser.id,
      data: {
        full_name: values.full_name,
        phone: values.phone,
        position: values.position,
        department: values.department,
      },
      projectIds: values.projects || [],
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
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
      width: 200,
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Должность',
      dataIndex: 'position',
      key: 'position',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Отдел',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Проекты',
      key: 'projects',
      width: 200,
      render: (_, record) => (
        <Space size={[0, 8]} wrap>
          {(record as User & { user_projects?: Array<{ project_id: number; projects?: { name: string } }> }).user_projects?.map((up) => (
            <Tag key={up.project_id} color="blue">
              {up.projects?.name}
            </Tag>
          )) || <span style={{ color: '#999' }}>Нет проектов</span>}
        </Space>
      ),
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
        scroll={{ x: 1200 }}
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
            name="phone"
            label="Телефон"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="position"
            label="Должность"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="department"
            label="Отдел"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="projects"
            label="Проекты"
          >
            <Select
              mode="multiple"
              placeholder="Выберите проекты"
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