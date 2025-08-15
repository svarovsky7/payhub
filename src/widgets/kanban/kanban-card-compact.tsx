import { Draggable } from '@hello-pangea/dnd';
import { Card, Typography, Tag, Tooltip, Space } from 'antd';
import { 
  FileTextOutlined, 
  FlagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Invoice } from '@/shared/types';
import type { CardFieldSettings } from './card-settings-modal';

const { Text } = Typography;

interface KanbanCardCompactProps {
  invoice: Invoice;
  index: number;
  onClick: () => void;
  settings: CardFieldSettings;
  compactMode: boolean;
}

export function KanbanCardCompact({ 
  invoice, 
  index, 
  onClick, 
  settings,
  compactMode 
}: KanbanCardCompactProps) {
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
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
    if (daysInStatus >= 7) return '#ff4d4f';
    if (daysInStatus >= 3) return '#fa8c16';
    return '#52c41a';
  };

  const getPriorityColor = () => {
    const amount = invoice.total_amount;
    if (amount >= 1000000) return '#ff4d4f';
    if (amount >= 500000) return '#fa8c16';
    if (amount >= 100000) return '#fadb14';
    return '#52c41a';
  };

  const cardPadding = compactMode ? '8px' : '12px';
  const fontSize = compactMode ? '11px' : '12px';
  const amountSize = compactMode ? '14px' : '16px';

  return (
    <Draggable draggableId={invoice.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-card-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
          onClick={onClick}
          style={{ marginBottom: compactMode ? '4px' : '8px' }}
        >
          <Card
            size="small"
            className="kanban-card-compact"
            hoverable
            styles={{
              body: { padding: cardPadding },
            }}
            style={{
              borderRadius: '6px',
              borderLeft: `3px solid ${getPriorityColor()}`,
            }}
          >
            {/* Header with invoice number and indicators */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: compactMode ? '4px' : '8px'
            }}>
              <Space size={4}>
                <FileTextOutlined style={{ color: '#1890ff', fontSize }} />
                <Text strong style={{ fontSize }}>
                  {invoice.invoice_number}
                </Text>
              </Space>
              
              <Space size={4}>
                {settings.priority && (
                  <Tooltip title="Приоритет">
                    <FlagOutlined style={{ color: getPriorityColor(), fontSize: '10px' }} />
                  </Tooltip>
                )}
                {settings.urgency && (
                  <Tag 
                    color={getUrgencyColor()} 
                    style={{ 
                      margin: 0, 
                      fontSize: '10px',
                      padding: '0 4px',
                      lineHeight: '16px'
                    }}
                  >
                    {getDaysInStatus()}д
                  </Tag>
                )}
              </Space>
            </div>

            {/* Amount */}
            {settings.amount && (
              <div style={{ 
                textAlign: 'center', 
                marginBottom: compactMode ? '4px' : '8px',
                padding: compactMode ? '4px' : '6px',
                background: '#f0f5ff',
                borderRadius: '4px'
              }}>
                <Text strong style={{ fontSize: amountSize, color: '#1890ff' }}>
                  {formatAmount(invoice.total_amount)} ₽
                </Text>
              </div>
            )}

            {/* Contractor */}
            {settings.contractor && (
              <div style={{ marginBottom: compactMode ? '2px' : '4px' }}>
                <Tooltip title={invoice.contractor?.name}>
                  <Text 
                    ellipsis 
                    style={{ fontSize, display: 'block' }}
                  >
                    {invoice.contractor?.name || 'Не указан'}
                  </Text>
                </Tooltip>
              </div>
            )}

            {/* Payer */}
            {settings.payer && invoice.payer && (
              <div style={{ marginBottom: compactMode ? '2px' : '4px' }}>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  Плательщик: 
                </Text>
                <Tooltip title={invoice.payer.name}>
                  <Text 
                    ellipsis 
                    style={{ fontSize: '11px', display: 'block' }}
                  >
                    {invoice.payer.name}
                  </Text>
                </Tooltip>
              </div>
            )}

            {/* Project */}
            {settings.project && invoice.project && (
              <div style={{ marginBottom: compactMode ? '2px' : '4px' }}>
                <Tooltip title={invoice.project.name}>
                  <Tag 
                    style={{ 
                      fontSize: '10px', 
                      margin: 0,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {invoice.project.name}
                  </Tag>
                </Tooltip>
              </div>
            )}

            {/* Date */}
            {settings.date && (
              <div style={{ marginBottom: compactMode ? '2px' : '4px' }}>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  {dayjs(invoice.invoice_date || invoice.created_at).format('DD.MM.YY')}
                </Text>
              </div>
            )}

            {/* Description */}
            {settings.description && invoice.description && (
              <Tooltip title={invoice.description}>
                <div style={{ 
                  padding: '2px 4px',
                  background: '#fafafa',
                  borderRadius: '2px',
                  marginBottom: compactMode ? '2px' : '4px'
                }}>
                  <Text 
                    type="secondary"
                    style={{ 
                      fontSize: '10px',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {invoice.description}
                  </Text>
                </div>
              </Tooltip>
            )}

            {/* VAT Info */}
            {settings.vatInfo && invoice.vat_amount && (
              <div style={{ marginBottom: compactMode ? '2px' : '4px' }}>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  НДС: {formatAmount(invoice.vat_amount)} ₽
                </Text>
              </div>
            )}

            {/* Footer with creator and updated time */}
            {(settings.creator || settings.updatedTime) && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: compactMode ? '4px' : '6px',
                borderTop: '1px solid #f0f0f0',
                marginTop: compactMode ? '4px' : '6px'
              }}>
                {settings.creator && (
                  <Text type="secondary" style={{ fontSize: '9px' }}>
                    {invoice.creator?.full_name?.split(' ')[0] || '-'}
                  </Text>
                )}
                {settings.updatedTime && (
                  <Text type="secondary" style={{ fontSize: '9px' }}>
                    {dayjs(invoice.updated_at).fromNow()}
                  </Text>
                )}
              </div>
            )}
          </Card>

          <style>{`
            .kanban-card-wrapper {
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

            .kanban-card-compact {
              transition: all 0.2s ease;
            }

            .kanban-card-compact:hover {
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
          `}</style>
        </div>
      )}
    </Draggable>
  );
}