import { Draggable } from '@hello-pangea/dnd';
import { Card, Typography, Tag, Tooltip, Avatar, Space } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

import type { Invoice } from '@/shared/types';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text } = Typography;

interface KanbanCardProps {
  invoice: Invoice;
  index: number;
  onClick: () => void;
}

export function KanbanCard({ invoice, index, onClick }: KanbanCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysInStatus = () => {
    const now = dayjs();
    const updatedAt = dayjs(invoice.updated_at);
    return now.diff(updatedAt, 'day');
  };

  const getUrgencyColor = () => {
    const daysInStatus = getDaysInStatus();
    if (daysInStatus >= 7) return '#ff4d4f'; // Red for 7+ days
    if (daysInStatus >= 3) return '#fa8c16'; // Orange for 3-6 days
    return '#52c41a'; // Green for 0-2 days
  };

  const getPriorityIndicator = () => {
    const amount = invoice.total_amount;
    if (amount >= 1000000) {
      return { color: '#ff4d4f', level: 'Критичный', icon: '#ff4d4f' };
    } else if (amount >= 500000) {
      return { color: '#fa8c16', level: 'Высокий', icon: '#fa8c16' };
    } else if (amount >= 100000) {
      return { color: '#fadb14', level: 'Средний', icon: '#fadb14' };
    }
    return { color: '#52c41a', level: 'Низкий', icon: '#52c41a' };
  };

  const getCardBorderColor = () => {
    const priority = getPriorityIndicator();
    const urgency = getUrgencyColor();
    
    // High priority or urgent items get colored border
    if (priority.color === '#ff4d4f' || urgency === '#ff4d4f') {
      return '#ff4d4f';
    }
    if (priority.color === '#fa8c16' || urgency === '#fa8c16') {
      return '#fa8c16';
    }
    return '#d9d9d9';
  };

  const getUrgencyText = () => {
    const daysInStatus = getDaysInStatus();
    if (daysInStatus === 0) return 'Сегодня';
    if (daysInStatus === 1) return '1 день';
    if (daysInStatus < 5) return `${daysInStatus} дня`;
    return `${daysInStatus} дней`;
  };

  return (
    <Draggable draggableId={invoice.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-card-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
          onClick={onClick}
        >
          <Card
            size="small"
            className="kanban-card"
            hoverable
            styles={{
              body: { padding: '12px' },
            }}
            style={{
              borderColor: getCardBorderColor(),
              borderWidth: getCardBorderColor() !== '#d9d9d9' ? '2px' : '1px',
            }}
          >
            <div className="card-header">
              <div className="invoice-number">
                <FileTextOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                <Text strong>{invoice.invoice_number}</Text>
              </div>
              <Space size={4}>
                <Tooltip title={`Приоритет: ${getPriorityIndicator().level}`}>
                  <FlagOutlined style={{ color: getPriorityIndicator().icon, fontSize: '12px' }} />
                </Tooltip>
                <Tag color={getUrgencyColor()} style={{ margin: 0, fontSize: '11px' }}>
                  <ClockCircleOutlined style={{ marginRight: 2 }} />
                  {getUrgencyText()}
                </Tag>
              </Space>
            </div>

            <div className="card-amount">
              <Space align="center">
                <DollarOutlined style={{ color: getPriorityIndicator().icon }} />
                <Text strong style={{ fontSize: '16px', color: getPriorityIndicator().icon }}>
                  {formatAmount(invoice.total_amount)}
                </Text>
              </Space>
            </div>

            <div className="card-details">
              <Tooltip title={invoice.contractor?.name}>
                <div className="detail-item">
                  <Text type="secondary" style={{ fontSize: '11px' }}>Поставщик:</Text>
                  <Text className="detail-value" ellipsis>
                    {invoice.contractor?.name || 'Не указан'}
                  </Text>
                </div>
              </Tooltip>

              {invoice.project?.name && (
                <Tooltip title={invoice.project.name}>
                  <div className="detail-item">
                    <Text type="secondary" style={{ fontSize: '11px' }}>Проект:</Text>
                    <Text className="detail-value" ellipsis>
                      {invoice.project.name}
                    </Text>
                  </div>
                </Tooltip>
              )}

              <div className="detail-item">
                <CalendarOutlined style={{ marginRight: 4, color: '#8c8c8c', fontSize: '11px' }} />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {dayjs(invoice.invoice_date || invoice.created_at).format('DD.MM.YYYY')}
                </Text>
              </div>
            </div>

            {invoice.description && (
              <div className="card-description">
                <Tooltip title={invoice.description}>
                  <Text 
                    type="secondary"
                    style={{ 
                      fontSize: '11px', 
                      display: 'block',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {invoice.description}
                  </Text>
                </Tooltip>
              </div>
            )}

            <div className="card-footer">
              <Tooltip title={`Создал: ${invoice.creator?.full_name || 'Неизвестен'}`}>
                <div className="creator-info">
                  <Avatar 
                    size={14} 
                    icon={<UserOutlined />}
                    style={{ marginRight: 4 }}
                  />
                  <Text type="secondary" style={{ fontSize: '10px' }} ellipsis>
                    {(invoice.creator?.full_name || 'Неизвестен').split(' ')[0]}
                  </Text>
                </div>
              </Tooltip>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {dayjs(invoice.updated_at).fromNow()}
              </Text>
            </div>
          </Card>

          <style>{`
            .kanban-card-wrapper {
              margin-bottom: 8px;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .kanban-card-wrapper:hover {
              transform: translateY(-1px);
            }

            .kanban-card-wrapper.dragging {
              transform: rotate(3deg) scale(1.02);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
              z-index: 1000;
            }

            .kanban-card {
              border-radius: 8px;
              transition: all 0.2s ease;
              overflow: hidden;
            }

            .kanban-card:hover {
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
            }

            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 10px;
            }

            .invoice-number {
              display: flex;
              align-items: center;
              flex: 1;
              min-width: 0;
            }

            .card-amount {
              margin-bottom: 12px;
              text-align: center;
              padding: 8px;
              background: linear-gradient(135deg, #f6f9fc 0%, #f1f5f9 100%);
              border-radius: 6px;
              border: 1px solid #e6f0ff;
            }

            .card-details {
              margin-bottom: 10px;
              space-y: 6px;
            }

            .detail-item {
              margin-bottom: 6px;
            }

            .detail-item:last-child {
              margin-bottom: 0;
              display: flex;
              align-items: center;
            }

            .detail-value {
              font-size: 12px;
              font-weight: 500;
              color: #262626;
              display: block;
              margin-top: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .card-description {
              margin-bottom: 10px;
              padding: 6px 8px;
              background: #fafafa;
              border-radius: 4px;
              border-left: 3px solid #1890ff;
            }

            .card-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 8px;
              border-top: 1px solid #f0f0f0;
              margin-top: 8px;
            }

            .creator-info {
              display: flex;
              align-items: center;
              flex: 1;
              min-width: 0;
              max-width: 60%;
            }
            
            @media (max-width: 768px) {
              .card-amount {
                padding: 6px;
              }
              
              .detail-value {
                font-size: 11px;
              }
              
              .card-description {
                padding: 4px 6px;
              }
            }
          `}</style>
        </div>
      )}
    </Draggable>
  );
}