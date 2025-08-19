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
  EditOutlined,
} from '@ant-design/icons';
import { InvoiceActions } from '@/shared/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { InvoiceViewModal } from '@/pages/invoices/components/invoice-view-modal';

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
    onSuccess: async () => {
      // Show success message immediately
      message.success('Счет успешно согласован');
      
      // Small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate all approval pages to ensure data consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['director-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['supply-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['paid-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
    onError: (error) => {
      console.error('Failed to approve invoice:', error);
      message.error('Ошибка при согласовании счета');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => onReject(id, reason),
    onSuccess: async () => {
      // Show success message and close modal immediately
      message.success('Счет отклонен');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedInvoice(null);
      
      // Small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate all approval pages to ensure data consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['director-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['supply-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['paid-invoices'] }),
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
          onApprove={showApprovalActions ? handleApprove : undefined}
          onEdit={undefined}
          onDelete={undefined}
          onReject={handleReject}
          onView={handleView}
          size="small"
          showApprove={showApprovalActions}
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
          scroll={{ x: 'max-content' }}
          tableLayout="auto"
        />
      </Card>

      {/* Invoice View Modal */}
      <InvoiceViewModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice && !isRejectModalOpen}
        onClose={() => setSelectedInvoice(null)}
      />

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