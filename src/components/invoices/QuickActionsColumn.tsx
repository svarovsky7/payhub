import { Button, Space, Tooltip, Badge } from 'antd'
import {
  DollarOutlined,
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import type { Invoice } from '../../lib/supabase'

interface QuickActionsColumnProps {
  invoice: Invoice
  paymentCount: number
  remainingAmount: number
  onQuickPayment: (invoice: Invoice) => void
  onViewPayments: (invoice: Invoice) => void
  onViewInvoice: (invoice: Invoice) => void
  onEditInvoice: (invoice: Invoice) => void
  onDeleteInvoice: (invoiceId: string) => void
  onExpandRow?: (invoiceId: string) => void
  isExpanded?: boolean
}

export const QuickActionsColumn: React.FC<QuickActionsColumnProps> = ({
  invoice,
  paymentCount,
  remainingAmount,
  onQuickPayment,
  onViewPayments,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onExpandRow,
  isExpanded
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

        {/* Разворачивание строки */}
        {onExpandRow && (
          <Tooltip title={isExpanded ? "Скрыть" : paymentCount > 0 ? `${paymentCount} платеж(ей)` : "Нет платежей"}>
            <Badge count={paymentCount} size="small" showZero={false} offset={[2, -2]} style={{ zIndex: 10 }}>
              <Button
                icon={<UnorderedListOutlined />}
                size="small"
                type={isExpanded ? "primary" : "default"}
                onClick={() => onExpandRow(invoice.id)}
              />
            </Badge>
          </Tooltip>
        )}
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