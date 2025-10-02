import React, { useState } from 'react'
import { Modal, Button, Upload, message, Alert, Space } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import { parseCSVContent, type ParsedContractor } from './ImportContractorsUtils'
import { ImportContractorsPreview } from './ImportContractorsPreview'
import { ImportContractorsResult, type ImportResult } from './ImportContractorsResult'
import { isErrorWithCode } from '../../types/common'

interface ImportContractorsModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ImportContractorsModal: React.FC<ImportContractorsModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const [parsedData, setParsedData] = useState<ParsedContractor[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')

  // Обработка загруженного файла
  const handleFileUpload = (file: any) => {
    console.log('[ImportContractorsModal.handleFileUpload] Called with:', file)
    console.log('[ImportContractorsModal.handleFileUpload] File type:', Object.prototype.toString.call(file))
    console.log('[ImportContractorsModal.handleFileUpload] File properties:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      lastModified: file?.lastModified,
      originFileObj: file?.originFileObj,
      hasOriginFileObj: !!file?.originFileObj
    })

    // Показываем индикатор загрузки сразу
    const hideLoading = message.loading('Читаем файл...', 0)

    try {
      // Определяем файл для чтения
      let fileToRead: File | Blob | null = null

      // Ant Design может передавать файл в разных форматах
      if (file instanceof File) {
        fileToRead = file
        console.log('[ImportContractorsModal.handleFileUpload] Direct File object')
      } else if (file instanceof Blob) {
        fileToRead = file
        console.log('[ImportContractorsModal.handleFileUpload] Direct Blob object')
      } else if (file?.originFileObj instanceof File) {
        fileToRead = file.originFileObj
        console.log('[ImportContractorsModal.handleFileUpload] Using originFileObj (File)')
      } else if (file?.originFileObj instanceof Blob) {
        fileToRead = file.originFileObj
        console.log('[ImportContractorsModal.handleFileUpload] Using originFileObj (Blob)')
      } else {
        console.error('[ImportContractorsModal.handleFileUpload] Cannot determine file object')
        hideLoading()
        message.error('Не удалось определить тип файла')
        return false
      }

      console.log('[ImportContractorsModal.handleFileUpload] Will read file:', fileToRead)

      if (!fileToRead) {
        console.error('[ImportContractorsModal.handleFileUpload] No file to read')
        hideLoading()
        message.error('Не удалось прочитать файл')
        return false
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          console.log('[ImportContractorsModal.handleFileUpload] FileReader.onload triggered')
          const content = e.target?.result as string
          console.log('[ImportContractorsModal.handleFileUpload] Content length:', content?.length)
          console.log('[ImportContractorsModal.handleFileUpload] First 200 chars:', content?.substring(0, 200))

          // Убираем индикатор загрузки
          hideLoading()

          if (!content || content.length === 0) {
            console.error('[ImportContractorsModal.handleFileUpload] File content is empty!')
            message.error('Файл пустой или не удалось прочитать содержимое')
            return
          }

          try {
            const contractors = parseCSVContent(content)
            setParsedData(contractors)
            setStep('preview')

            if (contractors.filter(c => c.valid).length === 0) {
              message.error('Нет корректных данных для импорта')
            } else {
              message.success(`Распознано ${contractors.filter(c => c.valid).length} корректных записей`)
            }
          } catch (error) {
            console.error('[ImportContractorsModal.handleFileUpload] Parse error:', error)
            message.error('Ошибка при разборе файла: ' + (error as Error).message)
          }
        } catch (err) {
          console.error('[ImportContractorsModal.handleFileUpload] Error in onload:', err)
          hideLoading()
          message.error('Ошибка при обработке файла')
        }
      }

      reader.onerror = (error) => {
        console.error('[ImportContractorsModal.handleFileUpload] FileReader error:', error)
        hideLoading()
        message.error('Ошибка при чтении файла')
      }

      reader.onabort = () => {
        console.warn('[ImportContractorsModal.handleFileUpload] FileReader aborted')
        hideLoading()
        message.warning('Чтение файла было прервано')
      }

      // Читаем файл
      console.log('[ImportContractorsModal.handleFileUpload] Starting FileReader.readAsText')
      reader.readAsText(fileToRead, 'utf-8')

    } catch (error) {
      console.error('[ImportContractorsModal.handleFileUpload] Caught error:', error)
      hideLoading()
      message.error('Ошибка при обработке файла')
    }

    return false // Prevent automatic upload
  }

  // Импорт в базу данных
  const handleImport = async () => {
    const validContractors = parsedData.filter(c => c.valid)

    if (validContractors.length === 0) {
      message.error('Нет данных для импорта')
      return
    }

    setImporting(true)
    const results: ImportResult[] = []

    try {
      for (const contractor of validContractors) {
        try {
          // Проверяем существование
          const { data: existing } = await supabase
            .from('contractors')
            .select('id')
            .eq('inn', contractor.inn)
            .single()

          if (existing) {
            results.push({
              line: contractor.line,
              name: contractor.name,
              inn: contractor.inn,
              status: 'skip',
              message: 'Контрагент с таким ИНН уже существует'
            })
            continue
          }

          // Создаем нового контрагента
          const { error } = await supabase
            .from('contractors')
            .insert({
              name: contractor.name,
              inn: contractor.inn
            })

          if (error) throw error

          results.push({
            line: contractor.line,
            name: contractor.name,
            inn: contractor.inn,
            status: 'success',
            message: 'Успешно импортирован'
          })

        } catch (error: unknown) {
          results.push({
            line: contractor.line,
            name: contractor.name,
            inn: contractor.inn,
            status: 'error',
            message: isErrorWithCode(error) && error.message ? error.message : 'Неизвестная ошибка'
          })
        }
      }

      setImportResults(results)
      setStep('result')

      const successCount = results.filter(r => r.status === 'success').length
      const skipCount = results.filter(r => r.status === 'skip').length
      const errorCount = results.filter(r => r.status === 'error').length

      if (successCount > 0) {
        message.success(`Успешно импортировано: ${successCount}`)
        onSuccess()
      }

      if (skipCount > 0) {
        message.info(`Пропущено (уже существуют): ${skipCount}`)
      }

      if (errorCount > 0) {
        message.error(`Ошибок: ${errorCount}`)
      }

    } catch (error) {
      console.error('Import error:', error)
      message.error('Ошибка при импорте данных')
    } finally {
      setImporting(false)
    }
  }

  // Сброс состояния
  const handleReset = () => {
    setParsedData([])
    setImportResults([])
    setStep('upload')
  }

  // Закрытие модала
  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Modal
      title="Импорт контрагентов из CSV"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={
        step === 'upload' ? [
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>
        ] : step === 'preview' ? [
          <Button key="back" onClick={handleReset}>
            Назад
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importing}
            onClick={handleImport}
            disabled={parsedData.filter(c => c.valid).length === 0}
          >
            Импортировать ({parsedData.filter(c => c.valid).length} записей)
          </Button>
        ] : [
          <Button key="new" type="primary" onClick={handleReset}>
            Импортировать еще
          </Button>,
          <Button key="close" onClick={handleClose}>
            Закрыть
          </Button>
        ]
      }
    >
      {step === 'upload' && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Формат CSV файла"
            description={
              <div>
                <p>Файл должен быть в формате CSV с разделителем точка с запятой (;)</p>
                <p>Первая строка - заголовки: <code>Контрагент;ИНН Контрагента</code></p>
                <p>Последующие строки - данные контрагентов</p>
              </div>
            }
            type="info"
            showIcon
          />

          {/* Временная альтернативная кнопка для отладки */}
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-upload-input"
              onChange={(e) => {
                console.log('[ImportContractorsModal] Native input onChange')
                const file = e.target.files?.[0]
                if (file) {
                  console.log('[ImportContractorsModal] Native file selected:', file)
                  handleFileUpload(file)
                }
              }}
            />
            <Button
              onClick={() => {
                console.log('[ImportContractorsModal] Triggering native file input')
                document.getElementById('csv-upload-input')?.click()
              }}
            >
              Альтернативная загрузка (для отладки)
            </Button>
          </div>

          <Upload.Dragger
            accept=".csv"
            beforeUpload={handleFileUpload}
            maxCount={1}
            showUploadList={false}
            onDrop={(e) => {
              console.log('[ImportContractorsModal] Files dropped:', e.dataTransfer.files)
            }}
            onChange={(info) => {
              console.log('[ImportContractorsModal] Upload onChange:', info)
              if (info.file.status === 'error') {
                console.error('[ImportContractorsModal] Upload error status')
              }
            }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              Нажмите или перетащите CSV файл для загрузки
            </p>
            <p className="ant-upload-hint">
              Поддерживается только CSV формат с разделителем ";"
            </p>
          </Upload.Dragger>
        </Space>
      )}

      {step === 'preview' && <ImportContractorsPreview data={parsedData} />}

      {step === 'result' && <ImportContractorsResult results={importResults} />}
    </Modal>
  )
}