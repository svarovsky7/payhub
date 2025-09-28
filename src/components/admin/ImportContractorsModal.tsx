import React, { useState } from 'react'
import { Modal, Button, Upload, Table, message, Space, Typography, Tag, Alert } from 'antd'
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'
import { supabase } from '../../lib/supabase'

const { Text, Title } = Typography

interface ImportResult {
  line: number
  name: string
  inn: string
  status: 'success' | 'skip' | 'error'
  message?: string
}

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
  const [fileContent, setFileContent] = useState<string>('')
  const [parsedData, setParsedData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')

  // Функция для обработки ИНН в научной нотации
  const processINN = (innValue: string): string => {
    console.log('[ImportContractorsModal.processINN] Input:', innValue)

    // Если значение содержит 'E+', это научная нотация
    if (innValue.includes('E+') || innValue.includes('e+')) {
      console.log('[ImportContractorsModal.processINN] Scientific notation detected')
      // Преобразуем научную нотацию в обычное число
      const num = parseFloat(innValue)
      const result = Math.round(num).toString()
      console.log('[ImportContractorsModal.processINN] Converted from scientific:', result)
      return result
    }

    // Убираем все пробелы и нечисловые символы кроме цифр
    const cleaned = innValue.replace(/[^\d]/g, '')
    console.log('[ImportContractorsModal.processINN] Cleaned:', cleaned)
    return cleaned
  }

  // Функция для очистки названия компании
  const cleanCompanyName = (name: string): string => {
    return name
      .replace(/^\uFEFF/, '') // Убираем BOM (Byte Order Mark)
      .replace(/^["'«»""]|["'«»""]$/g, '') // Убираем кавычки в начале и конце
      .trim()
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .replace(/;/g, '') // Убираем точки с запятой
      .trim()
  }

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

          setFileContent(content)
          parseCSV(content)
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

  // Парсинг CSV
  const parseCSV = (content: string) => {
    console.log('[ImportContractorsModal.parseCSV] Starting parse, content length:', content?.length)

    try {
      if (!content) {
        console.error('[ImportContractorsModal.parseCSV] Content is empty!')
        message.error('Файл пустой')
        return
      }

      // Убираем BOM из начала файла, если он есть
      const cleanContent = content.replace(/^\uFEFF/, '')
      console.log('[ImportContractorsModal.parseCSV] BOM removed, clean content starts with:', cleanContent.substring(0, 50))

      const lines = cleanContent.split('\n')
      console.log('[ImportContractorsModal.parseCSV] Lines count:', lines.length)

      if (lines.length < 2) {
        console.error('[ImportContractorsModal.parseCSV] Not enough lines in file')
        message.error('Файл не содержит данных')
        return
      }

      const headers = lines[0].split(';').map(h => h.trim())
      console.log('[ImportContractorsModal.parseCSV] Headers:', headers)

      const contractors = []
      const errors = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) {
          console.log(`[ImportContractorsModal.parseCSV] Line ${i + 1} is empty, skipping`)
          continue
        }

        const values = line.split(';')
        console.log(`[ImportContractorsModal.parseCSV] Line ${i + 1} values:`, values)

        if (values.length < 2) {
          console.warn(`[ImportContractorsModal.parseCSV] Line ${i + 1} has insufficient values:`, values)
          continue
        }

        const name = cleanCompanyName(values[0])
        const originalInn = values[1]
        const inn = processINN(values[1])

        console.log(`[ImportContractorsModal.parseCSV] Line ${i + 1} processed:`, {
          name,
          originalInn,
          processedInn: inn
        })

        // Валидация ИНН
        let error = null
        if (!inn || (inn.length !== 10 && inn.length !== 12)) {
          error = `Некорректный ИНН (должен быть 10 или 12 цифр, получено: ${inn ? inn.length : 0})`
          console.warn(`[ImportContractorsModal.parseCSV] Line ${i + 1} validation error:`, error)
        }

        contractors.push({
          key: i,
          line: i + 1,
          name: name,
          inn: inn,
          originalInn: originalInn,
          error: error,
          valid: !error
        })
      }

      console.log('[ImportContractorsModal.parseCSV] Parsed contractors:', {
        total: contractors.length,
        valid: contractors.filter(c => c.valid).length,
        invalid: contractors.filter(c => !c.valid).length,
        contractors
      })

      setParsedData(contractors)
      setStep('preview')

      if (contractors.filter(c => c.valid).length === 0) {
        message.error('Нет корректных данных для импорта')
      } else {
        message.success(`Распознано ${contractors.filter(c => c.valid).length} корректных записей`)
      }
    } catch (error) {
      console.error('[ImportContractorsModal.parseCSV] Parse error:', error)
      message.error('Ошибка при разборе файла: ' + (error as Error).message)
    }
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

        } catch (error: any) {
          results.push({
            line: contractor.line,
            name: contractor.name,
            inn: contractor.inn,
            status: 'error',
            message: error.message
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
    setFileContent('')
    setParsedData([])
    setImportResults([])
    setStep('upload')
  }

  // Закрытие модала
  const handleClose = () => {
    handleReset()
    onClose()
  }

  // Колонки для таблицы предпросмотра
  const previewColumns = [
    {
      title: '№',
      dataIndex: 'line',
      key: 'line',
      width: 60
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 150,
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text>{text}</Text>
          {record.originalInn !== text && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Исходный: {record.originalInn}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'valid',
      key: 'valid',
      width: 120,
      render: (valid: boolean, record: any) => (
        valid ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Корректно
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Ошибка
          </Tag>
        )
      )
    },
    {
      title: 'Примечание',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => error && (
        <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>
      )
    }
  ]

  // Колонки для таблицы результатов
  const resultColumns = [
    {
      title: '№',
      dataIndex: 'line',
      key: 'line',
      width: 60
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 150
    },
    {
      title: 'Результат',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        switch (status) {
          case 'success':
            return <Tag color="success" icon={<CheckCircleOutlined />}>Импортирован</Tag>
          case 'skip':
            return <Tag color="warning" icon={<WarningOutlined />}>Пропущен</Tag>
          case 'error':
            return <Tag color="error" icon={<CloseCircleOutlined />}>Ошибка</Tag>
          default:
            return null
        }
      }
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text style={{ fontSize: 12 }}>{message}</Text>
      )
    }
  ]

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

      {step === 'preview' && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Всего записей: {parsedData.length}</Text>
            <br />
            <Text type="success">Корректных: {parsedData.filter(c => c.valid).length}</Text>
            <br />
            <Text type="danger">С ошибками: {parsedData.filter(c => !c.valid).length}</Text>
          </div>

          <Table
            columns={previewColumns}
            dataSource={parsedData}
            size="small"
            scroll={{ y: 400 }}
            pagination={false}
          />
        </Space>
      )}

      {step === 'result' && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Title level={5}>Результаты импорта</Title>
            <Space>
              <Tag color="success">
                Импортировано: {importResults.filter(r => r.status === 'success').length}
              </Tag>
              <Tag color="warning">
                Пропущено: {importResults.filter(r => r.status === 'skip').length}
              </Tag>
              <Tag color="error">
                Ошибок: {importResults.filter(r => r.status === 'error').length}
              </Tag>
            </Space>
          </div>

          <Table
            columns={resultColumns}
            dataSource={importResults}
            size="small"
            scroll={{ y: 400 }}
            pagination={false}
          />
        </Space>
      )}
    </Modal>
  )
}