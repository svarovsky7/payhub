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
import { payerApi } from '@/entities/payer';
import type { Payer } from '@/shared/types';

const { Title } = Typography;

export function PayersManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: payers = [], isLoading } = useQuery({
    queryKey: ['payers'],
    queryFn: payerApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: payerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик создан');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to create payer:', error);
      message.error('Ошибка при создании плательщика');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Payer> }) =>
      payerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик обновлен');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Failed to update payer:', error);
      message.error('Ошибка при обновлении плательщика');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: payerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик удален');
    },
    onError: (error) => {
      console.error('Failed to delete payer:', error);
      message.error('Ошибка при удалении плательщика');
    },
  });

  const handleAdd = () => {
    setEditingPayer(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (payer: Payer) => {
    setEditingPayer(payer);
    form.setFieldsValue(payer);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayer(null);
    form.resetFields();
  };

  const handleSubmit = (values: Partial<Payer>) => {
    if (editingPayer) {
      updateMutation.mutate({ id: editingPayer.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns: ColumnsType<Payer> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 250,
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 150,
    },
    {
      title: 'КПП',
      dataIndex: 'kpp',
      key: 'kpp',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
      width: 300,
      render: (text) => text || '-',
    },
    {
      title: 'Банк',
      dataIndex: 'bank_name',
      key: 'bank_name',
      width: 200,
      render: (text) => text || '-',
    },
    {
      title: 'Расчетный счет',
      dataIndex: 'bank_account',
      key: 'bank_account',
      width: 200,
      render: (text) => text || '-',
    },
    {
      title: 'БИК',
      dataIndex: 'bank_bik',
      key: 'bank_bik',
      width: 120,
      render: (text) => text || '-',
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
            title="Удалить плательщика?"
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
        <Title level={4} style={{ margin: 0 }}>Управление плательщиками</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить плательщика
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={payers}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        scroll={{ x: 1600 }}
      />

      <Modal
        title={editingPayer ? 'Редактирование плательщика' : 'Новый плательщик'}
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

          <Form.Item
            name="kpp"
            label="КПП"
            rules={[
              { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр' }
            ]}
          >
            <Input maxLength={9} />
          </Form.Item>

          <Form.Item
            name="address"
            label="Юридический адрес"
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="bank_name"
            label="Наименование банка"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="bank_account"
            label="Расчетный счет"
            rules={[
              { pattern: /^\d{20}$/, message: 'Расчетный счет должен содержать 20 цифр' }
            ]}
          >
            <Input maxLength={20} />
          </Form.Item>

          <Form.Item
            name="bank_bik"
            label="БИК банка"
            rules={[
              { pattern: /^\d{9}$/, message: 'БИК должен содержать 9 цифр' }
            ]}
          >
            <Input maxLength={9} />
          </Form.Item>

          <Form.Item
            name="bank_corr_account"
            label="Корр. счет"
            rules={[
              { pattern: /^\d{20}$/, message: 'Корр. счет должен содержать 20 цифр' }
            ]}
          >
            <Input maxLength={20} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingPayer ? 'Сохранить' : 'Создать'}
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