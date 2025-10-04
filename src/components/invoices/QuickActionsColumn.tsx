import { Button, Space, Tooltip } from 'antd'
import {
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  InboxOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import type { Invoice } from '../../lib/supabase'

interface QuickActionsColumnProps {
  invoice: Invoice
  paymentCount: number
  remainingAmount: number
  onQuickPayment: (invoice: Invoice) => void
  onViewInvoice: (invoice: Invoice) => void
  onEditInvoice: (invoice: Invoice) => void
  onDeleteInvoice: (invoiceId: string) => void
  onArchiveInvoice?: (invoiceId: string, isArchived: boolean) => void
}

export const QuickActionsColumn: React.FC<QuickActionsColumnProps> = ({
  invoice,
  paymentCount,
  remainingAmount,
  onQuickPayment,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onArchiveInvoice
}) => {
  // Allow payment if there's remaining amount OR if the invoice has amount but no payments yet
  // Convert to number to ensure proper comparison
  const invoiceAmount = Number(invoice.amount_with_vat) || 0
  const canAddPayment = remainingAmount > 0 || (invoiceAmount > 0 && paymentCount === 0)

  return (
    <Space size={0} wrap={false} style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Space.Compact size="small">
        {/* Быстрый платёж */}
        <Tooltip title={canAddPayment ? "Добавить платёж" : "Полностью оплачен"}>
          <Button
            icon={<PlusOutlined />}
            size="small"
            type={canAddPayment ? "primary" : "default"}
            disabled={!canAddPayment}
            onClick={() => onQuickPayment(invoice)}
            style={{
              backgroundColor: canAddPayment ? '#52c41a' : undefined,
              borderColor: canAddPayment ? '#52c41a' : undefined
            }}
          />
        </Tooltip>
      </Space.Compact>

      <Space.Compact size="small">
        {/* Файлы счёта */}
        <Tooltip title="Файлы">
          <Button
            icon={<PaperClipOutlined />}
            size="small"
            onClick={() => onViewInvoice(invoice)}
          />
        </Tooltip>

        {/* Редактировать счёт */}
        <Tooltip title="Редактировать">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEditInvoice(invoice)}
          />
        </Tooltip>

        {/* Архивировать/Разархивировать */}
        {onArchiveInvoice && (
          <Tooltip title={invoice.is_archived ? "Разархивировать" : "В архив"}>
            <Button
              icon={invoice.is_archived ? <FolderOpenOutlined /> : <InboxOutlined />}
              size="small"
              onClick={() => onArchiveInvoice(invoice.id, !invoice.is_archived)}
              style={{
                color: invoice.is_archived ? '#1890ff' : undefined
              }}
            />
          </Tooltip>
        )}

        {/* Удалить */}
        <Tooltip title="Удалить">
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => onDeleteInvoice(invoice.id)}
          />
        </Tooltip>
      </Space.Compact>
    </Space>
  )
}