import type { Invoice } from '../lib/supabase'
import dayjs from 'dayjs'

export interface FilterCriteria {
  statuses?: string[]
  payers?: number[]
  suppliers?: number[]
  projects?: number[]
  invoiceTypes?: number[]
  dateRange?: [Date, Date]
  searchText?: string
}

/**
 * Apply filters to invoice list
 */
export const filterInvoices = (
  invoices: Invoice[],
  criteria: FilterCriteria
): Invoice[] => {
  let filtered = [...invoices]

  // Filter by status
  if (criteria.statuses && criteria.statuses.length > 0) {
    filtered = filtered.filter(invoice => {
      const statusCode = invoice.invoice_status?.code || invoice.status || ''
      return criteria.statuses!.includes(statusCode)
    })
  }

  // Filter by payer
  if (criteria.payers && criteria.payers.length > 0) {
    filtered = filtered.filter(invoice =>
      criteria.payers!.includes(invoice.payer_id || 0)
    )
  }

  // Filter by supplier
  if (criteria.suppliers && criteria.suppliers.length > 0) {
    filtered = filtered.filter(invoice =>
      criteria.suppliers!.includes(invoice.supplier_id || 0)
    )
  }

  // Filter by project
  if (criteria.projects && criteria.projects.length > 0) {
    filtered = filtered.filter(invoice =>
      criteria.projects!.includes(invoice.project_id || 0)
    )
  }

  // Filter by invoice type
  if (criteria.invoiceTypes && criteria.invoiceTypes.length > 0) {
    filtered = filtered.filter(invoice =>
      criteria.invoiceTypes!.includes(invoice.invoice_type_id || 0)
    )
  }

  // Filter by date range
  if (criteria.dateRange) {
    const [startDate, endDate] = criteria.dateRange
    filtered = filtered.filter(invoice => {
      if (!invoice.invoice_date) return false
      const invoiceDate = dayjs(invoice.invoice_date).toDate()
      return invoiceDate >= startDate && invoiceDate <= endDate
    })
  }

  // Filter by search text
  if (criteria.searchText && criteria.searchText.trim()) {
    const searchLower = criteria.searchText.toLowerCase()
    filtered = filtered.filter(invoice => {
      const searchableFields = [
        invoice.invoice_number,
        invoice.description,
        invoice.payer?.name,
        invoice.supplier?.name,
        invoice.project?.name,
        invoice.invoice_type?.name
      ]

      return searchableFields.some(field =>
        field?.toLowerCase().includes(searchLower)
      )
    })
  }

  return filtered
}

/**
 * Get unique filter options from invoices
 */
export const getFilterOptions = (invoices: Invoice[]) => {
  const statuses = new Set<string>()
  const payers = new Map<number, string>()
  const suppliers = new Map<number, string>()
  const projects = new Map<number, string>()
  const invoiceTypes = new Map<number, string>()

  invoices.forEach(invoice => {
    // Collect statuses
    const statusCode = invoice.invoice_status?.code || invoice.status
    if (statusCode) {
      statuses.add(statusCode)
    }

    // Collect payers
    if (invoice.payer_id && invoice.payer?.name) {
      payers.set(invoice.payer_id, invoice.payer.name)
    }

    // Collect suppliers
    if (invoice.supplier_id && invoice.supplier?.name) {
      suppliers.set(invoice.supplier_id, invoice.supplier.name)
    }

    // Collect projects
    if (invoice.project_id && invoice.project?.name) {
      projects.set(invoice.project_id, invoice.project.name)
    }

    // Collect invoice types
    if (invoice.invoice_type_id && invoice.invoice_type?.name) {
      invoiceTypes.set(invoice.invoice_type_id, invoice.invoice_type.name)
    }
  })

  return {
    statuses: Array.from(statuses),
    payers: Array.from(payers.entries()).map(([id, name]) => ({ id, name })),
    suppliers: Array.from(suppliers.entries()).map(([id, name]) => ({ id, name })),
    projects: Array.from(projects.entries()).map(([id, name]) => ({ id, name })),
    invoiceTypes: Array.from(invoiceTypes.entries()).map(([id, name]) => ({ id, name }))
  }
}

/**
 * Sort invoices by various criteria
 */
export type SortField = 'invoice_number' | 'invoice_date' | 'amount_with_vat' | 'status' | 'payer' | 'supplier' | 'project'
export type SortOrder = 'asc' | 'desc'

export const sortInvoices = (
  invoices: Invoice[],
  field: SortField,
  order: SortOrder = 'asc'
): Invoice[] => {
  const sorted = [...invoices].sort((a, b) => {
    let compareResult = 0

    switch (field) {
      case 'invoice_number':
        compareResult = (a.invoice_number || '').localeCompare(b.invoice_number || '', 'ru')
        break
      case 'invoice_date':
        const dateA = a.invoice_date ? dayjs(a.invoice_date).valueOf() : 0
        const dateB = b.invoice_date ? dayjs(b.invoice_date).valueOf() : 0
        compareResult = dateA - dateB
        break
      case 'amount_with_vat':
        compareResult = (a.amount_with_vat || 0) - (b.amount_with_vat || 0)
        break
      case 'status':
        const orderA = a.invoice_status?.sort_order ?? 0
        const orderB = b.invoice_status?.sort_order ?? 0
        compareResult = orderA - orderB
        break
      case 'payer':
        compareResult = (a.payer?.name || '').localeCompare(b.payer?.name || '', 'ru')
        break
      case 'supplier':
        compareResult = (a.supplier?.name || '').localeCompare(b.supplier?.name || '', 'ru')
        break
      case 'project':
        compareResult = (a.project?.name || '').localeCompare(b.project?.name || '', 'ru')
        break
    }

    return order === 'desc' ? -compareResult : compareResult
  })

  return sorted
}