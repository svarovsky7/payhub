import { Space, Tag } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus, Payment } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'
import { PaymentStatusIndicator } from './PaymentStatusIndicator'
import { QuickActionsColumn } from './QuickActionsColumn'
import dayjs from 'dayjs'

interface InvoiceTableColumnsProps {
  invoices: Invoice[]
  invoiceStatuses: InvoiceStatus[]
  invoiceTypes: InvoiceType[]
  payers: Contractor[]
  suppliers: Contractor[]
  projects: Project[]
  getPaymentTotals: (invoiceId: string) => {
    totalPaid: number
    remainingAmount: number
    paymentCount: number
  }
  handleQuickPayment: (invoice: Invoice) => void
  handleViewPayments: (invoice: Invoice) => void
  handleViewInvoice: (invoice: Invoice) => void
  handleEditInvoice: (invoice: Invoice) => void
  handleDeleteInvoice: (invoiceId: string) => void
  handleExpandRow: (invoiceId: string) => void
  expandedRows: Set<string>
}

export const getInvoiceTableColumns = ({
  invoices,
  invoiceStatuses,
  invoiceTypes,
  payers,
  suppliers,
  projects,
  getPaymentTotals,
  handleQuickPayment,
  handleViewPayments,
  handleViewInvoice,
  handleEditInvoice,
  handleDeleteInvoice,
  handleExpandRow,
  expandedRows
}: InvoiceTableColumnsProps): ColumnsType<Invoice> => {
  const getStatusTag = (invoice: Invoice) => {
    const statusInfo = invoice.invoice_status
    if (!statusInfo) {
      const fallback = {
        draft: { color: 'default', text: 'Черновик' },
        sent: { color: 'processing', text: 'Отправлен' },
        paid: { color: 'success', text: 'Оплачен' },
        cancelled: { color: 'error', text: 'Отменён' },
      } as const
      const config = fallback[(invoice.status as keyof typeof fallback) ?? 'draft'] ?? fallback.draft
      return <Tag color={config.color}>{config.text}</Tag>
    }

    return <Tag color={statusInfo.color || 'default'}>{statusInfo.name}</Tag>
  }

  // Generate filters
  const invoiceNumberFilters = Array.from(
    new Set(
      invoices
        .map((invoice) => invoice.invoice_number)
        .filter((number): number is string => Boolean(number?.trim()))
    )
  )
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
    .map((invoiceNumber) => ({
      text: invoiceNumber,
      value: invoiceNumber,
    }))

  const invoiceDateFilters = Array.from(
    invoices.reduce<Map<string, number>>((acc, invoice) => {
      if (!invoice.invoice_date) {
        return acc
      }
      const formattedDate = dayjs(invoice.invoice_date).format('DD.MM.YYYY')
      if (!acc.has(formattedDate)) {
        acc.set(formattedDate, dayjs(invoice.invoice_date).valueOf())
      }
      return acc
    }, new Map())
  )
    .sort((a, b) => a[1] - b[1])
    .map(([formattedDate]) => ({
      text: formattedDate,
      value: formattedDate,
    }))

  const payerFilters = payers.map((payer) => ({
    text: payer.name,
    value: payer.id,
  }))

  const supplierFilters = suppliers.map((supplier) => ({
    text: supplier.name,
    value: supplier.id,
  }))

  const projectFilters = projects.map((project) => ({
    text: project.name,
    value: project.id,
  }))

  const invoiceTypeFilters = invoiceTypes.map((type) => ({
    text: type.name,
    value: type.id,
  }))

  const statusFilters = invoiceStatuses
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((status) => ({
      text: status.name,
      value: status.code || '',
    }))

  return [
    {
      title: 'Номер',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      ellipsis: true,
      sorter: (a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: invoiceNumberFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.invoice_number || '').toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string | null) => (date ? new Date(date).toLocaleDateString('ru-RU') : '-'),
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
      ellipsis: true,
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
      align: 'right',
      render: (amount: number | null) => (amount ? `${formatAmount(amount)} ₽` : '-'),
      sorter: (a, b) => (a.amount_with_vat ?? 0) - (b.amount_with_vat ?? 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Доставка',
      dataIndex: 'delivery_cost',
      key: 'delivery_cost',
      align: 'right',
      render: (cost: number | null) => (cost ? `${formatAmount(cost)} ₽` : '-'),
      sorter: (a, b) => (a.delivery_cost ?? 0) - (b.delivery_cost ?? 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Статус',
      key: 'status',
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
      title: 'Оплата',
      key: 'payment_status',
      render: (_, record) => {
        const totals = getPaymentTotals(record.id)
        return (
          <PaymentStatusIndicator
            totalAmount={record.amount_with_vat || 0}
            totalPaid={totals.totalPaid}
            paymentCount={totals.paymentCount}
          />
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => {
        const paymentTotals = getPaymentTotals(record.id)
        return (
          <QuickActionsColumn
            invoice={record}
            paymentCount={paymentTotals.paymentCount}
            remainingAmount={paymentTotals.remainingAmount}
            onQuickPayment={handleQuickPayment}
            onViewPayments={handleViewPayments}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onExpandRow={handleExpandRow}
            isExpanded={expandedRows.has(record.id)}
          />
        )
      },
    },
  ]
}