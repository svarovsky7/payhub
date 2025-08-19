import { invoiceApi } from '@/entities';
import { useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Alert,
  Popconfirm,
  message,
} from 'antd';
import {
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { InvoiceActions } from '@/shared/components';

const { Title } = Typography;

export function RejectedPage() {
  const queryClient = useQueryClient();

  // Fetch rejected invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['rejected-invoices'],
    queryFn: () => invoiceApi.getByStatus('rejected'),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: invoiceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Счет успешно удален');
    },
    onError: (error) => {
      console.error('Failed to delete invoice:', error);
      message.error('Ошибка при удалении счета');
    },
  });

  const handleDelete = (invoice: Invoice) => {
    deleteMutation.mutate(invoice.id);
  };

  const getStatusTag = (status: string | null) => {
    const statusConfig = {
      rejected: { color: 'error', text: 'Отказано' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status || 'Не указан' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Номер счета',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 120,
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 100,
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'Поставщик',
      dataIndex: ['contractor', 'name'],
      key: 'contractor',
      width: 200,
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      width: 150,
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 150,
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount) => new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
      }).format(amount),
    },
    {
      title: 'Сумма Рукстроя',
      dataIndex: 'rukstroy_amount',
      key: 'rukstroy_amount',
      width: 120,
      render: (amount) => {
        if (!amount) {
          return <span style={{ color: '#d9d9d9' }}>—</span>;
        }
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
        }).format(amount);
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: getStatusTag,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <InvoiceActions
          invoice={record}
          onDelete={handleDelete}
          size="small"
          showApprove={false}
          showEdit={false}
          showDelete={true}
          showReject={false}
          showView={true}
          showSubmit={false}
        />
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Отказано</Title>
        </Col>
        <Col>
          <Tag color="processing">
            Всего счетов: {invoices.length}
          </Tag>
        </Col>
      </Row>

      {error && (
        <Alert
          message="Ошибка загрузки данных"
          description={`Не удалось загрузить счета. ${error instanceof Error ? error.message : 'Пожалуйста, проверьте подключение к интернету и попробуйте обновить страницу.'}`}
          type="error"
          icon={<ExclamationCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          }
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего: ${total} счетов`,
          }}
          scroll={{ x: 'max-content' }}
          tableLayout="auto"
        />
      </Card>
    </div>
  );
}