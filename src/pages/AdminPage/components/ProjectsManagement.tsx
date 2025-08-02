import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { projectsApi, type Project, type CreateProjectData } from '@/entities/reference-data/api/projects-api';
import { message } from '@/shared/ui';

export const ProjectsManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin', 'projects'],
    queryFn: projectsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект успешно создан!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при создании проекта');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateProjectData> }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект успешно обновлен!');
      setIsModalVisible(false);
      setEditingProject(null);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при обновлении проекта');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект успешно удален!');
    },
    onError: () => {
      message.error('Ошибка при удалении проекта');
    },
  });

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue(project);
    setIsModalVisible(true);
  };

  const handleSubmit = (values: CreateProjectData) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const columns: ColumnsType<Project> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Код проекта',
      dataIndex: 'code',
      key: 'code',
      sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: formatDate,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить проект?"
            description="Это действие нельзя отменить."
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить проект
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={isLoading}
        tableLayout="auto"
        size="small"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} из ${total} записей`,
        }}
      />

      <Modal
        title={editingProject ? 'Редактировать проект' : 'Добавить проект'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код проекта"
            rules={[{ required: true, message: 'Введите код проекта!' }]}
          >
            <Input placeholder="Например: ZK-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название проекта"
            rules={[{ required: true, message: 'Введите название проекта!' }]}
          >
            <Input placeholder="Например: Строительство ЖК 'Солнечный'" />
          </Form.Item>


          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingProject(null);
                  form.resetFields();
                }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProject ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};