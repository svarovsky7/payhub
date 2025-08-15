import { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Typography,
  Space,
  Card,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Input,
  Alert,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

interface ApprovalPageProps {
  title: string;
  queryKey: string;
  fetchInvoices: () => Promise<Invoice[]>;
  onApprove: (id: number) => Promise<Invoice>;
  onReject: (id: number, reason?: string) => Promise<Invoice>;
  approveText?: string;
  rejectText?: string;
  showApprovalActions?: boolean;
}

export function ApprovalPage({
  title,
  queryKey,
  fetchInvoices,
  onApprove,
  onReject,
  approveText = 'Согласовать',
  rejectText = 'Отклонить',
  showApprovalActions = true,
}: ApprovalPageProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  // Fetch invoices for this approval stage
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchInvoices,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Log error details for debugging
  if (error) {
    console.error(`Error fetching ${queryKey}:`, error);
  }

  // Mutations
  const approveMutation = useMutation({
    mutationFn: onApprove,
    onSuccess: () => {
      // Invalidate all approval pages to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['director-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['supply-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Счет успешно согласован');
    },
    onError: (error) => {
      console.error('Failed to approve invoice:', error);
      message.error('Ошибка при согласовании счета');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => onReject(id, reason),
    onSuccess: () => {
      // Invalidate all approval pages to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['director-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['supply-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Счет отклонен');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedInvoice(null);
    },
    onError: (error) => {
      console.error('Failed to reject invoice:', error);
      message.error('Ошибка при отклонении счета');
    },
  });

  const handleApprove = (invoice: Invoice) => {
    approveMutation.mutate(invoice.id);
  };

  const handleReject = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedInvoice) {
      rejectMutation.mutate({ id: selectedInvoice.id, reason: rejectReason });
    }
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const getStatusTag = (status: string | null) => {
    const statusConfig = {
      draft: { color: 'default', text: 'Черновик' },
      rukstroy_review: { color: 'processing', text: 'На согласовании Рукстроя' },
      director_review: { color: 'processing', text: 'На согласовании Директора' },
      supply_review: { color: 'processing', text: 'На согласовании Снабжения' },
      in_payment: { color: 'warning', text: 'В оплате' },
      paid: { color: 'success', text: 'Оплачено' },
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
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="Просмотр"
          />
          {showApprovalActions && (
            <>
              <Popconfirm
                title={`${approveText}?`}
                description={`Вы уверены, что хотите ${approveText.toLowerCase()} этот счет?`}
                onConfirm={() => handleApprove(record)}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  style={{ color: '#52c41a' }}
                  title={approveText}
                />
              </Popconfirm>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                danger
                onClick={() => handleReject(record)}
                title={rejectText}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>{title}</Title>
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
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* View Invoice Modal */}
      <Modal
        title={`Счет № ${selectedInvoice?.invoice_number}`}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Закрыть
          </Button>,
          showApprovalActions && (
            <Space key="actions">
              <Popconfirm
                title={`${approveText}?`}
                onConfirm={() => {
                  handleApprove(selectedInvoice!);
                  setIsViewModalOpen(false);
                }}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="primary" icon={<CheckOutlined />}>
                  {approveText}
                </Button>
              </Popconfirm>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleReject(selectedInvoice!);
                }}
              >
                {rejectText}
              </Button>
            </Space>
          ),
        ].filter(Boolean)}
        width={700}
      >
        {selectedInvoice && (
          <div>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Номер счета</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedInvoice.invoice_number}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Дата</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {selectedInvoice.invoice_date ? dayjs(selectedInvoice.invoice_date).format('DD.MM.YYYY') : '-'}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Поставщик</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedInvoice.contractor?.name}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Плательщик</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedInvoice.payer?.name}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Проект</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedInvoice.project?.name}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Сумма</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                  }).format(selectedInvoice.total_amount)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Статус</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{getStatusTag(selectedInvoice.status)}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: 12 }}>Дата создания</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {dayjs(selectedInvoice.created_at).format('DD.MM.YYYY HH:mm')}
                </div>
              </Col>
              <Col span={24}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Описание</div>
                <div style={{ padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 14 }}>
                  {selectedInvoice.description || 'Описание не указано'}
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Reject Invoice Modal */}
      <Modal
        title="Отклонить счет"
        open={isRejectModalOpen}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectReason('');
          setSelectedInvoice(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsRejectModalOpen(false);
              setRejectReason('');
              setSelectedInvoice(null);
            }}
          >
            Отмена
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={rejectMutation.isPending}
            onClick={handleConfirmReject}
          >
            Отклонить
          </Button>,
        ]}
      >
        <div>
          <p>Вы собираетесь отклонить счет № {selectedInvoice?.invoice_number}</p>
          <TextArea
            rows={4}
            placeholder="Укажите причину отклонения (необязательно)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}