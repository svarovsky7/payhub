import { useState, useEffect } from 'react';
import { Modal, Typography, Card, Input, Button, Space, Alert, Upload, message } from 'antd';
import { 
  ExclamationCircleOutlined, 
  ArrowRightOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';

import type { Invoice, InvoiceStatus } from '@/shared/types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface StatusUpdateModalProps {
  visible: boolean;
  invoice: Invoice | null;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus | null;
  columnConfig: Array<{
    id: string;
    title: string;
    status: InvoiceStatus;
    color: string;
    bgColor: string;
  }>;
  onConfirm: (comment?: string, paymentFile?: File) => void;
  onCancel: () => void;
}

export function StatusUpdateModal({
  visible,
  invoice,
  fromStatus,
  toStatus,
  columnConfig,
  onConfirm,
  onCancel,
}: StatusUpdateModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [paymentFile, setPaymentFile] = useState<File | undefined>();

  const isPaymentTransition = fromStatus === 'in_payment' && toStatus === 'paid';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setComment('');
      setFileList([]);
      setPaymentFile(undefined);
      setLoading(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    console.log('=== StatusUpdateModal handleConfirm ===');
    console.log('Is payment transition:', isPaymentTransition);
    console.log('Payment file:', paymentFile);
    console.log('From status:', fromStatus);
    console.log('To status:', toStatus);
    
    // Check if payment document is required
    if (isPaymentTransition && !paymentFile) {
      console.error('Blocking confirm - no payment file for payment transition');
      message.error('Пожалуйста, приложите платежное поручение');
      return;
    }

    setLoading(true);
    try {
      console.log('Calling onConfirm with:', { comment: comment.trim() || undefined, paymentFile });
      await onConfirm(comment.trim() || undefined, paymentFile);
      setComment('');
      setFileList([]);
      setPaymentFile(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setComment('');
    setFileList([]);
    setPaymentFile(undefined);
    onCancel();
  };

  if (!invoice || !fromStatus || !toStatus) {
    return null;
  }

  const fromColumn = columnConfig.find(col => col.status === fromStatus);
  const toColumn = columnConfig.find(col => col.status === toStatus);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusChangeType = () => {
    if (toStatus === 'rejected') {
      return 'rejection';
    }
    if (fromStatus === 'draft' && toStatus === 'rukstroy_review') {
      return 'submission';
    }
    return 'approval';
  };

  const getModalTitle = () => {
    const changeType = getStatusChangeType();
    switch (changeType) {
      case 'rejection':
        return 'Отклонить счет';
      case 'submission':
        return 'Отправить на согласование';
      default:
        return 'Изменить статус счета';
    }
  };

  const getConfirmText = () => {
    const changeType = getStatusChangeType();
    switch (changeType) {
      case 'rejection':
        return 'Отклонить';
      case 'submission':
        return 'Отправить';
      default:
        return 'Подтвердить';
    }
  };

  const getAlertType = () => {
    if (toStatus === 'rejected') return 'error';
    if (isPaymentTransition) return 'warning';
    if (toStatus === 'paid') return 'success';
    return 'info';
  };

  const getAlertMessage = () => {
    if (isPaymentTransition) {
      return 'Для перевода счета в статус "Оплачено" необходимо приложить платежное поручение';
    }
    const changeType = getStatusChangeType();
    switch (changeType) {
      case 'rejection':
        return 'Вы уверены, что хотите отклонить этот счет?';
      case 'submission':
        return 'Счет будет отправлен на согласование. Продолжить?';
      default:
        return 'Вы уверены, что хотите изменить статус этого счета?';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          {getModalTitle()}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Отмена
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          danger={toStatus === 'rejected'}
          loading={loading}
          onClick={handleConfirm}
          disabled={isPaymentTransition && !paymentFile}
        >
          {getConfirmText()}
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message={getAlertMessage()}
          type={getAlertType()}
          showIcon
        />

        <Card size="small" className="invoice-summary">
          <div className="invoice-header">
            <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              {invoice.invoice_number}
            </Title>
          </div>
          
          <div className="invoice-details">
            <div className="detail-row">
              <Text type="secondary">Сумма:</Text>
              <Text strong style={{ fontSize: '16px' }}>
                {formatAmount(invoice.total_amount)}
              </Text>
            </div>
            
            <div className="detail-row">
              <Text type="secondary">Поставщик:</Text>
              <Text>{invoice.contractor?.name || 'Не указан'}</Text>
            </div>
            
            <div className="detail-row">
              <Text type="secondary">Проект:</Text>
              <Text>{invoice.project?.name || 'Не указан'}</Text>
            </div>

            {invoice.description && (
              <div className="detail-row">
                <Text type="secondary">Описание:</Text>
                <Text>{invoice.description}</Text>
              </div>
            )}
          </div>
        </Card>

        <Card size="small" className="status-change">
          <Title level={5} style={{ marginBottom: 16 }}>
            Изменение статуса
          </Title>
          
          <div className="status-flow">
            <div className="status-item">
              <div 
                className="status-badge"
                style={{ 
                  backgroundColor: fromColumn?.bgColor,
                  borderColor: fromColumn?.color,
                  color: fromColumn?.color,
                }}
              >
                {fromColumn?.title}
              </div>
            </div>
            
            <ArrowRightOutlined style={{ margin: '0 16px', color: '#8c8c8c' }} />
            
            <div className="status-item">
              <div 
                className="status-badge"
                style={{ 
                  backgroundColor: toColumn?.bgColor,
                  borderColor: toColumn?.color,
                  color: toColumn?.color,
                }}
              >
                {toColumn?.title}
              </div>
            </div>
          </div>
        </Card>

        {isPaymentTransition && (
          <div className="payment-document-section">
            <Title level={5} style={{ marginBottom: 8 }}>
              Платежное поручение <span style={{ color: '#ff4d4f' }}>*</span>
            </Title>
            <Dragger
              name="file"
              fileList={fileList}
              beforeUpload={(file) => {
                console.log('File selected:', file.name, file.size, file.type);
                setPaymentFile(file);
                setFileList([file]);
                return false; // Prevent auto upload
              }}
              onRemove={() => {
                console.log('File removed');
                setPaymentFile(undefined);
                setFileList([]);
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
        )}

        <div className="comment-section">
          <Title level={5} style={{ marginBottom: 8 }}>
            Комментарий {toStatus === 'rejected' ? '(обязательно)' : '(необязательно)'}
          </Title>
          <TextArea
            placeholder={
              toStatus === 'rejected' 
                ? 'Укажите причину отклонения...'
                : 'Добавьте комментарий к изменению статуса...'
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            showCount
          />
        </div>
      </Space>

      <style>{`
        .invoice-summary {
          border: 1px solid #d9d9d9;
        }

        .invoice-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;
        }

        .invoice-details {
          space-y: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .status-change {
          border: 1px solid #d9d9d9;
        }

        .status-flow {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-item {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .status-badge {
          padding: 8px 16px;
          border-radius: 6px;
          border: 2px solid;
          font-weight: 500;
          text-align: center;
          min-width: 140px;
        }

        .comment-section {
          margin-top: 8px;
        }

        .payment-document-section {
          margin-top: 8px;
        }

        .ant-upload-drag {
          border: 1px dashed #d9d9d9 !important;
          border-radius: 6px;
          background: #fafafa;
          transition: all 0.3s;
        }

        .ant-upload-drag:hover {
          border-color: #1890ff !important;
        }

        .ant-upload-drag-icon .anticon {
          font-size: 48px;
          color: #1890ff;
        }
      `}</style>
    </Modal>
  );
}