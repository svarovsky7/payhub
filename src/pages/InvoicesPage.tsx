import { useState, useEffect, useMemo } from 'react'
import { Table, Button, Space, Tag, Form, message, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import { supabase, type Invoice, type Contractor, type Project, type InvoiceType, type InvoiceStatus } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { InvoiceFormModal } from '../components/invoices/InvoiceFormModal'
import { InvoiceView } from '../components/invoices/InvoiceView'
import { formatAmount, parseAmount, calculateDeliveryDate } from '../utils/invoiceHelpers'
import { debugStorageAccess, testFileOperations } from '../utils/storageDebug'

export const InvoicesPage = () => {
  const { modal } = App.useApp()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [payers, setPayers] = useState<Contractor[]>([])
  const [suppliers, setSuppliers] = useState<Contractor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([])
  const [amountWithVat, setAmountWithVat] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(20)
  const [vatAmount, setVatAmount] = useState<number>(0)
  const [amountWithoutVat, setAmountWithoutVat] = useState<number>(0)
  const [deliveryDays, setDeliveryDays] = useState<number | undefined>()
  const [deliveryDaysType, setDeliveryDaysType] = useState<'working' | 'calendar'>('calendar')
  const [invoiceDate, setInvoiceDate] = useState<Dayjs>(dayjs())
  const [preliminaryDeliveryDate, setPreliminaryDeliveryDate] = useState<Dayjs | null>(null)
  const [form] = Form.useForm()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadInvoices()
      loadReferences()
    }
  }, [user?.id])

  useEffect(() => {
    calculateVat()
  }, [amountWithVat, vatRate])

  useEffect(() => {
    if (deliveryDays && deliveryDays > 0) {
      const calculatedDate = calculateDeliveryDate(invoiceDate, deliveryDays, deliveryDaysType)
      setPreliminaryDeliveryDate(calculatedDate)
      // Отключаем логирование при расчете даты поставки
      // console.log('[InvoicesPage] Calculated delivery date:', calculatedDate.format('DD.MM.YYYY'))
    } else {
      setPreliminaryDeliveryDate(null)
    }
  }, [invoiceDate, deliveryDays, deliveryDaysType])

  const calculateVat = () => {
    // Отключаем логирование при расчете НДС, так как это вызывается при каждом изменении суммы
    // console.log('[InvoicesPage.calculateVat] Calculating VAT:', { amountWithVat, vatRate })
    if (vatRate === 0) {
      setVatAmount(0)
      setAmountWithoutVat(amountWithVat)
    } else {
      const vat = Math.round((amountWithVat * vatRate / (100 + vatRate)) * 100) / 100
      setVatAmount(vat)
      setAmountWithoutVat(amountWithVat - vat)
    }
  }

  const loadReferences = async () => {
    console.log('[InvoicesPage.loadReferences] Loading reference data')
    try {
      const { data: payersData } = await supabase
        .from('contractors')
        .select('*, contractor_types!inner(code)')
        .eq('contractor_types.code', 'payer')
        .order('name')

      setPayers(payersData || [])
      console.log('[InvoicesPage.loadReferences] Loaded payers:', payersData?.length || 0)

      const { data: suppliersData } = await supabase
        .from('contractors')
        .select('*, contractor_types!inner(code)')
        .eq('contractor_types.code', 'supplier')
        .order('name')

      setSuppliers(suppliersData || [])
      console.log('[InvoicesPage.loadReferences] Loaded suppliers:', suppliersData?.length || 0)

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setProjects(projectsData || [])
      console.log('[InvoicesPage.loadReferences] Loaded projects:', projectsData?.length || 0)

      const { data: typesData } = await supabase
        .from('invoice_types')
        .select('*')
        .order('name')

      setInvoiceTypes(typesData || [])
      console.log('[InvoicesPage.loadReferences] Loaded invoice types:', typesData?.length || 0)

      const { data: statusesData } = await supabase
        .from('invoice_statuses')
        .select('*')
        .order('sort_order')

      setInvoiceStatuses(statusesData || [])
      console.log('[InvoicesPage.loadReferences] Loaded invoice statuses:', statusesData?.length || 0)
    } catch (error) {
      console.error('[InvoicesPage.loadReferences] Error:', error)
      message.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃРїСЂР°РІРѕС‡РЅС‹С… РґР°РЅРЅС‹С…')
    }
  }

  const loadInvoices = async () => {
    console.log('[InvoicesPage.loadInvoices] Loading invoices for user:', user?.id)
    if (!user?.id) {
      console.log('[InvoicesPage.loadInvoices] No user ID available, skipping load')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          payer:contractors!invoices_payer_id_fkey(id, name),
          supplier:contractors!invoices_supplier_id_fkey(id, name),
          project:projects(id, name),
          invoice_type:invoice_types(id, name),
          invoice_status:invoice_statuses(id, code, name, color, sort_order)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[InvoicesPage.loadInvoices] Loaded invoices:', data?.length || 0)
      setInvoices(data || [])
    } catch (error) {
      console.error('[InvoicesPage.loadInvoices] Error:', error)
      message.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃС‡РµС‚РѕРІ')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[InvoicesPage.handleCreate] Opening create modal')
    form.resetFields()
    setAmountWithVat(0)
    setVatRate(20)
    setVatAmount(0)
    setAmountWithoutVat(0)
    setDeliveryDays(undefined)
    setDeliveryDaysType('calendar')
    setInvoiceDate(dayjs())
    setPreliminaryDeliveryDate(null)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any, files: UploadFile[]) => {
    console.log('[InvoicesPage.handleSubmit] Creating invoice:', values)
    console.log('[InvoicesPage.handleSubmit] Files to upload:', files.length)

    try {
      const invoiceData = {
        user_id: user?.id,
        invoice_number: values.invoice_number || 'б/н',
        invoice_date: values.invoice_date.format('YYYY-MM-DD'),
        payer_id: values.payer_id,
        supplier_id: values.supplier_id,
        project_id: values.project_id,
        invoice_type_id: values.invoice_type_id,
        amount_with_vat: amountWithVat,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        amount_without_vat: amountWithoutVat,
        delivery_days: deliveryDays,
        delivery_days_type: deliveryDaysType,
        preliminary_delivery_date: preliminaryDeliveryDate ? preliminaryDeliveryDate.format('YYYY-MM-DD') : null,
        status_id: values.status_id,
        description: values.description,
      }

      const { data: invoiceResult, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single()

      if (invoiceError) throw invoiceError

      console.log('[InvoicesPage.handleSubmit] Invoice created:', invoiceResult.id)

      if (files.length > 0) {
        console.log('[InvoicesPage.handleSubmit] Processing files:', files)
        for (const file of files) {
          try {
            // В Ant Design Upload компонент файл может быть либо в originFileObj, либо сам по себе File
            const fileToUpload = (file as any).originFileObj || file

            // Проверяем, что это действительно File объект
            if (!(fileToUpload instanceof File || fileToUpload instanceof Blob)) {
              console.warn('[InvoicesPage.handleSubmit] Invalid file object:', file)
              continue
            }

            const timestamp = Date.now()
            const fileName = `${timestamp}_${file.name || fileToUpload.name}`
            const storagePath = `invoices/${invoiceResult.id}/${fileName}`

            console.log('[InvoicesPage.handleSubmit] Uploading file:', fileName, 'to:', storagePath)

            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(storagePath, fileToUpload, {
                cacheControl: '3600',
                upsert: false,
              })

            if (uploadError) {
              console.error('[InvoicesPage.handleSubmit] Upload error:', uploadError)
              message.error(`Ошибка загрузки файла ${fileName}`)
              continue
            }

            const attachmentData = {
              original_name: file.name || fileToUpload.name,
              storage_path: storagePath,
              size_bytes: file.size || fileToUpload.size || 0,
              mime_type: file.type || fileToUpload.type || 'application/octet-stream',
              created_by: user?.id,
            }

            const { data: attachment, error: attachmentError } = await supabase
              .from('attachments')
              .insert([attachmentData])
              .select()
              .single()

            if (attachmentError) {
              console.error('[InvoicesPage.handleSubmit] Attachment DB error:', attachmentError)
              continue
            }

            const { error: linkError } = await supabase
              .from('invoice_attachments')
              .insert([
                {
                  invoice_id: invoiceResult.id,
                  attachment_id: attachment.id,
                },
              ])

            if (linkError) {
              console.error('[InvoicesPage.handleSubmit] Link error:', linkError)
            } else {
              console.log('[InvoicesPage.handleSubmit] File linked successfully:', file.name)
            }
          } catch (fileError) {
            console.error('[InvoicesPage.handleSubmit] File processing error:', fileError)
            message.error(`Ошибка обработки файла ${file.name}`)
          }
        }
      }

      message.success('Счёт создан успешно')
      setIsModalVisible(false)
      loadInvoices()
    } catch (error: any) {
      console.error('[InvoicesPage.handleSubmit] Error:', error)
      message.error(error.message || 'Ошибка создания счёта')
    }
  }

  const handleUpdate = async (invoiceId: string, values: any) => {
    console.log('[InvoicesPage.handleUpdate] Updating invoice:', invoiceId, values)
    try {
      const { error } = await supabase
        .from('invoices')
        .update(values)
        .eq('id', invoiceId)

      if (error) throw error

      message.success('Счёт успешно обновлен')
      loadInvoices()
      setSelectedInvoice(null)
    } catch (error: any) {
      console.error('[InvoicesPage.handleUpdate] Error:', error)
      message.error(error.message || 'Ошибка обновления счёта')
      throw error
    }
  }

  const handleDelete = async (id: string) => {
    console.log('[InvoicesPage.handleDelete] Deleting invoice:', id)

    modal.confirm({
      title: 'Удалить счёт?',
      content: 'Это действие нельзя отменить. Все прикрепленные файлы также будут удалены.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        console.log('[InvoicesPage.handleDelete] Confirmed deletion for:', id)

        // Запускаем диагностику перед удалением
        await debugStorageAccess()
        await testFileOperations(id)

        try {
          // Сначала получаем список всех файлов, связанных со счетом
          const { data: attachments, error: fetchError } = await supabase
            .from('invoice_attachments')
            .select(`
              attachment_id,
              attachments (
                id,
                storage_path
              )
            `)
            .eq('invoice_id', id)

          if (fetchError) {
            console.error('[InvoicesPage.handleDelete] Error fetching attachments:', fetchError)
            throw fetchError
          }

          console.log('[InvoicesPage.handleDelete] Found attachments:', attachments)

          // Удаляем всю папку счета из Storage
          // Сначала получаем список всех файлов в папке
          const folderPath = `invoices/${id}`
          console.log('[InvoicesPage.handleDelete] === НАЧАЛО УДАЛЕНИЯ ФАЙЛОВ ИЗ STORAGE ===')
          console.log('[InvoicesPage.handleDelete] Invoice ID:', id)
          console.log('[InvoicesPage.handleDelete] Folder path to check:', folderPath)

          // Метод 1: Используем list для получения файлов
          console.log('[InvoicesPage.handleDelete] Метод 1: Получаем список файлов через .list()')
          const { data: fileList, error: listError } = await supabase.storage
            .from('attachments')
            .list(folderPath)

          console.log('[InvoicesPage.handleDelete] List result:', { fileList, listError })

          if (listError) {
            console.error('[InvoicesPage.handleDelete] Error listing files:', listError)
          } else {
            console.log('[InvoicesPage.handleDelete] Files found:', fileList?.length || 0)
            if (fileList && fileList.length > 0) {
              console.log('[InvoicesPage.handleDelete] Files details:', fileList.map(f => ({
                name: f.name,
                id: (f as any).id,
                size: (f as any).metadata?.size
              })))
            }
          }

          // Метод 2: Также попробуем удалить файлы из БД по путям
          console.log('[InvoicesPage.handleDelete] Метод 2: Используем пути из БД')
          if (attachments && attachments.length > 0) {
            const dbFilePaths = attachments
              .map(item => (item as any).attachments?.storage_path)
              .filter(Boolean)

            console.log('[InvoicesPage.handleDelete] File paths from DB:', dbFilePaths)

            if (dbFilePaths.length > 0) {
              console.log('[InvoicesPage.handleDelete] Attempting to delete files from DB paths...')
              const { data: removeData, error: removeError } = await supabase.storage
                .from('attachments')
                .remove(dbFilePaths)

              console.log('[InvoicesPage.handleDelete] Remove by DB paths result:', { removeData, removeError })

              if (removeError) {
                console.error('[InvoicesPage.handleDelete] Error removing files by DB paths:', removeError)
              } else {
                console.log('[InvoicesPage.handleDelete] Successfully removed files by DB paths')
              }
            }
          }

          // Метод 3: Если list вернул файлы, удаляем их
          if (fileList && fileList.length > 0) {
            // Формируем полные пути к файлам
            const filesToDelete = fileList.map(file => `${folderPath}/${file.name}`)

            console.log('[InvoicesPage.handleDelete] Метод 3: Удаление файлов из list()')
            console.log('[InvoicesPage.handleDelete] Files to delete:', filesToDelete)

            const { data: removeListData, error: storageError } = await supabase.storage
              .from('attachments')
              .remove(filesToDelete)

            console.log('[InvoicesPage.handleDelete] Remove from list result:', { removeListData, storageError })

            if (storageError) {
              console.error('[InvoicesPage.handleDelete] Storage deletion error:', storageError)

              // Попробуем удалить файлы по одному для диагностики
              console.log('[InvoicesPage.handleDelete] Trying to delete files one by one...')
              for (const filePath of filesToDelete) {
                const { data: singleRemove, error: singleError } = await supabase.storage
                  .from('attachments')
                  .remove([filePath])

                console.log(`[InvoicesPage.handleDelete] Delete ${filePath}:`, { singleRemove, singleError })
              }
            } else {
              console.log('[InvoicesPage.handleDelete] Successfully deleted files from list')
            }
          } else {
            console.log('[InvoicesPage.handleDelete] No files found in folder via list()')
          }

          // Проверяем, остались ли файлы после удаления
          console.log('[InvoicesPage.handleDelete] Проверяем папку после удаления...')
          const { data: checkList, error: checkError } = await supabase.storage
            .from('attachments')
            .list(folderPath)

          console.log('[InvoicesPage.handleDelete] Check after deletion:', {
            filesRemaining: checkList?.length || 0,
            checkError
          })

          if (checkList && checkList.length > 0) {
            console.warn('[InvoicesPage.handleDelete] WARNING: Files still remain in folder after deletion!')
            console.warn('[InvoicesPage.handleDelete] Remaining files:', checkList.map(f => f.name))
          }

          console.log('[InvoicesPage.handleDelete] === КОНЕЦ УДАЛЕНИЯ ФАЙЛОВ ИЗ STORAGE ===')


          // Удаляем записи из таблицы attachments
          // (invoice_attachments удалятся автоматически через CASCADE)
          if (attachments && attachments.length > 0) {
            const attachmentIds = attachments
              .map(item => (item as any).attachments?.id)
              .filter(Boolean)

            if (attachmentIds.length > 0) {
              const { error: attachmentDeleteError } = await supabase
                .from('attachments')
                .delete()
                .in('id', attachmentIds)

              if (attachmentDeleteError) {
                console.error('[InvoicesPage.handleDelete] Attachment deletion error:', attachmentDeleteError)
              }
            }
          }

          // Теперь удаляем сам счет
          const { data, error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', id)
            .select()

          console.log('[InvoicesPage.handleDelete] Delete result:', { data, error })

          if (error) {
            console.error('[InvoicesPage.handleDelete] Delete error:', error)
            throw error
          }

          message.success('Счёт и все связанные файлы удалены')
          await loadInvoices()
        } catch (error: any) {
          console.error('[InvoicesPage.handleDelete] Error:', error)
          message.error(error.message || 'Ошибка удаления счёта')
        }
      },
      onCancel: () => {
        console.log('[InvoicesPage.handleDelete] Deletion cancelled for:', id)
      }
    })
  }

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

  const columns: ColumnsType<Invoice> = useMemo(() => {
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

    const statusFilters = invoiceStatuses.map((status) => ({
      text: status.name,
      value: status.code,
    }))

    const vatRateFilters = Array.from(new Set(invoices.map((invoice) => invoice.vat_rate ?? 0)))
      .sort((a, b) => a - b)
      .map((rate) => ({
        text: `${rate}%`,
        value: rate,
      }))

    return [
      {
        title: 'Номер',
        dataIndex: 'invoice_number',
        key: 'invoice_number',
        width: 100,
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
        width: 100,
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
        title: 'НДС',
        dataIndex: 'vat_rate',
        key: 'vat_rate',
        width: 60,
        render: (rate: number | null) => `${rate || 0}%`,
        sorter: (a, b) => (a.vat_rate ?? 0) - (b.vat_rate ?? 0),
        sortDirections: ['ascend', 'descend'],
        filters: vatRateFilters,
        onFilter: (value, record) => (record.vat_rate ?? 0) === Number(value),
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
              onClick={() => setSelectedInvoice(record)}
            />
            <Button icon={<EditOutlined />} size="small" />
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => {
                console.log('[InvoicesPage] Delete button clicked for:', record.id)
                handleDelete(record.id)
              }}
            />
          </Space>
        ),
      },
    ]
  }, [invoices, invoiceStatuses, invoiceTypes, payers, projects, suppliers])

  // Если выбран счет для просмотра, показываем его вместо таблицы
  if (selectedInvoice) {
    return (
      <InvoiceView
        invoice={selectedInvoice}
        payers={payers}
        suppliers={suppliers}
        projects={projects}
        invoiceTypes={invoiceTypes}
        invoiceStatuses={invoiceStatuses}
        onUpdate={handleUpdate}
        onClose={() => setSelectedInvoice(null)}
      />
    )
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Счета</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать новый счёт
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invoices}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} счетов`,
        }}
      />

      <InvoiceFormModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
          setAmountWithVat(0)
          setVatRate(20)
          setVatAmount(0)
          setAmountWithoutVat(0)
          setDeliveryDays(undefined)
          setDeliveryDaysType('calendar')
          setInvoiceDate(dayjs())
          setPreliminaryDeliveryDate(null)
        }}
        onSubmit={handleSubmit}
        form={form}
        payers={payers}
        suppliers={suppliers}
        projects={projects}
        invoiceTypes={invoiceTypes}
        invoiceStatuses={invoiceStatuses}
        amountWithVat={amountWithVat}
        onAmountWithVatChange={setAmountWithVat}
        vatRate={vatRate}
        onVatRateChange={setVatRate}
        vatAmount={vatAmount}
        amountWithoutVat={amountWithoutVat}
        deliveryDays={deliveryDays}
        onDeliveryDaysChange={setDeliveryDays}
        deliveryDaysType={deliveryDaysType}
        onDeliveryDaysTypeChange={setDeliveryDaysType}
        invoiceDate={invoiceDate}
        onInvoiceDateChange={setInvoiceDate}
        preliminaryDeliveryDate={preliminaryDeliveryDate}
        formatAmount={formatAmount}
        parseAmount={parseAmount}
      />
    </>
  )
}
