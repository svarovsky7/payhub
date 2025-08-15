import { useState } from 'react';
import { 
  Modal, 
  Card, 
  Typography, 
  Descriptions, 
  Table, 
  Tag, 
  Space, 
  Button,
  Divider,
  Avatar,
  Timeline,
} from 'antd';
import { 
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

import type { Invoice, InvoiceStatus } from '@/shared/types';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

interface QuickViewModalProps {
  invoice: Invoice;
  visible: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<InvoiceStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: 'Черновик' },
  rukstroy_review: { color: 'blue', label: 'Согласование Рукстроя' },
  director_review: { color: 'purple', label: 'Согласование Директора' },
  supply_review: { color: 'orange', label: 'Согласование Снабжения' },
  in_payment: { color: 'gold', label: 'В Оплате' },
  paid: { color: 'green', label: 'Оплачено' },
  rejected: { color: 'red', label: 'Отказано' },
};

export function QuickViewModal({ invoice, visible, onClose }: QuickViewModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'timeline'>('details');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getTimelineData = () => {
    const items = [
      {
        children: (
          <div>
            <Text strong>Счет создан</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(invoice.created_at).format('DD.MM.YYYY HH:mm')}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Создал: {invoice.creator?.full_name || 'Неизвестен'}
            </Text>
          </div>
        ),
        color: 'gray',
      },
    ];

    if (invoice.updated_at !== invoice.created_at) {
      items.push({
        children: (
          <div>
            <Text strong>Последнее обновление</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(invoice.updated_at).format('DD.MM.YYYY HH:mm')}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(invoice.updated_at).fromNow()}
            </Text>
          </div>
        ),
        color: 'blue',
      });
    }

    return items;
  };

  const itemColumns = [
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '15%',
      render: (value: number) => value?.toLocaleString('ru-RU'),
    },
    {
      title: 'Единица',
      dataIndex: 'unit',
      key: 'unit',
      width: '15%',
      render: (unit: { abbreviation?: string; name?: string } | null) => unit?.abbreviation || unit?.name || '-',
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: '15%',
      render: (value: number) => formatAmount(value),
    },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: '15%',
      render: (value: number) => formatAmount(value),
    },
  ];

  const tabItems = [
    {
      key: 'details',
      label: 'Детали',
      icon: <FileTextOutlined />,
    },
    {
      key: 'items',
      label: `Позиции (${invoice.invoice_items?.length || 0})`,
      icon: <DollarCircleOutlined />,
    },
    {
      key: 'timeline',
      label: 'История',
      icon: <ClockCircleOutlined />,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span>Просмотр счета {invoice.invoice_number}</span>
          <Tag color={STATUS_CONFIG[invoice.status || 'draft'].color}>
            {STATUS_CONFIG[invoice.status || 'draft'].label}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
        <Button key="edit" type="primary" icon={<EditOutlined />}>
          Редактировать
        </Button>,
      ]}
      width={800}
    >
      <div className="quick-view-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          {tabItems.map((item) => (
            <Button
              key={item.key}
              type={activeTab === item.key ? 'primary' : 'default'}
              icon={item.icon}
              onClick={() => setActiveTab(item.key as 'details' | 'items' | 'timeline')}
              style={{ marginRight: 8 }}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="details-tab">
            <Card title="Основная информация" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Номер счета">
                  <Text strong>{invoice.invoice_number}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Дата счета">
                  {invoice.invoice_date ? 
                    dayjs(invoice.invoice_date).format('DD.MM.YYYY') : 
                    'Не указана'
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Общая сумма">
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    {formatAmount(invoice.total_amount)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Статус">
                  <Tag color={STATUS_CONFIG[invoice.status || 'draft'].color}>
                    {STATUS_CONFIG[invoice.status || 'draft'].label}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Контрагенты и проект" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Поставщик">
                  <div>
                    <Text strong>{invoice.contractor?.name || 'Не указан'}</Text>
                    {invoice.contractor?.inn && (
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ИНН: {invoice.contractor.inn}
                        </Text>
                      </div>
                    )}
                    {invoice.contractor?.kpp && (
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          КПП: {invoice.contractor.kpp}
                        </Text>
                      </div>
                    )}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Плательщик">
                  <Text strong>{invoice.payer?.name || 'Не указан'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Проект">
                  <Text strong>{invoice.project?.name || 'Не указан'}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {invoice.description && (
              <Card title="Описание" size="small" style={{ marginBottom: 16 }}>
                <Paragraph style={{ margin: 0 }}>
                  {invoice.description}
                </Paragraph>
              </Card>
            )}

            <Card title="Системная информация" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Создан">
                  <div>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {dayjs(invoice.created_at).format('DD.MM.YYYY HH:mm')}
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(invoice.created_at).fromNow()}
                    </Text>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Обновлен">
                  <div>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {dayjs(invoice.updated_at).format('DD.MM.YYYY HH:mm')}
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(invoice.updated_at).fromNow()}
                    </Text>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Автор" span={2}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar size={24} icon={<UserOutlined />} style={{ marginRight: 8 }} />
                    <Text>{invoice.creator?.full_name || 'Неизвестен'}</Text>
                  </div>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="items-tab">
            <Table
              dataSource={invoice.invoice_items || []}
              columns={itemColumns}
              size="small"
              pagination={false}
              rowKey="id"
              summary={(pageData) => {
                const total = pageData.reduce((sum, item) => sum + (item.total_price || 0), 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Text strong>Итого:</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong>{formatAmount(total)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <Card title="История изменений" size="small">
              <Timeline items={getTimelineData()} />
            </Card>
          </div>
        )}
      </div>

      <style>{`
        .quick-view-content {
          max-height: 60vh;
          overflow-y: auto;
        }

        .tab-navigation {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .details-tab,
        .items-tab,
        .timeline-tab {
          min-height: 200px;
        }

        .quick-view-content::-webkit-scrollbar {
          width: 6px;
        }

        .quick-view-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .quick-view-content::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .quick-view-content::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </Modal>
  );
}