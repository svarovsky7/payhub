import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, Spin, Alert, App, Button, Space, Grid } from 'antd';
import { SettingOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';

import { invoiceApi } from '@/entities/invoice';
import { KanbanColumn } from './kanban-column';
import { KanbanFilters } from './kanban-filters';
import { QuickViewModal } from './quick-view-modal';
import { StatusUpdateModal } from './status-update-modal';
import { CardSettingsModal, type CardFieldSettings } from './card-settings-modal';
import type { Invoice, InvoiceStatus } from '@/shared/types';

const { Title } = Typography;

interface KanbanBoardProps {
  className?: string;
}

const COLUMN_CONFIG = [
  {
    id: 'draft',
    title: 'Черновик',
    status: 'draft' as InvoiceStatus,
    color: '#8c8c8c',
    bgColor: '#f5f5f5',
  },
  {
    id: 'rukstroy_review',
    title: 'Согласование Рукстроя',
    status: 'rukstroy_review' as InvoiceStatus,
    color: '#1890ff',
    bgColor: '#e6f7ff',
  },
  {
    id: 'director_review',
    title: 'Согласование Директора',
    status: 'director_review' as InvoiceStatus,
    color: '#722ed1',
    bgColor: '#f9f0ff',
  },
  {
    id: 'supply_review',
    title: 'Согласование Снабжения',
    status: 'supply_review' as InvoiceStatus,
    color: '#fa8c16',
    bgColor: '#fff7e6',
  },
  {
    id: 'in_payment',
    title: 'В Оплате',
    status: 'in_payment' as InvoiceStatus,
    color: '#fadb14',
    bgColor: '#feffe6',
  },
  {
    id: 'paid',
    title: 'Оплачено',
    status: 'paid' as InvoiceStatus,
    color: '#52c41a',
    bgColor: '#f6ffed',
  },
  {
    id: 'rejected',
    title: 'Отказано',
    status: 'rejected' as InvoiceStatus,
    color: '#ff4d4f',
    bgColor: '#fff2f0',
  },
];

const DEFAULT_CARD_SETTINGS: CardFieldSettings = {
  invoiceNumber: true,
  amount: true,
  contractor: true,
  project: false,
  date: true,
  description: false,
  creator: false,
  updatedTime: true,
  priority: true,
  urgency: true,
  payer: false,
  vatInfo: false,
};

export function KanbanBoard({ className }: KanbanBoardProps) {
  const { notification } = App.useApp();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  
  const [filters, setFilters] = useState({
    search: '',
    contractorId: null as number | null,
    projectId: null as number | null,
    dateRange: null as [string, string] | null,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState<CardFieldSettings>(DEFAULT_CARD_SETTINGS);
  const [compactMode, setCompactMode] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'stack'>('kanban');
  const [statusUpdateModal, setStatusUpdateModal] = useState<{
    visible: boolean;
    invoice: Invoice | null;
    fromStatus: InvoiceStatus | null;
    toStatus: InvoiceStatus | null;
  }>({
    visible: false,
    invoice: null,
    fromStatus: null,
    toStatus: null,
  });

  const queryClient = useQueryClient();

  // Determine if we're on a tablet/mobile device
  const isTablet = !screens.lg && screens.md;
  const isMobile = !screens.md;
  const isSmallTablet = screens.md && !screens.lg && window.innerWidth < 900;
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('kanban-card-settings');
    if (savedSettings) {
      try {
        setCardSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load card settings:', e);
      }
    }
    
    const savedCompactMode = localStorage.getItem('kanban-compact-mode');
    setCompactMode(savedCompactMode === 'true');
    
    // Auto-switch to stack view on small tablets/mobile
    if (isMobile || isSmallTablet) {
      setViewMode('stack');
    } else {
      setViewMode('kanban');
    }
  }, [isMobile, isSmallTablet]);

  const {
    data: invoices = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoices', 'kanban'],
    queryFn: invoiceApi.getAll,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter invoices based on search and filters
  const filteredInvoices = invoices.filter((invoice) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = [
        invoice.invoice_number,
        invoice.description,
        invoice.contractor?.name,
        invoice.project?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    if (filters.contractorId && invoice.contractor_id !== filters.contractorId) {
      return false;
    }

    if (filters.projectId && invoice.project_id !== filters.projectId) {
      return false;
    }

    if (filters.dateRange) {
      const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
      const [startDate, endDate] = filters.dateRange;
      if (invoiceDate < new Date(startDate) || invoiceDate > new Date(endDate)) {
        return false;
      }
    }

    return true;
  });

  // Group invoices by status
  const groupedInvoices = COLUMN_CONFIG.reduce((acc, column) => {
    acc[column.status] = filteredInvoices.filter(
      (invoice) => invoice.status === column.status
    );
    return acc;
  }, {} as Record<InvoiceStatus, Invoice[]>);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      console.log('=== handleDragEnd called ===');
      console.log('Result:', result);
      
      const { source, destination, draggableId } = result;

      // If dropped outside of any droppable area
      if (!destination) {
        console.log('No destination - dropped outside');
        return;
      }

      // If dropped in the same position
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        console.log('Same position - no change');
        return;
      }

      const sourceStatus = source.droppableId as InvoiceStatus;
      const targetStatus = destination.droppableId as InvoiceStatus;
      const invoiceId = parseInt(draggableId, 10);
      const invoice = invoices.find((inv) => inv.id === invoiceId);

      console.log('Status transition:', {
        from: sourceStatus,
        to: targetStatus,
        invoiceId,
        invoice: invoice?.invoice_number
      });

      if (!invoice) {
        console.log('Invoice not found');
        return;
      }

      // Show confirmation modal for status change
      if (sourceStatus !== targetStatus) {
        console.log('Opening status update modal');
        setStatusUpdateModal({
          visible: true,
          invoice,
          fromStatus: sourceStatus,
          toStatus: targetStatus,
        });
      }
    },
    [invoices]
  );

  const handleStatusUpdate = async (comment?: string, paymentFile?: File) => {
    console.log('=== handleStatusUpdate called ===');
    console.log('Modal state:', statusUpdateModal);
    console.log('Comment:', comment);
    console.log('Payment file:', paymentFile);
    
    if (!statusUpdateModal.invoice || !statusUpdateModal.toStatus) {
      console.log('Missing invoice or toStatus');
      return;
    }

    const isPaymentTransition = statusUpdateModal.fromStatus === 'in_payment' && statusUpdateModal.toStatus === 'paid';
    console.log('Is payment transition:', isPaymentTransition);
    
    // Block transition to paid without payment document
    if (isPaymentTransition && !paymentFile) {
      console.error('Payment transition blocked - no payment file');
      notification.error({
        message: 'Ошибка',
        description: 'Для перевода в статус "Оплачено" необходимо приложить платежное поручение',
      });
      return;
    }

    try {
      console.log('Calling updateStatusOptimistic...');
      await invoiceApi.updateStatusOptimistic(
        statusUpdateModal.invoice.id, 
        statusUpdateModal.toStatus, 
        comment,
        paymentFile
      );
      
      console.log('Status updated successfully');
      
      // Invalidate and refetch the query
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoices', 'kanban'] });
      
      notification.success({
        message: 'Статус обновлен',
        description: `Счет ${statusUpdateModal.invoice.invoice_number} переведен в статус "${COLUMN_CONFIG.find(c => c.status === statusUpdateModal.toStatus)?.title}"`,
      });

      setStatusUpdateModal({
        visible: false,
        invoice: null,
        fromStatus: null,
        toStatus: null,
      });
    } catch (error) {
      console.error('Failed to update invoice status:', error);
      notification.error({
        message: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить статус счета',
      });
    }
  };

  const handleStatusUpdateCancel = () => {
    setStatusUpdateModal({
      visible: false,
      invoice: null,
      fromStatus: null,
      toStatus: null,
    });
  };

  const handleCardClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="kanban-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="kanban-error">
        <Alert
          message="Ошибка загрузки"
          description="Не удалось загрузить данные о счетах"
          type="error"
          showIcon
        />
      </div>
    );
  }

  const handleSaveSettings = (settings: CardFieldSettings) => {
    setCardSettings(settings);
    localStorage.setItem('kanban-card-settings', JSON.stringify(settings));
    const savedCompactMode = localStorage.getItem('kanban-compact-mode');
    setCompactMode(savedCompactMode === 'true');
  };

  return (
    <div className={`kanban-board ${className || ''}`}>
      <div className="kanban-header">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          gap: isMobile ? 8 : 0
        }}>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, flex: 1 }}>
            {isMobile ? 'Счета' : 'Канбан Доска - Счета'}
          </Title>
          <Space size={isMobile ? 'small' : 'middle'}>
            {(isTablet || isMobile) && (
              <Button.Group>
                <Button
                  type={viewMode === 'kanban' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewMode('kanban')}
                  size={isMobile ? 'small' : 'middle'}
                  disabled={isMobile}
                >
                  {!isMobile && 'Канбан'}
                </Button>
                <Button
                  type={viewMode === 'stack' ? 'primary' : 'default'}
                  icon={<BarsOutlined />}
                  onClick={() => setViewMode('stack')}
                  size={isMobile ? 'small' : 'middle'}
                >
                  {!isMobile && 'Список'}
                </Button>
              </Button.Group>
            )}
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsModalOpen(true)}
              size={isMobile ? 'small' : 'middle'}
              className="touch-target"
            >
              {!isMobile && 'Настройки карточек'}
            </Button>
          </Space>
        </div>
      </div>
      
      <KanbanFilters
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        totalInvoices={filteredInvoices.length}
        totalAmount={filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={`kanban-columns ${viewMode === 'stack' ? 'stack-view' : ''}`}>
          {COLUMN_CONFIG.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.status}
              title={column.title}
              color={column.color}
              bgColor={column.bgColor}
              invoices={groupedInvoices[column.status] || []}
              onCardClick={handleCardClick}
              cardSettings={cardSettings}
              compactMode={compactMode || isTablet}
              viewMode={viewMode}
              isTablet={isTablet}
              isMobile={isMobile}
            />
          ))}
        </div>
      </DragDropContext>

      {selectedInvoice && (
        <QuickViewModal
          invoice={selectedInvoice}
          visible={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      <StatusUpdateModal
        visible={statusUpdateModal.visible}
        invoice={statusUpdateModal.invoice}
        fromStatus={statusUpdateModal.fromStatus}
        toStatus={statusUpdateModal.toStatus}
        onConfirm={handleStatusUpdate}
        onCancel={handleStatusUpdateCancel}
        columnConfig={COLUMN_CONFIG}
      />

      <CardSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={cardSettings}
      />

      <style>{`
        .kanban-board {
          height: calc(100vh - 112px);
          display: flex;
          flex-direction: column;
          background: #f0f2f5;
          position: relative;
        }
        
        @media (max-width: 767px) {
          .kanban-board {
            height: calc(100vh - 80px);
          }
        }
        
        @media (min-width: 768px) and (max-width: 1279px) {
          .kanban-board {
            height: calc(100vh - 96px);
          }
        }

        .kanban-header {
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #d9d9d9;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          flex-shrink: 0;
        }
        
        @media (max-width: 767px) {
          .kanban-header {
            padding: 12px 16px;
          }
        }
        
        @media (min-width: 768px) and (max-width: 1023px) {
          .kanban-header {
            padding: 14px 20px;
          }
        }

        .kanban-columns {
          display: flex;
          gap: 16px;
          padding: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          flex: 1;
          min-height: 0;
        }
        
        .kanban-columns.stack-view {
          flex-direction: column;
          overflow-x: hidden;
          overflow-y: auto;
        }
        
        @media (max-width: 767px) {
          .kanban-columns {
            flex-direction: column;
            gap: 12px;
            padding: 12px;
            overflow-x: hidden;
            overflow-y: auto;
          }
        }
        
        @media (min-width: 768px) and (max-width: 1023px) {
          .kanban-columns {
            gap: 12px;
            padding: 12px;
          }
          
          .kanban-columns:not(.stack-view) {
            padding-bottom: 20px;
          }
        }

        .kanban-loading,
        .kanban-error {
          display: flex;
          justify-content: center;
          align-items: center;
          height: calc(100vh - 112px);
        }

        .kanban-loading {
          background: #f0f2f5;
        }

        .kanban-error {
          background: #f0f2f5;
          padding: 24px;
        }
        
        @media (max-width: 767px) {
          .kanban-loading,
          .kanban-error {
            height: calc(100vh - 80px);
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}