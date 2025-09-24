import { Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { formatAmount } from '../../utils/invoiceHelpers'
import type { PaymentApproval } from '../../services/approvalOperations'
import { ApprovalActionButtons } from './ApprovalActionButtons'

interface ApprovalsTableProps {
  approvals: PaymentApproval[]
  loading: boolean
  onApprove: (approval: PaymentApproval) => void
  onReject: (approval: PaymentApproval) => void
  onEditInvoice: (approval: PaymentApproval) => void
  onAddFiles: (approval: PaymentApproval) => void
  onEditAmount: (approval: PaymentApproval) => void
  onViewHistory: (approval: PaymentApproval) => void
  getCurrentStagePermissions: (record: PaymentApproval) => {
    can_edit_invoice: boolean
    can_add_files: boolean
    can_edit_amount: boolean
  }
}

export const ApprovalsTable: React.FC<ApprovalsTableProps> = ({
  approvals,
  loading,
  onApprove,
  onReject,
  onEditInvoice,
  onAddFiles,
  onEditAmount,
  onViewHistory,
  getCurrentStagePermissions
}) => {
  // Get unique invoice types for filter
  const invoiceTypeFilters = [...new Set(approvals.map(a => a.invoice?.invoice_type?.name))]
    .filter(Boolean)
    .map(type => ({ text: type!, value: type! }))

  // Get unique routes for filter
  const routeFilters = [...new Set(approvals.map(a => a.route?.name))]
    .filter(Boolean)
    .map(name => ({ text: name!, value: name! }))

  const columns: ColumnsType<PaymentApproval> = [
    {
      title: '№ счёта',
      key: 'invoice_number',
      fixed: 'left',
      width: 110,
      render: (_, record) => {
        const invoiceNumber = record.invoice?.invoice_number || 'б/н'
        return (
          <Tooltip title={invoiceNumber}>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>{invoiceNumber}</span>
          </Tooltip>
        )
      }
    },
    {
      title: 'Дата счёта',
      key: 'invoice_date',
      width: 95,
      sorter: (a, b) => {
        const dateA = a.invoice?.invoice_date || ''
        const dateB = b.invoice?.invoice_date || ''
        return dateA.localeCompare(dateB)
      },
      render: (_, record) => (
        <span style={{ fontSize: '12px' }}>
          {record.invoice?.invoice_date
            ? dayjs(record.invoice.invoice_date).format('DD.MM.YYYY')
            : '-'}
        </span>
      )
    },
    {
      title: 'Плательщик',
      key: 'payer',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.invoice?.payer?.name || '-'}>
          <span style={{ fontSize: '12px' }}>{record.invoice?.payer?.name || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Поставщик',
      key: 'supplier',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.invoice?.supplier?.name || '-'}>
          <span style={{ fontSize: '12px' }}>{record.invoice?.supplier?.name || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Тип',
      key: 'invoice_type',
      width: 120,
      filters: invoiceTypeFilters,
      filterSearch: true,
      onFilter: (value, record) => record.invoice?.invoice_type?.name === value,
      render: (_, record) => {
        const typeName = record.invoice?.invoice_type?.name || '-'
        return (
          <Tooltip title={typeName}>
            <Tag style={{ fontSize: '11px', margin: 0 }}>{typeName}</Tag>
          </Tooltip>
        )
      }
    },
    {
      title: 'Сумма',
      key: 'amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => {
        const amountA = a.invoice?.amount_with_vat || 0
        const amountB = b.invoice?.amount_with_vat || 0
        return amountA - amountB
      },
      render: (_, record) => (
        <span style={{ fontSize: '12px', fontWeight: 500 }}>
          {record.invoice?.amount_with_vat
            ? `${formatAmount(record.invoice.amount_with_vat)} ₽`
            : '-'}
        </span>
      )
    },
    {
      title: 'Этап',
      key: 'current_stage',
      width: 120,
      render: (_, record) => {
        const stage = record.current_stage_index !== null && record.route?.stages
          ? record.route.stages[record.current_stage_index]
          : null
        const totalStages = record.route?.stages?.length || 0
        const progress = `${record.current_stage_index + 1}/${totalStages}`

        return (
          <Tooltip title={`${stage?.role?.name || 'Не определён'} (${stage?.name || 'Этап ' + (record.current_stage_index + 1)})`}>
            <div>
              <Tag color="processing" style={{ margin: 0, fontSize: '11px' }}>
                {progress}
              </Tag>
              <div style={{ fontSize: '11px', marginTop: '2px', color: '#595959' }}>
                {stage?.role?.name || 'Не определён'}
              </div>
            </div>
          </Tooltip>
        )
      }
    },
    {
      title: 'Маршрут',
      key: 'route',
      ellipsis: true,
      filters: routeFilters,
      filterSearch: true,
      onFilter: (value, record) => record.route?.name === value,
      render: (_, record) => (
        <Tooltip title={record.route?.name || '-'}>
          <span style={{ fontSize: '12px' }}>{record.route?.name || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      width: 250,
      render: (_, record) => {
        const permissions = getCurrentStagePermissions(record)
        return (
          <ApprovalActionButtons
            record={record}
            permissions={permissions}
            onApprove={onApprove}
            onReject={onReject}
            onEditInvoice={onEditInvoice}
            onAddFiles={onAddFiles}
            onEditAmount={onEditAmount}
            onViewHistory={onViewHistory}
          />
        )
      }
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={approvals}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1200 }}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}
      className="compact-table"
      size="small"
    />
  )
}