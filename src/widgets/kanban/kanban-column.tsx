import { Droppable } from '@hello-pangea/dnd';
import { Typography, Badge } from 'antd';

import { KanbanCard } from './kanban-card';
import { KanbanCardCompact } from './kanban-card-compact';
import type { CardFieldSettings } from './card-settings-modal';
import type { Invoice, InvoiceStatus } from '@/shared/types';

const { Text } = Typography;

interface KanbanColumnProps {
  id: InvoiceStatus;
  title: string;
  color: string;
  bgColor: string;
  invoices: Invoice[];
  onCardClick: (invoice: Invoice) => void;
  cardSettings: CardFieldSettings;
  compactMode: boolean;
  viewMode?: 'kanban' | 'stack';
  isTablet?: boolean;
  isMobile?: boolean;
}

export function KanbanColumn({
  id,
  title,
  color,
  bgColor,
  invoices,
  onCardClick,
  cardSettings,
  compactMode,
  viewMode = 'kanban',
  isTablet = false,
  isMobile = false,
}: KanbanColumnProps) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isStackView = viewMode === 'stack';
  const columnWidth = isMobile ? '100%' : isTablet ? '100%' : isStackView ? '100%' : 'auto';
  
  return (
    <div className={`kanban-column ${isStackView ? 'stack-view' : ''} ${isMobile ? 'mobile' : ''} ${isTablet ? 'tablet' : ''}`} style={{ width: columnWidth }}>
      <div className="kanban-column-header" style={{ borderTopColor: color }}>
        <div className="kanban-column-title">
          <Text strong style={{ color, fontSize: isMobile ? 14 : 16 }}>
            {title}
          </Text>
          <Badge 
            count={invoices.length} 
            style={{ 
              backgroundColor: color,
              minWidth: isMobile ? 20 : 22,
              height: isMobile ? 20 : 22,
              lineHeight: isMobile ? '18px' : '20px',
              fontSize: isMobile ? 11 : 12
            }} 
          />
        </div>
        <div className="kanban-column-summary">
          <Text type="secondary" className="amount-text" style={{ fontSize: isMobile ? 11 : 12 }}>
            {formatAmount(totalAmount)}
          </Text>
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`kanban-column-content ${
              snapshot.isDraggingOver ? 'dragging-over' : ''
            }`}
            style={{
              backgroundColor: snapshot.isDraggingOver ? bgColor : 'transparent',
            }}
          >
            {invoices.map((invoice, index) => (
              compactMode || Object.values(cardSettings).filter(v => v).length <= 5 ? (
                <KanbanCardCompact
                  key={invoice.id}
                  invoice={invoice}
                  index={index}
                  onClick={() => onCardClick(invoice)}
                  settings={cardSettings}
                  compactMode={compactMode}
                />
              ) : (
                <KanbanCard
                  key={invoice.id}
                  invoice={invoice}
                  index={index}
                  onClick={() => onCardClick(invoice)}
                />
              )
            ))}
            {provided.placeholder}
            {invoices.length === 0 && (
              <div className="empty-column">
                <Text type="secondary">Нет счетов</Text>
              </div>
            )}
          </div>
        )}
      </Droppable>

      <style>{`
        .kanban-column {
          background: white;
          border-radius: 8px;
          min-width: 300px;
          max-width: 320px;
          height: calc(100vh - 280px);
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #d9d9d9;
          transition: all 0.3s ease;
        }
        
        .kanban-column.stack-view {
          min-width: 100%;
          max-width: 100%;
          height: auto;
          min-height: 200px;
          margin-bottom: 16px;
        }
        
        .kanban-column.tablet {
          min-width: 280px;
          max-width: 300px;
          height: calc(100vh - 260px);
        }
        
        .kanban-column.mobile {
          min-width: 100%;
          max-width: 100%;
          height: auto;
          min-height: 180px;
          margin-bottom: 12px;
        }

        .kanban-column-header {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          border-top: 3px solid;
          border-radius: 8px 8px 0 0;
          flex-shrink: 0;
        }
        
        .kanban-column.tablet .kanban-column-header {
          padding: 14px;
        }
        
        .kanban-column.mobile .kanban-column-header {
          padding: 12px;
        }

        .kanban-column-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .kanban-column-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .amount-text {
          font-size: 12px;
          font-weight: 500;
        }

        .kanban-column-content {
          flex: 1;
          padding: 8px;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 100px;
          max-height: calc(100vh - 380px);
          transition: background-color 0.2s ease;
        }
        
        .kanban-column.stack-view .kanban-column-content {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .kanban-column.tablet .kanban-column-content {
          max-height: calc(100vh - 340px);
          padding: 6px;
        }
        
        .kanban-column.mobile .kanban-column-content {
          max-height: 300px;
          padding: 6px;
          overflow-y: auto;
        }

        .kanban-column-content.dragging-over {
          border-radius: 4px;
          border: 2px dashed ${color};
        }

        .empty-column {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100px;
          border: 2px dashed #d9d9d9;
          border-radius: 4px;
          margin: 8px 0;
        }

        .kanban-column-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .kanban-column.tablet .kanban-column-content::-webkit-scrollbar,
        .kanban-column.mobile .kanban-column-content::-webkit-scrollbar {
          width: 8px;
        }

        .kanban-column-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .kanban-column-content::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .kanban-column.tablet .kanban-column-content::-webkit-scrollbar-thumb,
        .kanban-column.mobile .kanban-column-content::-webkit-scrollbar-thumb {
          background: #bfbfbf;
          border-radius: 4px;
        }

        .kanban-column-content::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
}