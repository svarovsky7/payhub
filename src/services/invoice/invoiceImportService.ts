import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

export interface ExcelRow {
  [key: string]: unknown
}

export interface ImportedInvoice {
  projectName: string
  projectId?: number
  supplierName: string
  supplierId?: number
  payerName: string
  payerId?: number
  contractNumber: string
  contractDate: string
  contractId?: string
  invoiceNumber: string
  description: string
  orderDescription: string
  materialRequest: string
  materialDescription: string
  recipientMol: string
  invoiceType: string
  invoiceTypeId?: number
  paymentAmount: number
  invoiceAmount: number
  paidAmount: number
  deliveryDays: number
  fileLinks: string[]
  // Status indicators
  matchedFields: string[]
  errors: string[]
}

// Mapping колонок Excel
const COLUMN_MAP: Record<string, string[]> = {
  projectName: ['Объект строительства', 'Объект', 'Проект', 'Construction Site'],
  supplierName: ['Контрагент', 'Поставщик', 'Supplier', 'Контрагент поставщик'],
  payerName: ['Фирма', 'Плательщик', 'Payer', 'Заказчик'],
  contractNumber: ['№ Договора', 'Договор', 'Contract', 'Contract #', 'Контракт'],
  contractDate: ['Дата договора', 'Дата', 'Contract Date', 'Date'],
  invoiceNumber: ['№ Счета на оплату', 'Счет', 'Invoice', '№ Счета', 'Invoice #'],
  orderDescription: ['Заказ поставщику', 'Заказ', 'Order', 'Purchase Order'],
  materialRequest: ['Заявка на материалы', 'Заявка', 'Material Request', 'Request'],
  materialDescription: ['Описание материала', 'Описание', 'Material', 'Description'],
  recipientMol: ['МОЛ', 'Recipient', 'Получатель', 'Person in Charge'],
  invoiceType: ['Тип счёта', 'Тип счета', 'Invoice Type', 'Type'],
  paymentAmount: ['Сумма платежа', 'Сумма', 'Payment Amount', 'Amount'],
  invoiceAmount: ['Сумма счета', 'Итого', 'Invoice Amount', 'Total'],
  paidAmount: ['Оплачено по счету', 'Оплачено', 'Paid Amount', 'Paid'],
  deliveryDays: ['Срок поставки', 'Срок', 'Delivery Days', 'Days'],
  fileLinks: ['Ссылки на файлы', 'Файлы', 'Files', 'Links', 'Attachments']
}

export const parseInvoiceExcelFile = async (file: File): Promise<ExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        console.log('[parseInvoiceExcelFile] Starting parse')
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        console.log('[parseInvoiceExcelFile] Workbook sheets:', workbook.SheetNames)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Парсим с raw: true чтобы получить оригинальные числовые значения
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' })
        
        console.log('[parseInvoiceExcelFile] Parsed rows:', jsonData.length)
        if (jsonData.length > 0) {
          console.log('[parseInvoiceExcelFile] First row keys:', Object.keys((jsonData as ExcelRow[])[0]))
          console.log('[parseInvoiceExcelFile] First row:', (jsonData as ExcelRow[])[0])
        }
        
        // Нормализуем названия колонок если нужно
        const normalizedData = (jsonData as ExcelRow[]).map(row => {
          const normalized: ExcelRow = {}
          for (const [key, value] of Object.entries(row)) {
            // Сохраняем оригинальное название
            normalized[key as string] = value
          }
          return normalized
        })
        
        resolve(normalizedData)
      } catch (error) {
        console.error('[parseInvoiceExcelFile] Parse error:', error)
        reject(error)
      }
    }
    reader.onerror = () => {
      console.error('[parseInvoiceExcelFile] FileReader error')
      reject(new Error('Ошибка чтения файла'))
    }
    reader.readAsArrayBuffer(file)
  })
}

// Получить значение из строки Excel по вариантам названий колонок (case-insensitive)
const getColumnValue = (row: ExcelRow, columnVariants: string[]): string => {
  // Сначала пробуем точное совпадение
  for (const variant of columnVariants) {
    if (row[variant]) {
      const val = row[variant]
      return val ? String(val).trim() : ''
    }
  }
  
  // Затем пробуем case-insensitive поиск
  const rowKeys = Object.keys(row)
  for (const variant of columnVariants) {
    const variantLower = variant.toLowerCase()
    for (const key of rowKeys) {
      if (String(key).toLowerCase() === variantLower) {
        const val = row[key]
        return val ? String(val).trim() : ''
      }
    }
  }
  
  return ''
}

