import { Table, Button, Space, Tag, Tooltip } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  EditOutlined,
  FileAddOutlined,
  DollarOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'
import type { PaymentApproval } from '../../services/approvalOperations'

interface ApprovalsTableProps {
  approvals: PaymentApproval[]
  loading: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  onApprove: (approval: PaymentApproval) => void
  onReject: (approval: PaymentApproval) => void
  onViewHistory: (approval: PaymentApproval) => void
  onEditInvoice: (approval: PaymentApproval) => void
  onAddFiles: (approval: PaymentApproval) => void
  onEditAmount: (approval: PaymentApproval) => void
  onViewMaterialRequest: (approval: PaymentApproval) => void
  getCurrentStagePermissions: (approval: PaymentApproval) => any
}

export const ApprovalsTable = ({
  approvals,
  loading,
  selectedIds = [],
  onSelectionChange,
  onApprove,
  onReject,
  onViewHistory,
  onEditInvoice,
  onAddFiles,
  onEditAmount,
  onViewMaterialRequest,
  getCurrentStagePermissions
}: ApprovalsTableProps) => {
  console.log('[ApprovalsTable] Approvals data:', approvals)
  if (approvals.length > 0) {
    console.log('[ApprovalsTable] First approval structure:', approvals[0])
    console.log('[ApprovalsTable] Payment data:', {
      hasPayment: !!approvals[0].payment,
      paymentData: approvals[0].payment,
      invoice: approvals[0].payment?.invoice
    })
  }
  // Генерация фильтров
  const projectFilters = Array.from(
    new Set(
      approvals
        .map(a => a.payment?.invoice?.projects?.name)  // projects вместо project
        .filter(Boolean)
    )
  ).map(name => ({ text: name, value: name }))

  const columns: ColumnsType<PaymentApproval> = [
    {
      title: '№',
      key: 'payment_number',
      ellipsis: true,
      sorter: (a, b) => (a.payment?.payment_number || '').localeCompare(b.payment?.payment_number || '', 'ru', { numeric: true }),
      render: (_, record) => (
        <Tooltip title={`Платёж №${record.payment?.payment_number}`}>
          <span>{record.payment?.payment_number || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Дата',
      key: 'payment_date',
      render: (_, record) => {
        const date = record.payment?.payment_date
        return date ? dayjs(date).format('DD.MM.YY') : '-'
      },
      sorter: (a, b) => {
        const dateA = a.payment?.payment_date ? dayjs(a.payment.payment_date).valueOf() : 0
        const dateB = b.payment?.payment_date ? dayjs(b.payment.payment_date).valueOf() : 0
        return dateA - dateB
      }
    },
    {
      title: 'Счёт',
      key: 'invoice',
      ellipsis: true,
      render: (_, record) => {
        const invoice = record.payment?.invoice
        if (!invoice) return '-'
        const payerName = invoice.payer?.name || 'Не указан'
        const supplierName = invoice.supplier?.name || 'Не указан'
        return (
          <Tooltip title={`Счёт №${invoice.invoice_number}\nПлательщик: ${payerName}\nПоставщик: ${supplierName}`}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>№{invoice.invoice_number}</div>
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                {payerName} → {supplierName}
              </div>
            </div>
          </Tooltip>
        )
      }
    },
    {
      title: 'Проект',
      key: 'project',
      ellipsis: true,
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) => record.payment?.invoice?.projects?.name === value,
      render: (_, record) => {
        const projectName = record.payment?.invoice?.projects?.name
        return projectName ? (
          <Tooltip title={projectName}>
            <span style={{ fontSize: '12px' }}>{projectName}</span>
          </Tooltip>
        ) : '-'
      }
    },
    {
      title: 'Сумма счёта',
      key: 'invoice_amount',
      align: 'right',
      render: (_, record) => {
        const amount = record.payment?.invoice?.amount_with_vat
        return amount ? (
          <Tooltip title="Сумма счёта с НДС">
            <span style={{ fontSize: '12px' }}>
              {formatAmount(amount)}₽
            </span>
          </Tooltip>
        ) : '-'
      },
      sorter: (a, b) => (a.payment?.invoice?.amount_with_vat || 0) - (b.payment?.invoice?.amount_with_vat || 0)
    },
    {
      title: 'Сумма платежа',
      key: 'payment_amount',
      align: 'right',
      render: (_, record) => {
        const amount = record.payment?.amount
        return amount ? (
          <span style={{ fontWeight: 500, color: '#1890ff' }}>
            {formatAmount(amount)}₽
          </span>
        ) : '-'
      },
      sorter: (a, b) => (a.payment?.amount || 0) - (b.payment?.amount || 0)
    },
    {
      title: 'Этап',
      key: 'current_stage',
      render: (_, record) => {
        const stage = record.current_stage
        const totalStages = record.route?.stages?.length || 0
        const progress = `${record.current_stage_index + 1}/${totalStages}`

        return (
          <Tooltip title={`${stage?.role?.name || ''} (${stage?.name || 'Этап ' + (record.current_stage_index + 1)})`}>
            <div>
              <Tag color="processing" style={{ margin: 0, fontSize: '11px' }}>
                {progress}
              </Tag>
              {stage?.role?.name && (
                <div style={{ fontSize: '11px', marginTop: '2px', color: '#595959' }}>
                  {stage.role.name}
                </div>
              )}
            </div>
          </Tooltip>
        )
      }
    },
    {
      title: 'Дата поставки',
      key: 'delivery_date',
      render: (_, record) => {
        const deliveryDate = record.payment?.invoice?.preliminary_delivery_date
        return deliveryDate ? dayjs(deliveryDate).format('DD.MM.YY') : '-'
      },
      sorter: (a, b) => {
        const dateA = a.payment?.invoice?.preliminary_delivery_date ? dayjs(a.payment.invoice.preliminary_delivery_date).valueOf() : 0
        const dateB = b.payment?.invoice?.preliminary_delivery_date ? dayjs(b.payment.invoice.preliminary_delivery_date).valueOf() : 0
        return dateA - dateB
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      width: 250,
      render: (_, record) => {
        const permissions = getCurrentStagePermissions(record)

        return (
          <Space size={4}>
            <Tooltip title="Согласовать">
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => onApprove(record)}
                style={{ padding: '0 6px' }}
              />
            </Tooltip>
            <Tooltip title="Отклонить">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => onReject(record)}
                style={{ padding: '0 6px' }}
              />
            </Tooltip>
            {permissions.can_edit_invoice && (
              <Tooltip title="Редактировать счёт">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEditInvoice(record)}
                  style={{ padding: '0 6px', color: '#1890ff' }}
                />
              </Tooltip>
            )}
            {permissions.can_add_files && (
              <Tooltip title="Добавить файлы">
                <Button
                  size="small"
                  icon={<FileAddOutlined />}
                  onClick={() => onAddFiles(record)}
                  style={{ padding: '0 6px', color: '#52c41a' }}
                />
              </Tooltip>
            )}
            {permissions.can_edit_amount && (
              <Tooltip title="Изменить сумму платежа">
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => onEditAmount(record)}
                  style={{ padding: '0 6px', color: '#fa8c16' }}
                />
              </Tooltip>
            )}
            {record.payment?.invoice?.material_request_id && (
              <Tooltip title="Заявка на материалы">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => onViewMaterialRequest(record)}
                  style={{ padding: '0 6px', color: '#722ed1' }}
                />
              </Tooltip>
            )}
            <Tooltip title="История">
              <Button
                size="small"
                icon={<HistoryOutlined />}
                onClick={() => onViewHistory(record)}
                style={{ padding: '0 6px' }}
              />
            </Tooltip>
          </Space>
        )
      }
    }
  ]

  return (
    <div className="compact-table">
      <Table
        columns={columns}
        dataSource={approvals}
        rowKey="id"
        size="small"
        loading={loading}
        scroll={{ x: 'max-content' }}
        tableLayout="auto"
        rowSelection={onSelectionChange ? {
          selectedRowKeys: selectedIds,
          onChange: (selectedRowKeys) => {
            onSelectionChange(selectedRowKeys as string[])
          },
          preserveSelectedRowKeys: true
        } : undefined}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
      />
    </div>
  )
}