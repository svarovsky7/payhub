import { useState } from 'react'
import { Modal, Upload, Button, Table, Steps, message, Progress, Tag } from 'antd'
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'
import type { ColumnsType } from 'antd/es/table'
import {
  loadMaterialClasses,
  createMaterialClass,
} from '../../services/materialClassOperations'
import {
  loadMaterialNomenclature,
  createMaterialNomenclature,
} from '../../services/materialNomenclatureOperations'

interface ImportModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportItem {
  class: string
  subclass: string
  nomenclature: string
  unit?: string
}

interface ProcessedItem extends ImportItem {
  classId?: number
  subclassId?: number
  nomenclatureId?: number
  status: 'pending' | 'success' | 'error' | 'exists'
  message?: string
}

export const ImportNomenclatureModal = ({ visible, onClose, onSuccess }: ImportModalProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [importData, setImportData] = useState<ImportItem[]>([])
  const [processedData, setProcessedData] = useState<ProcessedItem[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  const handleFileRead = async (file: RcFile) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      // Извлекаем данные из структуры JSON
      const items: ImportItem[] = []

      if (json.results?.[0]?.tables?.[0]?.rows) {
        const rows = json.results[0].tables[0].rows

        rows.forEach((row: Record<string, string>) => {
          const classValue = row['[Класс]'] || row['Класс'] || ''
          const subclassValue = row['[Подкласс]'] || row['Подкласс'] || ''
          const nomenclatureValue = row['[Номенклатура]'] || row['Номенклатура'] || ''

          if (classValue && nomenclatureValue) {
            // Извлекаем единицу измерения из названия номенклатуры если есть
            const unitMatch = nomenclatureValue.match(/\(([^)]+)\)[^(]*$/)
            const unit = unitMatch ? unitMatch[1] : 'шт'
            const cleanName = nomenclatureValue.replace(/\s*\([^)]+\)[^(]*$/g, '').trim()

            items.push({
              class: classValue.trim(),
              subclass: subclassValue.trim(),
              nomenclature: cleanName,
              unit: unit
            })
          }
        })
      }

      // Удаляем дубликаты
      const uniqueItems = items.filter((item, index, self) =>
        index === self.findIndex((i) =>
          i.class === item.class &&
          i.subclass === item.subclass &&
          i.nomenclature === item.nomenclature
        )
      )

      if (uniqueItems.length === 0) {
        message.error('Не найдено данных для импорта в файле')
        return false
      }

      setImportData(uniqueItems)
      setCurrentStep(1)
      return false // Prevent default upload
    } catch (error) {
      console.error('[ImportNomenclatureModal] Error parsing file:', error)
      message.error('Ошибка чтения файла. Проверьте формат JSON.')
      return false
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setCurrentStep(2)

    try {
      // Загружаем существующие классы и номенклатуру
      const existingClasses = await loadMaterialClasses()
      const existingNomenclatures = await loadMaterialNomenclature()

      const processed: ProcessedItem[] = []
      const classMap = new Map<string, number>()
      const subclassMap = new Map<string, number>()

      // Создаем Map существующих классов
      existingClasses.forEach(cls => {
        if (cls.parent_id === null) {
          classMap.set(cls.name.toLowerCase(), cls.id)
        } else {
          const parent = existingClasses.find(c => c.id === cls.parent_id)
          if (parent) {
            subclassMap.set(`${parent.name.toLowerCase()}:${cls.name.toLowerCase()}`, cls.id)
          }
        }
      })

      let processedCount = 0

      for (const item of importData) {
        processedCount++
        setImportProgress(Math.round((processedCount / importData.length) * 100))

        const processedItem: ProcessedItem = { ...item, status: 'pending' }

        try {
          // 1. Обработка класса
          let classId = classMap.get(item.class.toLowerCase())

          if (!classId) {
            // Создаем новый класс
            const newClass = await createMaterialClass({
              name: item.class,
              parent_id: null,
              level: 0,
              is_active: true
            })
            classId = newClass.id
            classMap.set(item.class.toLowerCase(), classId!)
            processedItem.classId = classId
          } else {
            processedItem.classId = classId
          }

          // 2. Обработка подкласса (если есть)
          let subclassId: number | undefined

          if (item.subclass) {
            const subclassKey = `${item.class.toLowerCase()}:${item.subclass.toLowerCase()}`
            subclassId = subclassMap.get(subclassKey)

            if (!subclassId) {
              // Создаем новый подкласс
              const newSubclass = await createMaterialClass({
                name: item.subclass,
                parent_id: classId!,
                level: 1,
                is_active: true
              })
              subclassId = newSubclass.id
              subclassMap.set(subclassKey, subclassId!)
              processedItem.subclassId = subclassId
            } else {
              processedItem.subclassId = subclassId
            }
          }

          // 3. Проверка существующей номенклатуры
          const materialClassId = subclassId || classId!
          const existingNom = existingNomenclatures.find(n =>
            n.name.toLowerCase() === item.nomenclature.toLowerCase() &&
            n.material_class_id === materialClassId
          )

          if (existingNom) {
            processedItem.status = 'exists'
            processedItem.message = 'Уже существует'
            processedItem.nomenclatureId = existingNom.id
          } else {
            // Создаем номенклатуру
            const newNom = await createMaterialNomenclature({
              name: item.nomenclature,
              unit: item.unit || 'шт',
              material_class_id: materialClassId,
              is_active: true
            })
            processedItem.nomenclatureId = newNom.id
            processedItem.status = 'success'
            processedItem.message = 'Добавлено'
          }
        } catch (error) {
          processedItem.status = 'error'
          processedItem.message = error instanceof Error ? error.message : 'Ошибка импорта'
          console.error('[ImportNomenclatureModal] Error importing item:', item, error)
        }

        processed.push(processedItem)
        setProcessedData([...processed])
      }

      const successCount = processed.filter(p => p.status === 'success').length
      const existsCount = processed.filter(p => p.status === 'exists').length
      const errorCount = processed.filter(p => p.status === 'error').length

      message.success(`Импорт завершен: добавлено ${successCount}, пропущено ${existsCount}, ошибок ${errorCount}`)

      if (successCount > 0) {
        onSuccess()
      }
    } catch (error) {
      console.error('[ImportNomenclatureModal] Import error:', error)
      message.error('Ошибка импорта данных')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setCurrentStep(0)
    setFileList([])
    setImportData([])
    setProcessedData([])
    setImportProgress(0)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const columns: ColumnsType<ImportItem> = [
    {
      title: 'Класс',
      dataIndex: 'class',
      key: 'class',
      width: 200,
    },
    {
      title: 'Подкласс',
      dataIndex: 'subclass',
      key: 'subclass',
      width: 200,
      render: (value: string) => value || '-'
    },
    {
      title: 'Номенклатура',
      dataIndex: 'nomenclature',
      key: 'nomenclature',
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (value: string) => value || 'шт'
    },
  ]

  const resultColumns: ColumnsType<ProcessedItem> = [
    ...columns as ColumnsType<ProcessedItem>,
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: (_, record) => {
        const color = record.status === 'success' ? 'green' :
                     record.status === 'exists' ? 'orange' :
                     record.status === 'error' ? 'red' : 'default'
        const icon = record.status === 'success' ? <CheckCircleOutlined /> :
                    record.status === 'exists' ? <CheckCircleOutlined /> :
                    record.status === 'error' ? <CloseCircleOutlined /> : null
        return (
          <Tag color={color} icon={icon}>
            {record.message || 'Обработка...'}
          </Tag>
        )
      }
    }
  ]

  return (
    <Modal
      title="Импорт номенклатуры из JSON"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={
        currentStep === 0 ? [
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>
        ] : currentStep === 1 ? [
          <Button key="back" onClick={() => setCurrentStep(0)}>
            Назад
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>,
          <Button key="import" type="primary" onClick={handleImport}>
            Импортировать ({importData.length} записей)
          </Button>
        ] : [
          <Button key="close" onClick={handleClose}>
            Закрыть
          </Button>,
          <Button key="again" type="primary" onClick={handleReset}>
            Импортировать еще
          </Button>
        ]
      }
    >
      <Steps
        current={currentStep}
        items={[
          { title: 'Загрузка файла' },
          { title: 'Предпросмотр' },
          { title: 'Результат' }
        ]}
        style={{ marginBottom: 24 }}
      />

      {currentStep === 0 && (
        <div>
          <Upload.Dragger
            fileList={fileList}
            beforeUpload={handleFileRead}
            onChange={({ fileList }) => setFileList(fileList)}
            accept=".json"
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              Нажмите или перетащите JSON файл для загрузки
            </p>
            <p className="ant-upload-hint">
              Файл должен содержать структуру с полями: [Класс], [Подкласс], [Номенклатура]
            </p>
          </Upload.Dragger>
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <Table
            columns={columns}
            dataSource={importData}
            rowKey={(record, index) => `${record.class}-${record.subclass}-${record.nomenclature}-${index}`}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 400 }}
          />
        </div>
      )}

      {currentStep === 2 && (
        <div>
          {importing ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Progress percent={importProgress} status="active" />
              <p style={{ marginTop: 16 }}>Импортирование данных...</p>
            </div>
          ) : (
            <Table
              columns={resultColumns}
              dataSource={processedData}
              rowKey={(record, index) => `${record.class}-${record.subclass}-${record.nomenclature}-${index}`}
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ y: 400 }}
            />
          )}
        </div>
      )}
    </Modal>
  )
}