// Парсить сумму из строки (убрать символы валюты, пробелы, запятые)
const parseAmount = (value: string | number): number => {
  if (value === null || value === undefined || value === '') return 0
  
  // Если уже число, просто вернуть его
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : Math.round(value * 100) / 100 // Округлить до 2 знаков
  }
  
  // Если строка
  const strValue = String(value).trim()
  if (!strValue) return 0
  
  // Убираем символы валюты, пробелы, и нормализуем число
  const cleaned = strValue
    .replace(/[₽$€]/g, '') // Убираем символы валюты
    .replace(/\s+/g, '') // Убираем пробелы
    .replace(/,/g, '.') // Запятую на точку
    .trim()
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100 // Округлить до 2 знаков
}

// Конвертировать Excel дату (серийный номер) в ISO строку
const convertExcelDate = (value: string | number): string => {
  if (value === null || value === undefined || value === '') return ''

  // Если это строка в формате даты, пытаемся ее нормализовать
  if (typeof value === 'string') {
    // Пытаемся распознать форматы вроде DD.MM.YYYY или YYYY-MM-DD
    if (value.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const [day, month, year] = value.split('.')
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return value.split('T')[0] // Возвращаем только дату если это ISO
    }
    // Если строка не похожа на дату, но является числом, конвертируем
  }

  // Конвертируем число или числовую строку
  const numValue = Number(value)
  if (isNaN(numValue) || numValue <= 0) {
    // Если это невалидное число, но строка была, возвращаем как есть
    return typeof value === 'string' ? value : ''
  }

  // Преобразование серийного номера Excel в дату UTC
  // 25569 — это количество дней между 01.01.1900 (эпоха Excel) и 01.01.1970 (эпоха Unix)
  const date = new Date(Math.round((numValue - 25569) * 86400000))

  return date.toISOString().split('T')[0]
}

// Найти project_id по названию альтернативного имени
export const findProjectByAlternativeName = async (name: string): Promise<number | undefined> => {
  try {
    const { data } = await supabase
      .from('project_alternative_names')
      .select('project_id')
      .ilike('alternative_name', `%${name}%`)
      .limit(1)
      .single()
    return data?.project_id
  } catch {
    return undefined
  }
}

// Найти supplier или payer по названию
export const findSupplierOrPayerByName = async (name: string): Promise<number | undefined> => {
  try {
    console.log('[findSupplierOrPayerByName] Searching for contractor:', name)
    
    // Try exact match first
    let { data } = await supabase
      .from('contractors')
      .select('id, name')
      .ilike('name', name)
      .limit(1)
      .single()
    
    if (data) {
      console.log('[findSupplierOrPayerByName] Found exact match:', data)
      return data.id
    }
    
    // If not found, try prefix match
    ({ data } = await supabase
      .from('contractors')
      .select('id, name')
      .ilike('name', `${name}%`)
      .limit(1)
      .single())
    
    if (data) {
      console.log('[findSupplierOrPayerByName] Found prefix match:', data)
      return data.id
    }
    
    // If still not found, try partial match
    ({ data } = await supabase
      .from('contractors')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single())
    
    if (data) {
      console.log('[findSupplierOrPayerByName] Found partial match:', data)
      return data.id
    }
    
    // If still not found, search by alternative names
    const { data: altData } = await supabase
      .from('contractor_alternative_names')
      .select('contractor_id')
      .ilike('alternative_name', name)
      .limit(1)
      .single()
    
    if (altData?.contractor_id) {
      console.log('[findSupplierOrPayerByName] Found by alternative name (exact):', altData.contractor_id)
      return altData.contractor_id
    }
    
    // Try prefix match for alternative names
    const { data: altPrefixData } = await supabase
      .from('contractor_alternative_names')
      .select('contractor_id')
      .ilike('alternative_name', `${name}%`)
      .limit(1)
      .single()
    
    if (altPrefixData?.contractor_id) {
      console.log('[findSupplierOrPayerByName] Found by alternative name (prefix):', altPrefixData.contractor_id)
      return altPrefixData.contractor_id
    }
    
    // Try partial match for alternative names
    const { data: altPartialData } = await supabase
      .from('contractor_alternative_names')
      .select('contractor_id')
      .ilike('alternative_name', `%${name}%`)
      .limit(1)
      .single()
    
    if (altPartialData?.contractor_id) {
      console.log('[findSupplierOrPayerByName] Found by alternative name (partial):', altPartialData.contractor_id)
      return altPartialData.contractor_id
    }
    
    console.log('[findSupplierOrPayerByName] No contractor found for:', name)
    return undefined
  } catch (error) {
    console.log('[findSupplierOrPayerByName] Search error (expected if no matches):', error instanceof Error ? error.message : error)
    return undefined
  }
}

