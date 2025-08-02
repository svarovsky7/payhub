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
import { contractorsApi, type Contractor, type CreateContractorData } from '@/entities/reference-data/api/contractors-api';
import { message } from '@/shared/ui';

export const ContractorsManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['admin', 'contractors'],
    queryFn: contractorsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: contractorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contractors'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Контрагент успешно создан!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при создании контрагента');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateContractorData> }) =>
      contractorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contractors'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Контрагент успешно обновлен!');
      setIsModalVisible(false);
      setEditingContractor(null);
      form.resetFields();
    },
    onError: () => {
      message.error('Ошибка при обновлении контрагента');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contractorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contractors'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Контрагент успешно удален!');
    },
    onError: () => {
      message.error('Ошибка при удалении контрагента');
    },
  });

  const handleCreate = () => {
    setEditingContractor(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    form.setFieldsValue(contractor);
    setIsModalVisible(true);
  };

  const handleSubmit = (values: CreateContractorData) => {
    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data: values });
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

  const columns: ColumnsType<Contractor> = [
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
      title: 'КПП',
      dataIndex: 'kpp',
      key: 'kpp',
      sorter: (a, b) => (a.kpp || '').localeCompare(b.kpp || ''),
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      sorter: (a, b) => (a.address || '').localeCompare(b.address || ''),
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
            title="Удалить контрагента?"
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
          Добавить контрагента
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={contractors}
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
        title={editingContractor ? 'Редактировать контрагента' : 'Добавить контрагента'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingContractor(null);
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
            <Input placeholder="Например: ООО 'СтройМатериал'" />
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

          <Form.Item
            name="kpp"
            label="КПП"
            rules={[
              { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр!' }
            ]}
          >
            <Input placeholder="123456789" maxLength={9} />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
          >
            <Input.TextArea
              rows={2}
              placeholder="Юридический адрес организации"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingContractor(null);
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
                {editingContractor ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};