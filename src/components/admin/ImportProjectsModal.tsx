import React, { useState } from 'react'
import { Modal, Button, Upload, Table, message, Space, Typography, Tag, Alert, Progress } from 'antd'
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import { useAuth } from '../../contexts/AuthContext'

const { Text, Title } = Typography

interface ImportResult {
  row: number
  code: string
  name: string
  description: string
  status: 'success' | 'skip' | 'error'
  message?: string
}

interface ProjectData {
  code: string
  name: string
  description?: string
  is_active?: boolean
}

interface ImportProjectsModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ImportProjectsModal: React.FC<ImportProjectsModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [parsedData, setParsedData] = useState<ProjectData[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [duplicateCheck, setDuplicateCheck] = useState<{ codes: string[], names: string[] }>({ codes: [], names: [] })

  // Очистка данных при закрытии модального окна
  const handleClose = () => {
    setParsedData([])
    setImportResults([])
    setStep('upload')
    setDuplicateCheck({ codes: [], names: [] })
    onClose()
  }

  // Функция для очистки и нормализации строковых значений
  const cleanString = (value: unknown): string => {
    if (!value) return ''
    return String(value)
      .replace(/^\uFEFF/, '') // Убираем BOM
      .trim()
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
  }

  // Обработка загруженного Excel файла
  const handleFileUpload = async (file: File | { originFileObj?: File; name?: string }) => {
    const fileName = file instanceof File ? file.name : (file.name || 'unknown')
    console.log('[ImportProjectsModal.handleFileUpload] Processing file:', fileName)

    const hideLoading = message.loading('Читаем Excel файл...', 0)

    try {
      // Определяем файл для чтения
      const fileToRead = file instanceof File ? file : file.originFileObj

      if (!fileToRead) {
        throw new Error('Не удалось получить файл')
      }

      // Читаем файл как ArrayBuffer
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            throw new Error('Не удалось прочитать файл')
          }

          // Парсим Excel файл
          const workbook = XLSX.read(data, { type: 'array' })

          // Берем первый лист
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // Преобразуем в JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false })

          console.log('[ImportProjectsModal.handleFileUpload] Parsed data:', jsonData)

          // Логируем первую строку для отладки
          if (jsonData.length > 0) {
            console.log('[ImportProjectsModal.handleFileUpload] First row keys:', Object.keys(jsonData[0]))
            console.log('[ImportProjectsModal.handleFileUpload] First row data:', jsonData[0])
          }

          // Проверяем наличие данных
          if (!jsonData || jsonData.length === 0) {
            message.error('Файл не содержит данных')
            hideLoading()
            return false
          }

          // Маппинг колонок Excel на поля базы данных
          const projects: ProjectData[] = (jsonData as Record<string, unknown>[]).map((row) => {
            // Получаем все ключи строки
            const keys = Object.keys(row)

            // Функция для поиска значения по возможным названиям колонок (case-insensitive)
            const findValue = (possibleNames: string[]): string => {
              for (const key of keys) {
                // Пропускаем ключи вида __EMPTY, __EMPTY_1 и т.д.
                if (key.startsWith('__EMPTY')) continue

                const normalizedKey = key.toLowerCase().trim()
                for (const name of possibleNames) {
                  if (normalizedKey.includes(name.toLowerCase())) {
                    return cleanString(row[key])
                  }
                }
              }
              return ''
            }

            // Если в Excel нет заголовков, используем колонки по индексам
            const values = Object.values(row).map(v => cleanString(v))

            // Пытаемся найти колонки по различным возможным названиям
            let code = findValue(['код', 'code', 'project code', 'номер', '№', 'шифр'])
            let name = findValue(['название', 'name', 'наименование', 'project', 'проект', 'объект'])
            let description = findValue(['описание', 'description', 'комментарий', 'comment', 'примечание', 'note'])

            // Если не нашли по названиям колонок, пробуем по индексам
            if (!code && !name && !description && values.length >= 2) {
              // Предполагаем: 1я колонка - код, 2я - название, 3я - описание
              code = values[0] || ''
              name = values[1] || ''
              description = values[2] || ''
            }

            // Если все еще нет названия, но есть хотя бы одно значение, берем первое непустое
            if (!name && values.length > 0) {
              const firstNonEmpty = values.find(v => v && v.length > 0)
              if (firstNonEmpty) {
                name = firstNonEmpty
              }
            }

            return {
              code,
              name,
              description,
              is_active: true
            }
          }).filter(p => p.name) // Фильтруем строки без названия

          if (projects.length === 0) {
            console.error('[ImportProjectsModal.handleFileUpload] No projects found after mapping')
            console.error('[ImportProjectsModal.handleFileUpload] Sample raw data:', jsonData.slice(0, 3))

            // Более информативное сообщение об ошибке
            message.error(
              <div>
                <p>Не найдено проектов для импорта.</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  Убедитесь, что файл содержит колонку "Название" или данные расположены во второй колонке.
                </p>
              </div>,
              10
            )
            hideLoading()
            return false
          }

          // Проверяем на дубликаты в базе данных
          const codes = projects.map(p => p.code).filter(c => c)
          const names = projects.map(p => p.name).filter(n => n)

          const { data: existingProjects } = await supabase
            .from('projects')
            .select('code, name')
            .or(`code.in.(${codes.join(',')}),name.in.(${names.map(n => `"${n}"`).join(',')})`)

          const existingCodes = existingProjects?.map(p => p.code).filter(Boolean) || []
          const existingNames = existingProjects?.map(p => p.name) || []

          setDuplicateCheck({ codes: existingCodes, names: existingNames })
          setParsedData(projects)
          setStep('preview')
          message.success(`Загружено ${projects.length} проектов из файла`)
        } catch (error) {
          console.error('[ImportProjectsModal.handleFileUpload] Parse error:', error)
          message.error(`Ошибка чтения файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
        } finally {
          hideLoading()
        }
      }

      reader.onerror = () => {
        hideLoading()
        message.error('Ошибка чтения файла')
      }

      reader.readAsArrayBuffer(fileToRead)
    } catch (error) {
      console.error('[ImportProjectsModal.handleFileUpload] Error:', error)
      hideLoading()
      message.error('Ошибка при загрузке файла')
    }

    return false // Предотвращаем автоматическую загрузку
  }

  // Импорт данных в базу
  const handleImport = async () => {
    setImporting(true)
    const results: ImportResult[] = []

    try {
      for (let i = 0; i < parsedData.length; i++) {
        const project = parsedData[i]
        const row = i + 2 // +2 потому что строка 1 - заголовки, нумерация с 1

        try {
          // Проверяем на дубликаты
          if (duplicateCheck.codes.includes(project.code) || duplicateCheck.names.includes(project.name)) {
            results.push({
              row,
              code: project.code,
              name: project.name,
              description: project.description || '',
              status: 'skip',
              message: 'Проект уже существует'
            })
            continue
          }

          // Добавляем проект в базу
          const { error } = await supabase
            .from('projects')
            .insert([{
              code: project.code || null,
              name: project.name,
              description: project.description || null,
              is_active: project.is_active,
              created_by: user?.id
            }])

          if (error) throw error

          results.push({
            row,
            code: project.code,
            name: project.name,
            description: project.description || '',
            status: 'success',
            message: 'Успешно импортирован'
          })

          // Добавляем в список дубликатов для последующих проверок
          if (project.code) duplicateCheck.codes.push(project.code)
          duplicateCheck.names.push(project.name)

        } catch (error) {
          console.error(`[ImportProjectsModal.handleImport] Error on row ${row}:`, error)
          results.push({
            row,
            code: project.code,
            name: project.name,
            description: project.description || '',
            status: 'error',
            message: error.message || 'Ошибка при импорте'
          })
        }
      }

      setImportResults(results)
      setStep('result')

      const successCount = results.filter(r => r.status === 'success').length
      const skipCount = results.filter(r => r.status === 'skip').length
      const errorCount = results.filter(r => r.status === 'error').length

      if (successCount > 0) {
        message.success(`Успешно импортировано: ${successCount} проектов`)
        onSuccess()
      }
      if (skipCount > 0) {
        message.warning(`Пропущено (уже существуют): ${skipCount} проектов`)
      }
      if (errorCount > 0) {
        message.error(`Ошибки при импорте: ${errorCount} проектов`)
      }

    } catch (error) {
      console.error('[ImportProjectsModal.handleImport] Error:', error)
      message.error('Произошла ошибка при импорте')
    } finally {
      setImporting(false)
    }
  }

  // Скачать шаблон Excel
  const downloadTemplate = () => {
    const ws_data = [
      ['Код', 'Название', 'Описание'],
      ['PROJ-001', 'Проект 1', 'Описание проекта 1'],
      ['PROJ-002', 'Проект 2', 'Описание проекта 2']
    ]

    const ws = XLSX.utils.aoa_to_sheet(ws_data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Projects')

    // Устанавливаем ширину колонок
    ws['!cols'] = [
      { wch: 15 }, // Код
      { wch: 40 }, // Название
      { wch: 60 }  // Описание
    ]

    XLSX.writeFile(wb, 'projects_template.xlsx')
    message.success('Шаблон скачан')
  }

  // Колонки для таблицы предпросмотра
  const previewColumns = [
    {
      title: '№',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => code || <Text type="secondary">—</Text>
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => {
        const isDuplicate = duplicateCheck.names.includes(name)
        return isDuplicate ? (
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <Text>{name}</Text>
          </Space>
        ) : name
      }
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || <Text type="secondary">—</Text>
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_: unknown, record: ProjectData) => {
        const isDuplicateCode = record.code && duplicateCheck.codes.includes(record.code)
        const isDuplicateName = duplicateCheck.names.includes(record.name)

        if (isDuplicateCode || isDuplicateName) {
          return <Tag color="warning">Дубликат</Tag>
        }
        return <Tag color="success">Новый</Tag>
      }
    }
  ]

  // Колонки для таблицы результатов
  const resultColumns = [
    {
      title: 'Строка',
      dataIndex: 'row',
      key: 'row',
      width: 70
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => code || <Text type="secondary">—</Text>
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: 'success' | 'skip' | 'error') => {
        const config = {
          success: { color: 'success', icon: <CheckCircleOutlined />, text: 'Успех' },
          skip: { color: 'warning', icon: <WarningOutlined />, text: 'Пропущен' },
          error: { color: 'error', icon: <CloseCircleOutlined />, text: 'Ошибка' }
        }
        const cfg = config[status]
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.text}
          </Tag>
        )
      }
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    }
  ]

  // Статистика импорта
  const getImportStats = () => {
    const total = importResults.length
    const success = importResults.filter(r => r.status === 'success').length
    const skip = importResults.filter(r => r.status === 'skip').length
    const error = importResults.filter(r => r.status === 'error').length

    return { total, success, skip, error }
  }

  const stats = getImportStats()

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined />
          <span>Импорт проектов из Excel</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={
        step === 'upload' ? [
          <Button key="template" icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Скачать шаблон
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>
        ] : step === 'preview' ? [
          <Button key="back" onClick={() => setStep('upload')}>
            Назад
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            onClick={handleImport}
            loading={importing}
            disabled={parsedData.length === 0}
          >
            Импортировать ({parsedData.length})
          </Button>
        ] : [
          <Button key="close" type="primary" onClick={handleClose}>
            Закрыть
          </Button>
        ]
      }
    >
      {step === 'upload' && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="Формат файла"
            description={
              <div>
                <p>Excel файл должен содержать колонки:</p>
                <ul style={{ marginBottom: 8 }}>
                  <li><strong>Код</strong> - уникальный код проекта (необязательно)</li>
                  <li><strong>Название</strong> - название проекта (обязательно)</li>
                  <li><strong>Описание</strong> - описание проекта (необязательно)</li>
                </ul>
                <p style={{ marginBottom: 0 }}>
                  Первая строка должна содержать заголовки колонок.
                </p>
              </div>
            }
            type="info"
            showIcon
          />

          <Upload
            accept=".xlsx,.xls"
            beforeUpload={handleFileUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} size="large" type="primary">
              Выбрать Excel файл
            </Button>
          </Upload>

          <Text type="secondary">
            Поддерживаются форматы: .xlsx, .xls
          </Text>
        </Space>
      )}

      {step === 'preview' && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message={`Найдено ${parsedData.length} проектов для импорта`}
            description={
              duplicateCheck.codes.length > 0 || duplicateCheck.names.length > 0
                ? `Обнаружены дубликаты: ${duplicateCheck.codes.length + duplicateCheck.names.length}. Они будут пропущены при импорте.`
                : 'Все проекты новые и будут импортированы.'
            }
            type={duplicateCheck.codes.length > 0 || duplicateCheck.names.length > 0 ? 'warning' : 'success'}
            showIcon
          />

          <Table
            columns={previewColumns}
            dataSource={parsedData}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 400 }}
            rowKey={(record, index) => index?.toString() || '0'}
          />
        </Space>
      )}

      {step === 'result' && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Результаты импорта</Title>
            <Space wrap>
              <Tag color="blue">Всего: {stats.total}</Tag>
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Успешно: {stats.success}
              </Tag>
              <Tag color="warning" icon={<WarningOutlined />}>
                Пропущено: {stats.skip}
              </Tag>
              <Tag color="error" icon={<CloseCircleOutlined />}>
                Ошибки: {stats.error}
              </Tag>
            </Space>
          </div>

          {stats.total > 0 && (
            <Progress
              percent={Math.round((stats.success / stats.total) * 100)}
              status={stats.error > 0 ? 'exception' : 'normal'}
              format={() => `${stats.success} из ${stats.total}`}
            />
          )}

          <Table
            columns={resultColumns}
            dataSource={importResults}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 400 }}
            rowKey="row"
          />
        </Space>
      )}
    </Modal>
  )
}