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
import { payersApi, type Payer, type CreatePayerData } from '@/entities/reference-data/api/payers-api';
import { message } from '@/shared/ui';

export const PayersManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: payers = [], isLoading } = useQuery({
    queryKey: ['admin', 'payers'],
    queryFn: payersApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: payersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payers'] });
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик успешно создан!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при создании плательщика');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePayerData> }) =>
      payersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payers'] });
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик успешно обновлен!');
      setIsModalVisible(false);
      setEditingPayer(null);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при обновлении плательщика');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: payersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payers'] });
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик успешно удален!');
    },
    onError: () => {
      message.error('Ошибка при удалении плательщика');
    },
  });

  const handleCreate = () => {
    setEditingPayer(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (payer: Payer) => {
    setEditingPayer(payer);
    form.setFieldsValue(payer);
    setIsModalVisible(true);
  };

  const handleSubmit = (values: CreatePayerData) => {
    if (editingPayer) {
      updateMutation.mutate({ id: editingPayer.id, data: values });
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

  const columns: ColumnsType<Payer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      sorter: (a, b) => (a.inn || '').localeCompare(b.inn || ''),
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
            title="Удалить плательщика?"
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
          Добавить плательщика
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={payers}
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
        title={editingPayer ? 'Редактировать плательщика' : 'Добавить плательщика'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingPayer(null);
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
            name="name"
            label="Название организации"
            rules={[{ required: true, message: 'Введите название организации!' }]}
          >
            <Input placeholder="Например: ООО 'ФинИнвест'" />
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр!' }
            ]}
          >
            <Input placeholder="1234567890" maxLength={12} />
          </Form.Item>


          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingPayer(null);
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
                {editingPayer ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};