// Найти тип счета по названию
export const findInvoiceTypeByName = async (name: string): Promise<number | undefined> => {
  try {
    if (!name || name.trim() === '') {
      console.log('[findInvoiceTypeByName] Empty invoice type name')
      return undefined
    }

    console.log('[findInvoiceTypeByName] Searching for invoice type:', name)
    
    // Try exact match first
    let { data } = await supabase
      .from('invoice_types')
      .select('id, name')
      .ilike('name', name)
      .limit(1)
      .single()
    
    if (data) {
      console.log('[findInvoiceTypeByName] Found exact match:', data)
      return data.id
    }
    
    // If not found, try prefix match
    ({ data } = await supabase
      .from('invoice_types')
      .select('id, name')
      .ilike('name', `${name}%`)
      .limit(1)
      .single())
    
    if (data) {
      console.log('[findInvoiceTypeByName] Found prefix match:', data)
      return data.id
    }
    
    // If still not found, try partial match
    ({ data } = await supabase
      .from('invoice_types')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single())
    
    if (data) {
      console.log('[findInvoiceTypeByName] Found partial match:', data)
      return data.id
    }
    
    console.log('[findInvoiceTypeByName] No invoice type found for:', name)
    return undefined
  } catch (error) {
    console.log('[findInvoiceTypeByName] Search error:', error instanceof Error ? error.message : error)
    return undefined
  }
}

// Найти или создать договор
export const findOrCreateContract = async (
  contractNumber: string,
  contractDate: string,
  supplierId: number,
  payerId: number,
  projectId: number,
  userId: string
): Promise<string | undefined> => {
  // Ищем существующий договор
  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('contract_number', contractNumber)
    .eq('contract_date', contractDate)
    .limit(1)
    .single()

  if (existing?.id) {
    return existing.id
  }

  // Создаем новый договор
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      contract_number: contractNumber,
      contract_date: contractDate,
      supplier_id: supplierId,
      payer_id: payerId,
      project_id: projectId,
      vat_rate: 20,
      status_id: 2, // active
      created_by: userId
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating contract:', error)
    return undefined
  }

  return data?.id
}

// Парсить и маппировать данные из Excel
export const mapExcelRowsToInvoices = async (rows: ExcelRow[]): Promise<ImportedInvoice[]> => {
  const invoices: ImportedInvoice[] = []

  for (const row of rows) {
    const projectName = getColumnValue(row, COLUMN_MAP.projectName)
    const supplierName = getColumnValue(row, COLUMN_MAP.supplierName)
    const payerName = getColumnValue(row, COLUMN_MAP.payerName)
    const contractNumber = getColumnValue(row, COLUMN_MAP.contractNumber)
    const contractDateRaw = getColumnValue(row, COLUMN_MAP.contractDate) || (row[COLUMN_MAP.contractDate[0]] as string | number | undefined)
    const contractDate = convertExcelDate(contractDateRaw || '')
    const invoiceNumber = getColumnValue(row, COLUMN_MAP.invoiceNumber)
    const invoiceType = getColumnValue(row, COLUMN_MAP.invoiceType)
    const fileLinksStr = getColumnValue(row, COLUMN_MAP.fileLinks)

    const matchedFields: string[] = []
    const errors: string[] = []

    // Валидация обязательных полей
    if (!projectName) errors.push('Не указан объект строительства')
    if (!supplierName) errors.push('Не указан поставщик')
    if (!payerName) errors.push('Не указан плательщик')
    if (!invoiceNumber) errors.push('Не указан номер счета')

    const invoice: ImportedInvoice = {
      projectName,
      supplierName,
      payerName,
      contractNumber,
      contractDate,
      invoiceNumber,
      invoiceType,
      orderDescription: getColumnValue(row, COLUMN_MAP.orderDescription),
      materialRequest: getColumnValue(row, COLUMN_MAP.materialRequest),
      materialDescription: getColumnValue(row, COLUMN_MAP.materialDescription),
      description: [
        getColumnValue(row, COLUMN_MAP.orderDescription),
        getColumnValue(row, COLUMN_MAP.materialRequest),
        getColumnValue(row, COLUMN_MAP.materialDescription)
      ]
        .filter(Boolean)
        .join('\n'),
      recipientMol: getColumnValue(row, COLUMN_MAP.recipientMol),
      paymentAmount: parseAmount(getColumnValue(row, COLUMN_MAP.paymentAmount)),
      invoiceAmount: parseAmount(getColumnValue(row, COLUMN_MAP.invoiceAmount)),
      paidAmount: parseAmount(getColumnValue(row, COLUMN_MAP.paidAmount)),
      deliveryDays: parseInt(getColumnValue(row, COLUMN_MAP.deliveryDays)) || 0,
      fileLinks: fileLinksStr.split(';').map(link => link.trim()).filter(Boolean),
      matchedFields,
      errors
    }

    invoices.push(invoice)
  }

  return invoices
}

