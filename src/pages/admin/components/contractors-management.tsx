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
  Typography
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { contractorApi } from '@/entities/contractor';
import type { Contractor } from '@/shared/types';

const { Title } = Typography;

export function ContractorsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: contractorApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Поставщик создан');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to create contractor:', error);
      message.error('Ошибка при создании поставщика');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Contractor> }) =>
      contractorApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Поставщик обновлен');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to update contractor:', error);
      message.error('Ошибка при обновлении поставщика');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contractorApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Поставщик удален');
    },
    onError: (error) => {
      console.error('Failed to delete contractor:', error);
      message.error('Ошибка при удалении поставщика');
    },
  });

  const handleAdd = () => {
    setEditingContractor(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    form.setFieldsValue(contractor);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContractor(null);
    form.resetFields();
  };

  const handleSubmit = (values: Partial<Contractor>) => {
    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns: ColumnsType<Contractor> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 300,
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 150,
      render: (text) => text || '-',
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
            title="Удалить поставщика?"
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
        <Title level={4} style={{ margin: 0 }}>Управление поставщиками</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить поставщика
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={contractors}
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
        title={editingContractor ? 'Редактирование поставщика' : 'Новый поставщик'}
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
            name="inn"
            label="ИНН"
            rules={[
              { required: true, message: 'Введите ИНН' },
              { pattern: /^\d{10}(\d{2})?$/, message: 'Неверный формат ИНН' }
            ]}
          >
            <Input maxLength={12} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingContractor ? 'Сохранить' : 'Создать'}
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