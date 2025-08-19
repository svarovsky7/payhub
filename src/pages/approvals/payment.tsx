import { useState } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Typography, 
  Space, 
  Card, 
  message, 
  Row, 
  Col,
  Upload,
  Alert,
  Tag
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { invoiceApi, attachmentApi } from '@/entities';
import { supabase } from '@/shared/api/supabase';
import { InvoiceViewModal } from '@/pages/invoices/components/invoice-view-modal';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export function PaymentPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [paymentFile, setPaymentFile] = useState<File | undefined>();
  const queryClient = useQueryClient();

  // Fetch invoices in payment status
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['payment-invoices'],
    queryFn: () => invoiceApi.getByStatus('in_payment'),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Mutation for marking as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      console.log('Marking as paid with payment document:', file.name);
      
      // Upload payment document first
      const attachment = await attachmentApi.upload(file, id);
      
      // Link to invoice
      const { error: linkError } = await supabase
        .from('invoice_documents')
        .insert({
          invoice_id: id,
          attachment_id: attachment.id,
        });
      
      if (linkError) throw linkError;
      
      // Update status to paid
      return invoiceApi.approve(id, 'in_payment');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Счет успешно оплачен');
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setFileList([]);
      setPaymentFile(undefined);
    },
    onError: (error) => {
      console.error('Failed to mark as paid:', error);
      message.error('Ошибка при оплате счета');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      invoiceApi.reject(id, 'in_payment', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Счет отклонен');
    },
    onError: (error) => {
      console.error('Failed to reject invoice:', error);
      message.error('Ошибка при отклонении счета');
    },
  });

  const handleMarkAsPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice || !paymentFile) {
      message.error('Необходимо приложить платежное поручение');
      return;
    }
    markAsPaidMutation.mutate({ id: selectedInvoice.id, file: paymentFile });
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
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
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            style={{ color: '#52c41a' }}
            onClick={() => handleMarkAsPaid(record)}
            title="Отметить как оплачено"
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            danger
            onClick={() => rejectMutation.mutate({ id: record.id })}
            title="Отклонить"
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>В Оплате</Title>
        </Col>
        <Col>
          <Tag color="processing">
            Всего счетов: {invoices.length}
          </Tag>
        </Col>
      </Row>

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

      {/* Payment Modal */}
      <Modal
        title="Подтверждение оплаты"
        open={isPaymentModalOpen}
        onCancel={() => {
          setIsPaymentModalOpen(false);
          setFileList([]);
          setPaymentFile(undefined);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsPaymentModalOpen(false);
              setFileList([]);
              setPaymentFile(undefined);
            }}
          >
            Отмена
          </Button>,
          <Button 
            key="confirm" 
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleConfirmPayment}
            disabled={!paymentFile}
            loading={markAsPaidMutation.isPending}
          >
            Подтвердить оплату
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Для подтверждения оплаты необходимо приложить платежное поручение"
            type="warning"
            showIcon
          />
          
          {selectedInvoice && (
            <Card size="small">
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Text type="secondary">Счет:</Text> {selectedInvoice.invoice_number}
                </Col>
                <Col span={12}>
                  <Text type="secondary">Сумма:</Text> {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                  }).format(selectedInvoice.total_amount)}
                </Col>
                <Col span={24}>
                  <Text type="secondary">Поставщик:</Text> {selectedInvoice.contractor?.name}
                </Col>
              </Row>
            </Card>
          )}

          <div>
            <Title level={5} style={{ marginBottom: 8 }}>
              Платежное поручение <span style={{ color: '#ff4d4f' }}>*</span>
            </Title>
            <Dragger
              name="file"
              fileList={fileList}
              beforeUpload={(file) => {
                setPaymentFile(file);
                setFileList([file]);
                return false;
              }}
              onRemove={() => {
                setPaymentFile(undefined);
                setFileList([]);
              }}
              onPreview={(file) => {
                // Если у файла есть URL, открываем его
                if (file.url || file.originFileObj) {
                  const url = file.url || URL.createObjectURL(file.originFileObj as Blob);
                  window.open(url, '_blank');
                }
              }}
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: true,
                showDownloadIcon: false,
                previewIcon: <EyeOutlined title="Просмотр файла" />,
              }}
              maxCount={1}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Нажмите или перетащите файл платежного поручения
              </p>
              <p className="ant-upload-hint">
                Поддерживаются форматы: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG
              </p>
            </Dragger>
          </div>
        </Space>
      </Modal>

      {/* Invoice View Modal */}
      <InvoiceViewModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice && !isPaymentModalOpen}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}