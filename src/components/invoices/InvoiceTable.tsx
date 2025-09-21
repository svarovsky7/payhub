import { Table, Button, Space, Tag } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Invoice, InvoiceStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'

interface InvoiceTableProps {
  invoices: Invoice[]
  loading: boolean
  onView: (invoice: Invoice) => void
  onEdit: (invoice: Invoice) => void
  onDelete: (invoiceId: string) => void
  columns: ColumnsType<Invoice>
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  loading,
  onView,
  onEdit,
  onDelete,
  columns
}) => {
  return (
    <Table
      columns={columns}
      dataSource={invoices}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1500 }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`
      }}
    />
  )
}

export const getStatusTag = (record: Invoice) => {
  const status = record.invoice_status
  if (!status) {
    // Fallback for old data
    const statusMap: { [key: string]: { color: string; name: string } } = {
      draft: { color: 'default', name: 'Черновик' },
      sent: { color: 'processing', name: 'Отправлен' },
      paid: { color: 'success', name: 'Оплачен' },
      cancelled: { color: 'error', name: 'Отменён' }
    }
    const fallback = statusMap[record.status || 'draft']
    return <Tag color={fallback.color}>{fallback.name}</Tag>
  }

  return <Tag color={status.color || 'default'}>{status.name}</Tag>
}

export const createInvoiceColumns = (
  invoices: Invoice[],
  invoiceStatuses: InvoiceStatus[],
  invoiceTypes: any[],
  payers: any[],
  suppliers: any[],
  projects: any[],
  onView: (invoice: Invoice) => void,
  onDelete: (invoiceId: string) => void
): ColumnsType<Invoice> => {
  // Создаём фильтры для колонок
  const invoiceDateFilters = Array.from(new Set(invoices
    .filter(inv => inv.invoice_date)
    .map(inv => dayjs(inv.invoice_date).format('DD.MM.YYYY'))
  )).map(date => ({ text: date, value: date }))

  const payerFilters = payers.map(p => ({
    text: p.name,
    value: p.id
  }))

  const supplierFilters = suppliers.map(s => ({
    text: s.name,
    value: s.id
  }))

  const projectFilters = projects.map(p => ({
    text: p.name,
    value: p.id
  }))

  const invoiceTypeFilters = invoiceTypes.map(t => ({
    text: t.name,
    value: t.id
  }))

  const statusFilters = invoiceStatuses.map(s => ({
    text: s.name,
    value: s.code
  }))

  return [
    {
      title: 'Номер',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 100,
      fixed: 'left',
      sorter: (a, b) => {
        const numA = a.invoice_number || 'б/н'
        const numB = b.invoice_number || 'б/н'
        return numA.localeCompare(numB, 'ru', { numeric: true })
      },
      sortDirections: ['ascend', 'descend'],
      render: (number: string | null) => number || 'б/н'
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 100,
      render: (date: string | null) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
      sorter: (a, b) => {
        const dateA = a.invoice_date ? dayjs(a.invoice_date).valueOf() : 0
        const dateB = b.invoice_date ? dayjs(b.invoice_date).valueOf() : 0
        return dateA - dateB
      },
      sortDirections: ['ascend', 'descend'],
      filters: invoiceDateFilters,
      filterSearch: true,
      onFilter: (value, record) => {
        if (!record.invoice_date) {
          return false
        }
        const formattedDate = dayjs(record.invoice_date).format('DD.MM.YYYY')
        return formattedDate === String(value)
      },
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => (a.payer?.name || '').localeCompare(b.payer?.name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: payerFilters,
      filterSearch: true,
      onFilter: (value, record) => record.payer?.id === Number(value),
    },
    {
      title: 'Поставщик',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => (a.supplier?.name || '').localeCompare(b.supplier?.name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: supplierFilters,
      filterSearch: true,
      onFilter: (value, record) => record.supplier?.id === Number(value),
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) => record.project?.id === Number(value),
    },
    {
      title: 'Тип',
      dataIndex: ['invoice_type', 'name'],
      key: 'invoice_type',
      width: 100,
      sorter: (a, b) => (a.invoice_type?.name || '').localeCompare(b.invoice_type?.name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: invoiceTypeFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.invoice_type?.id ?? record.invoice_type_id ?? 0) === Number(value),
    },
    {
      title: 'Сумма с НДС',
      dataIndex: 'amount_with_vat',
      key: 'amount_with_vat',
      width: 130,
      render: (amount: number | null) => (amount ? `${formatAmount(amount)} ₽` : '-'),
      sorter: (a, b) => (a.amount_with_vat ?? 0) - (b.amount_with_vat ?? 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Статус',
      key: 'status',
      width: 100,
      sorter: (a, b) => {
        const orderA = a.invoice_status?.sort_order ?? 0
        const orderB = b.invoice_status?.sort_order ?? 0
        if (orderA !== orderB) {
          return orderA - orderB
        }
        const nameA = a.invoice_status?.name || a.status || ''
        const nameB = b.invoice_status?.name || b.status || ''
        return nameA.localeCompare(nameB, 'ru')
      },
      sortDirections: ['ascend', 'descend'],
      filters: statusFilters,
      filterSearch: true,
      onFilter: (value, record) => {
        const statusCode = record.invoice_status?.code || record.status || ''
        return statusCode === String(value)
      },
      render: (_, record) => getStatusTag(record),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onView(record)}
          />
          <Button icon={<EditOutlined />} size="small" />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => {
              console.log('[InvoiceTable] Delete button clicked for:', record.id)
              onDelete(record.id)
            }}
          />
        </Space>
      ),
    },
  ]
}