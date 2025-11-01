import { useState } from 'react'
import { Modal, Upload, Button, Steps, Table, Tag, Space, Spin, message, Select } from 'antd'
import { UploadOutlined, EyeOutlined, InboxOutlined } from '@ant-design/icons'
import type { UploadFile, UploadChangeParam } from 'antd/es/upload/interface'
import {
  parseInvoiceExcelFile,
  mapExcelRowsToInvoices,
  enrichInvoicesWithMatching,
  type ImportedInvoice
} from '../../services/invoice/invoiceImportService'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface ImportInvoicesModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

interface InvoiceFileMapping {
  [invoiceIndex: number]: string[] // файлы, привязанные к счету
}

// Получить payment_type_id для bank_transfer
const getBankTransferPaymentTypeId = async (): Promise<number | undefined> => {
  try {
    const { data, error } = await supabase
      .from('payment_types')
      .select('id')
      .eq('code', 'bank_transfer')
      .single()

    if (error) {
      console.error('[getBankTransferPaymentTypeId] Error:', error)
      return undefined
    }

    return data?.id
  } catch (error) {
    console.error('[getBankTransferPaymentTypeId] Exception:', error)
    return undefined
  }
}

export const ImportInvoicesModal: React.FC<ImportInvoicesModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState(0) // 0: загрузка файлов, 1: импорт Excel, 2: подбор файлов
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])
  const [invoices, setInvoices] = useState<ImportedInvoice[]>([])
  const [importing, setImporting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)
  const [invoiceFileMapping, setInvoiceFileMapping] = useState<InvoiceFileMapping>({})

  const handleUploadFilesChange = (info: any) => {
    const filesWithPreview = info.fileList.map((file: UploadFile) => {
      if (file.originFileObj && !file.url && !file.preview) {
        file.preview = URL.createObjectURL(file.originFileObj)
      }
      return file
    })
    setUploadedFiles(filesWithPreview)
  }

  const handleFileChange = (info: UploadChangeParam<UploadFile>) => {
    const filesWithPreview = info.fileList.map((file: UploadFile) => {
      if (file.originFileObj && !file.url && !file.preview) {
        file.preview = URL.createObjectURL(file.originFileObj)
      }
      return file
    })
    setUploadedFiles(filesWithPreview)
    setFileList(filesWithPreview)
    
    // Handle file upload if file is done
    if (info.file) {
      const file = info.file.originFileObj || info.file
      if (file && info.file.status === 'done') {
        handleFileUpload(file as File)
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      message.loading('Обработка файла...')
      const rows = await parseInvoiceExcelFile(file)
      const mapped = await mapExcelRowsToInvoices(rows)
      const enriched = await enrichInvoicesWithMatching(mapped)

      setInvoices(enriched)
      
      // Автоматическое сопоставление файлов
      const autoMapping: InvoiceFileMapping = {}
      enriched.forEach((invoice, index) => {
        const linkedFiles: string[] = []
        if (invoice.fileLinks && invoice.fileLinks.length > 0) {
          invoice.fileLinks.forEach(fileLink => {
            // Извлекаем базовое имя файла из пути
            const cleanedLink = fileLink
              .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
              .trim()
            const baseName = cleanedLink.split(/[/\\]/).pop() || ''
            
            // Ищем загруженный файл с таким же именем
            const uploadedFile = uploadedFiles.find(f => f.name === baseName)
            if (uploadedFile) {
              linkedFiles.push(baseName)
            }
          })
        }
        if (linkedFiles.length > 0) {
          autoMapping[index] = linkedFiles
        }
      })
      
      setInvoiceFileMapping(autoMapping)
      setFileList([{ uid: '-1', name: file.name, status: 'done' }] as UploadFile[])
      setStep(2)
      message.success(`Обработано ${enriched.length} строк`)
    } catch (error) {
      console.error('Error processing file:', error)
      message.error('Ошибка обработки файла: ' + (error as Error).message)
    }
  }

  const handleFileSelectionChange = (invoiceIndex: number, selectedFiles: string[]) => {
    setInvoiceFileMapping(prev => ({
      ...prev,
      [invoiceIndex]: selectedFiles
    }))
  }

  const handleImport = async () => {
    if (!user?.id) {
      message.error('Не авторизован')
      return
    }

    setImporting(true)
    let successCount = 0
    try {
      const uploadAndAttachFile = async (blob: Blob, fileName: string, invoiceId: string) => {
        const timestamp = Date.now()
        const cleanFileName = fileName
          .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
          .replace(/[^a-zA-Z0-9.\-_а-яА-Я]/g, '_')
          .replace(/_{2,}/g, '_')
        const path = `invoices/${invoiceId}/${timestamp}_${cleanFileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, blob, {
            contentType: blob.type || 'application/octet-stream',
            upsert: false
          })

        if (uploadError) {
          console.error('Error uploading file:', uploadError)
          return
        }

        if (uploadData?.path) {
          const { data: attachData, error: attachError } = await supabase
            .from('attachments')
            .insert({
              original_name: fileName,
              storage_path: uploadData.path,
              size_bytes: blob.size,
              mime_type: blob.type || 'application/octet-stream',
              created_by: user.id
            })
            .select('id')
            .single()

          if (attachError) {
            console.error('Error creating attachment record:', attachError)
            return
          }

          if (attachData?.id) {
            await supabase.from('invoice_attachments').insert({
              invoice_id: invoiceId,
              attachment_id: attachData.id
            })
          }
        }
      }

      for (let idx = 0; idx < invoices.length; idx++) {
        const invoice = invoices[idx]
        if (invoice.errors.length > 0) continue

        // Проверить, существует ли такой счет уже в БД
        try {
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('invoice_number', invoice.invoiceNumber)
            .eq('project_id', invoice.projectId)
            .single()

          if (existingInvoice?.id) {
            console.log('[handleImport] Invoice already exists:', invoice.invoiceNumber)
            continue
          }
        } catch (error) {
          // Счет не существует, продолжаем
          console.log('[handleImport] Invoice check completed (not found or error)')
        }

        // Создать договор если нужно
        const contractId = await (async () => {
          try {
            if (invoice.contractId) {
              return invoice.contractId
            }

            const { data: existing } = await supabase
              .from('contracts')
              .select('id')
              .eq('contract_number', invoice.contractNumber)
              .eq('contract_date', invoice.contractDate)
              .eq('project_id', invoice.projectId)
              .single()

            if (existing?.id) {
              return existing.id
            }

            if (!invoice.projectId) {
              return undefined
            }

            const { data: created, error } = await supabase
              .from('contracts')
              .insert({
                contract_number: invoice.contractNumber,
                contract_date: invoice.contractDate,
                supplier_id: invoice.supplierId,
                payer_id: invoice.payerId,
                project_id: invoice.projectId,
                vat_rate: 20,
                status_id: 2,
                created_by: user.id
              })
              .select('id')
              .single()

            if (error) {
              console.error('Error creating contract:', error)
              throw error
            }

            if (created?.id && invoice.projectId) {
              await supabase
                .from('contract_projects')
                .insert({
                  contract_id: created.id,
                  project_id: invoice.projectId
                })
            }

            return created?.id
          } catch (error) {
            console.error('Error managing contract:', error)
            return undefined
          }
        })()

        // Создать счет
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            user_id: user.id,
            invoice_number: invoice.invoiceNumber,
            amount_with_vat: invoice.invoiceAmount,
            description: [
              invoice.orderDescription ? `Заказ: ${invoice.orderDescription}` : '',
              invoice.materialRequest ? `Заявка: ${invoice.materialRequest}` : '',
              invoice.materialDescription ? `Материал: ${invoice.materialDescription}` : '',
              invoice.recipientMol ? `МОЛ: ${invoice.recipientMol}` : ''
            ]
              .filter(Boolean)
              .join('\n'),
            recipient: invoice.recipientMol,
            invoice_type_id: invoice.invoiceTypeId || undefined,
            vat_amount: (invoice.invoiceAmount / 1.2 * 0.2),
            payer_id: invoice.payerId,
            supplier_id: invoice.supplierId,
            project_id: invoice.projectId,
            delivery_days: invoice.deliveryDays || 0,
            delivery_days_type: 'calendar',
            contract_id: contractId,
            status_id: 1,
            relevance_date: new Date().toISOString().split('T')[0]
          })
          .select('id')
          .single()

        if (invoiceError || !invoiceData?.id) {
          console.error('Error creating invoice:', invoiceError)
          continue
        }

        // Создать связь между договором и счетом
        if (contractId && invoiceData.id) {
          try {
            await supabase.from('contract_invoices').insert({
              contract_id: contractId,
              invoice_id: invoiceData.id
            })
          } catch (error) {
            console.error('[handleImport] Error linking contract to invoice:', error)
          }
        }

        // Создать платеж если сумма > 0
        if (invoice.paymentAmount > 0) {
          try {
            const paymentTypeId = await getBankTransferPaymentTypeId()
            const { data: payment, error: paymentError } = await supabase
              .from('payments')
              .insert({
                invoice_id: invoiceData.id,
                payment_number: 1,
                payment_date: new Date().toISOString().split('T')[0],
                amount: invoice.paymentAmount,
                status_id: 1,
                payment_type_id: paymentTypeId || undefined, // Используем найденный ID
                created_by: user.id
              })
              .select('id')
              .single()

            if (paymentError) {
              console.error('[handleImport] Error creating payment:', paymentError)
            } else if (payment?.id) {
              // Создать связь в invoice_payments
              const { error: linkError } = await supabase
                .from('invoice_payments')
                .insert({
                  invoice_id: invoiceData.id,
                  payment_id: payment.id,
                  allocated_amount: invoice.paymentAmount
                })

              if (linkError) {
                console.error('[handleImport] Error linking payment:', linkError)
              }
            }
          } catch (error) {
            console.error('[handleImport] Exception creating payment:', error)
          }
        }

        // Загрузить выбранные файлы
        const selectedFileNames = invoiceFileMapping[idx] || []
        for (const fileName of selectedFileNames) {
          try {
            const fileToUpload = uploadedFiles.find(f => f.name === fileName)
            if (fileToUpload?.originFileObj) {
              await uploadAndAttachFile(
                fileToUpload.originFileObj,
                fileName,
                invoiceData.id
              )
            }
          } catch (error) {
            console.warn('Could not attach file:', fileName, error)
          }
        }

        successCount++
      }

      message.success(`Импортировано ${successCount} счетов`)
      onSuccess()
      handleClose()
    } catch (error) {
      message.error('Ошибка при импорте: ' + (error as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    uploadedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setStep(0)
    setFileList([])
    setInvoices([])
    setUploadedFiles([])
    setPreviewFile(null)
    setInvoiceFileMapping({})
    onClose()
  }

  const fileNameList = uploadedFiles.map(f => ({ label: f.name, value: f.name }))

  const columns = [
    {
      title: 'Счет',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 100
    },
    {
      title: 'Проект',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 120,
      render: (_: string, record: ImportedInvoice) => (
        <span style={{ color: record.matchedFields.includes('projectName') ? '#52c41a' : 'inherit' }}>
          {_}
        </span>
      )
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 100,
      render: (_: string, record: ImportedInvoice) => (
        <span style={{ color: record.matchedFields.includes('supplierName') ? '#52c41a' : 'inherit' }}>
          {_}
        </span>
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'invoiceAmount',
      key: 'invoiceAmount',
      width: 100,
      render: (value: number) => value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })
    },
    {
      title: 'Файлы',
      key: 'files',
      width: 250,
      render: (_: string, _record: ImportedInvoice, index: number) => (
        <Select
          mode="multiple"
          placeholder="Выберите файлы"
          options={fileNameList}
          value={invoiceFileMapping[index] || []}
          onChange={(selected) => handleFileSelectionChange(index, selected)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Ошибки',
      key: 'errors',
      width: 150,
      render: (_: string, record: ImportedInvoice) =>
        record.errors.length > 0 ? (
          <Space size="small" wrap>
            {record.errors.map((err, i) => (
              <Tag key={i} color="red" style={{ margin: 0 }}>
                {err}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag color="green" style={{ margin: 0 }}>OK</Tag>
        )
    }
  ]

  return (
    <Modal
      title="Импорт счетов из Excel"
      open={visible}
      onCancel={handleClose}
      width="95vw"
      style={{ maxWidth: '1600px' }}
      styles={{ body: { height: '70vh', overflow: 'auto' } }}
      footer={
        step === 0
          ? [
              <Button key="cancel" onClick={handleClose}>
                Отменить
              </Button>,
              <Button key="next" type="primary" onClick={() => setStep(1)}>
                Далее
              </Button>
            ]
          : step === 1
          ? [
              <Button key="back" onClick={() => setStep(0)}>
                Назад
              </Button>,
              <Button key="cancel" onClick={handleClose}>
                Отменить
              </Button>,
              <Button key="next" type="primary" disabled={fileList.length === 0} onClick={() => setStep(2)}>
                Далее
              </Button>
            ]
          : [
              <Button key="back" onClick={() => setStep(1)}>
                Назад
              </Button>,
              <Button key="cancel" onClick={handleClose}>
                Отменить
              </Button>,
              <Button
                key="import"
                type="primary"
                loading={importing}
                onClick={handleImport}
                disabled={invoices.filter(i => i.errors.length === 0).length === 0}
              >
                Импортировать ({invoices.filter(i => i.errors.length === 0).length} счетов)
              </Button>
            ]
      }
    >
      <Steps
        current={step}
        items={[
          { title: 'Файлы', description: 'Загрузите файлы' },
          { title: 'Excel', description: 'Выберите таблицу' },
          { title: 'Подбор', description: 'Привяжите файлы' }
        ]}
        style={{ marginBottom: 24 }}
      />

      {step === 0 && (
        <div>
          <h3>Загрузка файлов с компьютера</h3>
          <Upload
            multiple
            fileList={uploadedFiles}
            onChange={handleUploadFilesChange}
            beforeUpload={() => false}
            listType="picture"
            showUploadList={{
              showPreviewIcon: true,
              previewIcon: <EyeOutlined />
            }}
          >
            <Button icon={<UploadOutlined />}>
              Выбрать или перетащить файлы
            </Button>
          </Upload>
          <p style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
            💡 Загрузите файлы, которые будут привязаны к счетам
          </p>
        </div>
      )}

      {step === 1 && (
        <div>
          <h3>Импорт Excel файла</h3>
          <Upload.Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            fileList={fileList}
            onChange={handleFileChange}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите файл Excel</p>
          </Upload.Dragger>
        </div>
      )}

      {step === 2 && (
        <Spin spinning={importing}>
          <div>
            <h3>Привязка файлов к счетам</h3>
            <p style={{ marginBottom: 16, color: '#666' }}>
              Загруженные файлы: <strong>{uploadedFiles.length}</strong>
            </p>
            <Table
              dataSource={invoices}
              columns={columns}
              rowKey={(record, index) => record.invoiceNumber || String(index)}
              pagination={{ pageSize: 5, showSizeChanger: true }}
              size="small"
              scroll={{ x: 1200, y: 400 }}
            />
          </div>
        </Spin>
      )}

      <Modal
        open={!!previewFile}
        title={previewFile?.name}
        footer={null}
        onCancel={() => setPreviewFile(null)}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { textAlign: 'center', maxHeight: '85vh', overflow: 'auto' } }}
      >
        {previewFile && (
          previewFile.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
            <img
              alt={previewFile.name}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              src={previewFile.url}
            />
          ) : (
            <iframe
              title={previewFile.name}
              src={previewFile.url}
              style={{ width: '100%', height: '80vh', border: 'none' }}
            />
          )
        )}
      </Modal>
    </Modal>
  )
}
