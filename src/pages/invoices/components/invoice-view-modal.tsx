import { useState } from 'react';
import { Modal, Tag, Space, Typography, Divider, Button, Row, Col, Card, List, Tooltip } from 'antd';
import { 
  FileTextOutlined, 
  BankOutlined,
  ShopOutlined,
  ProjectOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { Invoice, Attachment } from '@/shared/types';
import { attachmentApi } from '@/entities';
import { FilePreviewModal } from '@/shared/components';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

const { Text, Title } = Typography;

interface InvoiceViewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
}

export function InvoiceViewModal({ invoice, isOpen, onClose, onEdit }: InvoiceViewModalProps) {
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; mimeType?: string } | null>(null);
  
  if (!invoice) return null;

  const handlePreviewFile = (attachment: Attachment) => {
    const fileUrl = attachmentApi.getPublicUrl(attachment.file_path);
    setPreviewFile({
      url: fileUrl,
      name: attachment.file_name,
      mimeType: attachment.mime_type
    });
  };

  const getStatusConfig = (status: string | null) => {
    const configs = {
      draft: { color: 'default', text: 'Черновик', icon: <FileTextOutlined /> },
      rukstroy_review: { color: 'processing', text: 'Рукстрой', icon: <SyncOutlined spin /> },
      director_review: { color: 'processing', text: 'Директор', icon: <SyncOutlined spin /> },
      supply_review: { color: 'processing', text: 'Снабжение', icon: <SyncOutlined spin /> },
      in_payment: { color: 'warning', text: 'В оплате', icon: <ClockCircleOutlined /> },
      paid: { color: 'success', text: 'Оплачено', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', text: 'Отказано', icon: <CloseCircleOutlined /> },
    };
    return configs[status as keyof typeof configs] || { color: 'default', text: status || 'Не указан', icon: null };
  };

  const statusConfig = getStatusConfig(invoice.status);
  
  // Calculate VAT
  const vatAmount = invoice.total_amount * 0.2;
  const amountWithoutVat = invoice.total_amount - vatAmount;

  return (
    <>
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
        onEdit && (
          <Button key="edit" type="primary" onClick={() => onEdit(invoice)}>
            Редактировать
          </Button>
        ),
      ]}
      styles={{
        body: { padding: 0 },
        header: { padding: 0 }
      }}
    >
      {/* Header with gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px',
        borderRadius: '8px 8px 0 0',
      }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12 }}>
                Счет на оплату
              </Text>
              <Title level={3} style={{ margin: 0, color: '#fff' }}>
                № {invoice.invoice_number}
              </Title>
              {invoice.invoice_date && (
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14 }}>
                  от {dayjs(invoice.invoice_date).locale('ru').format('DD MMMM YYYY')}
                </Text>
              )}
            </Space>
          </Col>
          <Col>
            <Tag 
              color={statusConfig.color} 
              icon={statusConfig.icon}
              style={{ 
                fontSize: 14, 
                padding: '6px 12px',
                borderRadius: 20
              }}
            >
              {statusConfig.text}
            </Tag>
          </Col>
        </Row>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Amount Section */}
        <Card size="small" style={{ marginBottom: 20, borderRadius: 8 }}>
          <Row gutter={24}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Сумма без НДС</Text>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#595959', marginTop: 4 }}>
                  {new Intl.NumberFormat('ru-RU').format(amountWithoutVat)} ₽
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>НДС 20%</Text>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#faad14', marginTop: 4 }}>
                  {new Intl.NumberFormat('ru-RU').format(vatAmount)} ₽
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Итого к оплате</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                  {new Intl.NumberFormat('ru-RU').format(invoice.total_amount)} ₽
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Details Grid */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" title={<><ShopOutlined /> Поставщик</>} style={{ height: '100%' }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 16 }}>
                  {invoice.contractor?.name || 'Не указан'}
                </Text>
                {invoice.contractor?.inn && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    ИНН: {invoice.contractor.inn}
                  </Text>
                )}
              </Space>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card size="small" title={<><BankOutlined /> Плательщик</>} style={{ height: '100%' }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 16 }}>
                  {invoice.payer?.name || 'Не указан'}
                </Text>
                {invoice.payer?.inn && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    ИНН: {invoice.payer.inn}
                  </Text>
                )}
              </Space>
            </Card>
          </Col>

          {invoice.project && (
            <Col span={12}>
              <Card size="small" title={<><ProjectOutlined /> Проект</>}>
                <Text strong style={{ fontSize: 16 }}>
                  {invoice.project.name}
                </Text>
                {invoice.project.address && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {invoice.project.address}
                    </Text>
                  </div>
                )}
              </Card>
            </Col>
          )}

          {invoice.responsible_person && (
            <Col span={12}>
              <Card size="small" title={<><UserOutlined /> Ответственное лицо</>}>
                <Text strong style={{ fontSize: 16 }}>
                  {invoice.responsible_person.full_name}
                </Text>
                {invoice.responsible_person.position && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {invoice.responsible_person.position}
                    </Text>
                  </div>
                )}
              </Card>
            </Col>
          )}
        </Row>

        {/* Description */}
        {invoice.description && (
          <>
            <Divider style={{ margin: '20px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Описание
              </Text>
              <Text style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {invoice.description}
              </Text>
            </div>
          </>
        )}

        {/* Delivery Info */}
        {invoice.delivery_days && (
          <>
            <Divider style={{ margin: '20px 0' }} />
            <Card 
              size="small" 
              style={{ 
                background: invoice.status === 'paid' && invoice.delivery_date ? '#e6f7ff' : '#fafafa',
                border: invoice.status === 'paid' && invoice.delivery_date ? '1px solid #91d5ff' : '1px solid #f0f0f0'
              }}
            >
              <Space>
                <ClockCircleOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                {invoice.status === 'paid' && invoice.delivery_date ? (
                  <div>
                    <Text strong>Дата поставки: </Text>
                    <Text>{dayjs(invoice.delivery_date).format('DD.MM.YYYY')}</Text>
                    {(() => {
                      const daysLeft = Math.ceil((new Date(invoice.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <Tag 
                          color={daysLeft > 0 ? 'success' : daysLeft === 0 ? 'warning' : 'error'}
                          style={{ marginLeft: 8 }}
                        >
                          {daysLeft > 0 ? `Через ${daysLeft} дн.` : daysLeft === 0 ? 'Сегодня' : 'Просрочено'}
                        </Tag>
                      );
                    })()}
                  </div>
                ) : (
                  <Text>Срок поставки: {invoice.delivery_days} календарных дней после оплаты</Text>
                )}
              </Space>
            </Card>
          </>
        )}

        {/* Attachments */}
        {invoice.attachments && invoice.attachments.length > 0 && (
          <>
            <Divider style={{ margin: '20px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                Приложенные файлы ({invoice.attachments.length})
              </Text>
              <List
                size="small"
                dataSource={invoice.attachments}
                renderItem={(attachment) => {
                  const fileUrl = attachmentApi.getPublicUrl(attachment.file_path);
                  const isPdf = attachment.mime_type?.includes('pdf');
                  const isImage = attachment.mime_type?.startsWith('image');
                  
                  return (
                    <List.Item
                      key={attachment.id}
                      style={{
                        background: '#fafafa',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginBottom: 8,
                        border: '1px solid #f0f0f0'
                      }}
                      actions={[
                        <Tooltip title="Просмотр файла" key="view">
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewFile(attachment)}
                          />
                        </Tooltip>,
                        <Tooltip title="Скачать файл" key="download">
                          <Button
                            type="text"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = fileUrl;
                              link.download = attachment.file_name;
                              link.click();
                            }}
                          />
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          isPdf ? (
                            <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                          ) : isImage ? (
                            <FileImageOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                          ) : (
                            <PaperClipOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                          )
                        }
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>{attachment.file_name}</span>
                            {attachment.file_size && (
                              <Tag color="default" style={{ fontSize: 11 }}>
                                {(attachment.file_size / 1024 / 1024).toFixed(2)} МБ
                              </Tag>
                            )}
                          </div>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Загружен: {dayjs(attachment.uploaded_at).format('DD.MM.YYYY HH:mm')}
                          </Text>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          </>
        )}
      </div>
    </Modal>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          mimeType={previewFile.mimeType}
        />
      )}
    </>
  );
}