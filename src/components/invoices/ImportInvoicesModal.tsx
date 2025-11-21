import { useState } from 'react'
import { Modal, Upload, Button, Steps, Table, Tag, Space, Spin, message, Select } from 'antd'
import { UploadOutlined, InboxOutlined } from '@ant-design/icons'
import type { UploadFile, UploadChangeParam } from 'antd/es/upload/interface'
import {
  parseInvoiceExcelFile,
  mapExcelRowsToInvoices,
  enrichInvoicesWithMatching,
  type ImportedInvoice
} from '../../services/invoice/invoiceImportService'
import { useAuth } from '../../contexts/AuthContext'
import {
  uploadAndAttachFile,
  getOrCreateContract,
  createInvoiceRecord,
  linkContractToInvoice,
  createPaymentForInvoice
} from '../../services/invoice/invoiceImportOperations'
import { supabase } from '../../lib/supabase'
import { stripInvisibleCharacters } from '../../utils/textUtils'

interface ImportInvoicesModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ImportInvoicesModal: React.FC<ImportInvoicesModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])
  const [invoices, setInvoices] = useState<ImportedInvoice[]>([])
  const [importing, setImporting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [invoiceFileMapping, setInvoiceFileMapping] = useState<Record<number, string[]>>({})

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
      
      const autoMapping: Record<number, string[]> = {}
      enriched.forEach((invoice, index) => {
        const linkedFiles: string[] = []
        if (invoice.fileLinks && invoice.fileLinks.length > 0) {
          invoice.fileLinks.forEach(fileLink => {
            const cleanedLink = stripInvisibleCharacters(fileLink)
            const baseName = cleanedLink.split(/[/\\]/).pop() || ''
            
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
      for (let idx = 0; idx < invoices.length; idx++) {
        const invoice = invoices[idx]
        if (invoice.errors.length > 0) continue

        // Проверить существование
        try {
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('invoice_number', invoice.invoiceNumber)
            .eq('project_id', invoice.projectId)
            .single()

          if (existingInvoice?.id) continue
        } catch (error) {
          // Not found or error - continue
        }

        // Создать договор
        const contractId = await getOrCreateContract(invoice, String(invoice.projectId), user.id)

        // Создать счет
        const invoiceId = await createInvoiceRecord(invoice, contractId, user.id)
        if (!invoiceId) continue

        // Связать договор и счет
        if (contractId) {
          await linkContractToInvoice(contractId, invoiceId)
        }

        // Создать платеж
        await createPaymentForInvoice(invoice, invoiceId, user.id)

        // Загрузить файлы
        const selectedFileNames = invoiceFileMapping[idx] || []
        for (const fileName of selectedFileNames) {
          try {
            const fileToUpload = uploadedFiles.find(f => f.name === fileName)
            if (fileToUpload?.originFileObj) {
              await uploadAndAttachFile(
                fileToUpload.originFileObj,
                fileName,
                invoiceId,
                user.id
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
              showPreviewIcon: true
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
    </Modal>
  )
}
