import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'
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
  handleViewInvoice: (invoice: Invoice) => void
  handleEditInvoice: (invoice: Invoice) => void
  handleDeleteInvoice: (invoiceId: string) => void
  handleArchiveInvoice?: (invoiceId: string, isArchived: boolean) => void
  handleViewHistory?: (invoice: Invoice) => void
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
  handleViewInvoice,
  handleEditInvoice,
  handleDeleteInvoice,
  handleArchiveInvoice,
  handleViewHistory
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

  const responsibleManagerFilters = Array.from(
    new Set(
      invoices
        .map((invoice) => invoice.responsible_user?.full_name)
        .filter((name): name is string => Boolean(name))
    )
  )
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((name) => ({
      text: name,
      value: name,
    }))

  const paymentCountFilters = Array.from(
    new Set(
      invoices
        .map((invoice) => getPaymentTotals(invoice.id).paymentCount)
    )
  )
    .sort((a, b) => a - b)
    .map((count) => ({
      text: String(count),
      value: count,
    }))

  return [
    {
      title: 'Номер',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 100,
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
      width: 95,
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
      width: 140,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
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
      width: 140,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
      sorter: (a, b) => (a.supplier?.name || '').localeCompare(b.supplier?.name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: supplierFilters,
      filterSearch: true,
      onFilter: (value, record) => record.supplier?.id === Number(value),
    },
    {
      title: 'Получатель',
      dataIndex: 'recipient',
      key: 'recipient',
      width: 140,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
      sorter: (a, b) => (a.recipient || '').localeCompare(b.recipient || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 140,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
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
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
      sorter: (a, b) => (a.invoice_type?.name || '').localeCompare(b.invoice_type?.name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: invoiceTypeFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.invoice_type?.id ?? record.invoice_type_id ?? 0) === Number(value),
    },
    {
      title: 'Сумма с НДС и доставкой',
      key: 'amount_with_delivery',
      align: 'right',
      width: 180,
      render: (_: unknown, record: Invoice) => {
        const total = (record.amount_with_vat ?? 0) + (record.delivery_cost ?? 0)
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {total ? `${formatAmount(total)} ₽` : '-'}
          </span>
        )
      },
      sorter: (a, b) => {
        const totalA = (a.amount_with_vat ?? 0) + (a.delivery_cost ?? 0)
        const totalB = (b.amount_with_vat ?? 0) + (b.delivery_cost ?? 0)
        return totalA - totalB
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Дата поставки',
      dataIndex: 'preliminary_delivery_date',
      key: 'preliminary_delivery_date',
      render: (date: string | null) => (date ? dayjs(date).format('DD.MM.YYYY') : '-'),
      sorter: (a, b) => {
        const dateA = a.preliminary_delivery_date ? dayjs(a.preliminary_delivery_date).valueOf() : 0
        const dateB = b.preliminary_delivery_date ? dayjs(b.preliminary_delivery_date).valueOf() : 0
        return dateA - dateB
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Ответственный менеджер снабжения',
      dataIndex: ['responsible_user', 'full_name'],
      key: 'responsible_manager',
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text || '-'}
        </div>
      ),
      sorter: (a, b) => (a.responsible_user?.full_name || '').localeCompare(b.responsible_user?.full_name || '', 'ru'),
      sortDirections: ['ascend', 'descend'],
      filters: responsibleManagerFilters,
      filterSearch: true,
      onFilter: (value, record) => record.responsible_user?.full_name === String(value),
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
      title: 'Платежи',
      key: 'payments_count',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const totals = getPaymentTotals(record.id)
        return totals.paymentCount
      },
      sorter: (a, b) => {
        const countA = getPaymentTotals(a.id).paymentCount
        const countB = getPaymentTotals(b.id).paymentCount
        return countA - countB
      },
      sortDirections: ['ascend', 'descend'],
      filters: paymentCountFilters,
      onFilter: (value, record) => getPaymentTotals(record.id).paymentCount === Number(value),
    },
    {
      title: 'Оплата',
      key: 'payment_status',
      render: (_, record) => {
        const totals = getPaymentTotals(record.id)
        // Include delivery cost in total amount
        const totalAmountWithDelivery = (record.amount_with_vat || 0) + (record.delivery_cost || 0)
        return (
          <PaymentStatusIndicator
            totalAmount={totalAmountWithDelivery}
            totalPaid={totals.totalPaid}
            paymentCount={totals.paymentCount}
            invoiceStatusCode={record.invoice_status?.code || record.status}
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
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onArchiveInvoice={handleArchiveInvoice}
            onViewHistory={handleViewHistory}
          />
        )
      },
    },
  ]
}