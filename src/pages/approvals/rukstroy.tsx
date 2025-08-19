import { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Alert,
  message,
  InputNumber,
  Form,
  Space,
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { InvoiceActions } from '@/shared/components';
import { invoiceApi } from '@/entities';
import { InvoiceViewModal } from '@/pages/invoices/components/invoice-view-modal';

const { Title, Text } = Typography;

export function RukstroyApprovalPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch invoices for Rukstroy approval
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['rukstroy-invoices'],
    queryFn: () => invoiceApi.getByStatus('rukstroy_review'),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => 
      invoiceApi.approve(id, 'rukstroy_review', amount),
    onSuccess: async () => {
      message.success('Счет успешно согласован');
      setIsApproveModalOpen(false);
      setSelectedInvoice(null);
      form.resetFields();
      
      // Small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['director-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
    onError: (error) => {
      console.error('Failed to approve invoice:', error);
      message.error('Ошибка при согласовании счета');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      invoiceApi.reject(id, 'rukstroy_review', reason),
    onSuccess: async () => {
      message.success('Счет отклонен');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedInvoice(null);
      
      // Small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
    onError: (error) => {
      console.error('Failed to reject invoice:', error);
      message.error('Ошибка при отклонении счета');
    },
  });

  const handleApprove = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    form.setFieldsValue({
      amount: invoice.total_amount,
    });
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    form.validateFields().then((values) => {
      if (selectedInvoice) {
        approveMutation.mutate({ 
          id: selectedInvoice.id, 
          amount: values.amount 
        });
      }
    });
  };

  const handleReject = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedInvoice) {
      rejectMutation.mutate({ 
        id: selectedInvoice.id, 
        reason: rejectReason 
      });
    }
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const getStatusTag = (status: string | null) => {
    const statusConfig = {
      rukstroy_review: { color: 'processing', text: 'На согласовании Рукстроя' },
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
      title: 'Сумма счета',
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
      title: 'Действия',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <InvoiceActions
          invoice={record}
          onApprove={handleApprove}
          onReject={handleReject}
          onView={handleView}
          size="small"
          showApprove={true}
          showEdit={false}
          showDelete={false}
          showReject={true}
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
          <Title level={2}>Согласование Рукстроя</Title>
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

      {/* Modal for approving with amount */}
      <Modal
        title="Согласование счета"
        open={isApproveModalOpen}
        onOk={handleConfirmApprove}
        onCancel={() => {
          setIsApproveModalOpen(false);
          setSelectedInvoice(null);
          form.resetFields();
        }}
        confirmLoading={approveMutation.isPending}
        okText="Согласовать"
        cancelText="Отмена"
        width={500}
      >
        {selectedInvoice && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Text strong>Счет №{selectedInvoice.invoice_number}</Text>
              <br />
              <Text type="secondary">
                Поставщик: {selectedInvoice.contractor?.name}
              </Text>
              <br />
              <Text type="secondary">
                Сумма счета: {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                }).format(selectedInvoice.total_amount)}
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                amount: selectedInvoice.total_amount,
              }}
            >
              <Form.Item
                name="amount"
                label="Подтвержденная сумма"
                rules={[
                  { required: true, message: 'Укажите подтвержденную сумму' },
                  { 
                    type: 'number', 
                    min: 0.01, 
                    message: 'Сумма должна быть больше 0' 
                  },
                  {
                    type: 'number',
                    max: selectedInvoice.total_amount,
                    message: `Сумма не может превышать сумму счета (${selectedInvoice.total_amount} ₽)`,
                  },
                ]}
                extra="Укажите сумму, которую вы подтверждаете для оплаты"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={(value) => value!.replace(/\s?/g, '')}
                  addonAfter="₽"
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Form>

            <Alert
              message="Внимание"
              description="После согласования счет будет передан на утверждение Директору с указанной вами суммой."
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>

      {/* Modal for rejecting */}
      <Modal
        title="Отклонение счета"
        open={isRejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectReason('');
          setSelectedInvoice(null);
        }}
        confirmLoading={rejectMutation.isPending}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        {selectedInvoice && (
          <div>
            <Text>
              Вы уверены, что хотите отклонить счет №{selectedInvoice.invoice_number}?
            </Text>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Причина отклонения (необязательно):</Text>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #d9d9d9',
                  minHeight: 80,
                }}
                placeholder="Укажите причину отклонения..."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice View Modal */}
      <InvoiceViewModal
        invoice={selectedInvoice}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
}