// Проверить соответствия и дополнить данные
export const enrichInvoicesWithMatching = async (invoices: ImportedInvoice[]): Promise<ImportedInvoice[]> => {
  console.log('[enrichInvoicesWithMatching] Starting enrichment for', invoices.length, 'invoices')
  for (const invoice of invoices) {
    try {
      console.log('[enrichInvoicesWithMatching] Processing invoice:', invoice.invoiceNumber)
      
      // Проверить проект
      const projectId = await findProjectByAlternativeName(invoice.projectName)
      console.log('[enrichInvoicesWithMatching] Project search for', invoice.projectName, ':', projectId)
      if (projectId) {
        invoice.projectId = projectId
        invoice.matchedFields.push('projectName')
      } else {
        invoice.errors.push('Проект не найден')
      }

      // Проверить поставщика
      const supplierId = await findSupplierOrPayerByName(invoice.supplierName)
      console.log('[enrichInvoicesWithMatching] Supplier search for', invoice.supplierName, ':', supplierId)
      if (supplierId) {
        invoice.supplierId = supplierId
        invoice.matchedFields.push('supplierName')
      } else {
        invoice.errors.push('Поставщик не найден')
      }

      // Проверить плательщика
      const payerId = await findSupplierOrPayerByName(invoice.payerName)
      console.log('[enrichInvoicesWithMatching] Payer search for', invoice.payerName, ':', payerId)
      if (payerId) {
        invoice.payerId = payerId
        invoice.matchedFields.push('payerName')
      } else {
        invoice.errors.push('Плательщик не найден')
      }

      // Проверить договор
      try {
        const { data: existingContract } = await supabase
          .from('contracts')
          .select('id')
          .eq('contract_number', invoice.contractNumber)
          .eq('contract_date', invoice.contractDate)
          .single()

        if (existingContract?.id) {
          console.log('[enrichInvoicesWithMatching] Contract found:', invoice.contractNumber)
          invoice.contractId = existingContract.id
          invoice.matchedFields.push('contractNumber')
          invoice.matchedFields.push('contractDate')
        } else {
          console.log('[enrichInvoicesWithMatching] Contract not found, will create:', invoice.contractNumber)
        }
      } catch (error) {
        console.log('[enrichInvoicesWithMatching] Contract search completed (not found or error)')
      }

      // Проверить тип счета
      const invoiceTypeId = await findInvoiceTypeByName(invoice.invoiceType)
      console.log('[enrichInvoicesWithMatching] Invoice type search for', invoice.invoiceType, ':', invoiceTypeId)
      if (invoiceTypeId) {
        invoice.invoiceTypeId = invoiceTypeId
        invoice.matchedFields.push('invoiceType')
      } else {
        invoice.errors.push('Тип счета не найден')
      }
    } catch (error) {
      console.error('[enrichInvoicesWithMatching] Error enriching invoice:', error)
    }
  }

  console.log('[enrichInvoicesWithMatching] Completed enrichment')
  return invoices
}
