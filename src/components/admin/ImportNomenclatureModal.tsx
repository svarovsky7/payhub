import { useState } from 'react'
import { Modal, Upload, Button, Table, Steps, message, Progress, Tag } from 'antd'
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'
import type { ColumnsType } from 'antd/es/table'
import {
  loadMaterialClasses,
  bulkCreateMaterialClasses,
} from '../../services/materialClassOperations'
import {
  loadMaterialNomenclature,
  bulkCreateMaterialNomenclature,
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
          const unitValue = row['[Ед. изм.]'] || row['Ед. изм.'] || ''

          if (classValue && nomenclatureValue) {
            items.push({
              class: classValue.trim(),
              subclass: subclassValue.trim(),
              nomenclature: nomenclatureValue.trim(),
              unit: unitValue.trim() || 'шт'
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
      console.log('[ImportNomenclatureModal] Starting bulk import of', importData.length, 'items')
      setImportProgress(10)

      // Шаг 1: Загружаем существующие классы и номенклатуру
      const existingClasses = await loadMaterialClasses()
      const existingNomenclatures = await loadMaterialNomenclature()
      setImportProgress(20)

      // Создаем Map существующих классов
      const classMap = new Map<string, number>() // Top-level classes: name -> id
      const subclassMap = new Map<string, number>() // Subclasses: "parent:name" -> id

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

      // Шаг 2: Собираем уникальные классы для создания
      const uniqueClasses = new Map<string, string>()
      const uniqueSubclasses = new Map<string, { name: string, parentKey: string }>()

      importData.forEach(item => {
        const classKey = item.class.toLowerCase()

        // Check if top-level class exists (parent_id = null)
        if (!classMap.has(classKey)) {
          uniqueClasses.set(classKey, item.class)
        }

        if (item.subclass) {
          const subclassKey = `${classKey}:${item.subclass.toLowerCase()}`

          // Check if subclass exists under this specific parent
          // With UNIQUE(name, parent_id) constraint, same name can exist under different parents
          if (!subclassMap.has(subclassKey)) {
            uniqueSubclasses.set(subclassKey, { name: item.subclass, parentKey: classKey })
          }
        }
      })

      console.log('[ImportNomenclatureModal] Unique classes:', uniqueClasses.size, 'subclasses:', uniqueSubclasses.size)
      setImportProgress(30)

      // Шаг 3: Bulk создание классов
      if (uniqueClasses.size > 0) {
        const classesToCreate = Array.from(uniqueClasses.values()).map(name => ({
          name,
          parent_id: null,
          level: 0,
          is_active: true
        }))

        const createdClasses = await bulkCreateMaterialClasses(classesToCreate)
        createdClasses.forEach(cls => {
          classMap.set(cls.name.toLowerCase(), cls.id)
        })
        console.log('[ImportNomenclatureModal] Created classes:', createdClasses.length)
      }
      setImportProgress(45)

      // Шаг 4: Bulk создание подклассов
      if (uniqueSubclasses.size > 0) {
        const subclassesToCreate = Array.from(uniqueSubclasses.values()).map(({ name, parentKey }) => ({
          name,
          parent_id: classMap.get(parentKey)!,
          level: 1,
          is_active: true
        }))

        const createdSubclasses = await bulkCreateMaterialClasses(subclassesToCreate)
        createdSubclasses.forEach(cls => {
          const parent = existingClasses.find(c => c.id === cls.parent_id) ||
                        { name: Array.from(classMap.entries()).find(([, id]) => id === cls.parent_id)?.[0] || '' }
          const key = `${parent.name.toLowerCase()}:${cls.name.toLowerCase()}`
          subclassMap.set(key, cls.id)
        })
        console.log('[ImportNomenclatureModal] Created subclasses:', createdSubclasses.length)
      }
      setImportProgress(60)

      // Шаг 5: Подготовка номенклатуры для создания
      const nomenclatureToCreate = []
      const processed: ProcessedItem[] = []

      for (const item of importData) {
        const processedItem: ProcessedItem = { ...item, status: 'pending' }

        const classId = classMap.get(item.class.toLowerCase())
        processedItem.classId = classId

        let subclassId: number | undefined
        if (item.subclass) {
          const subclassKey = `${item.class.toLowerCase()}:${item.subclass.toLowerCase()}`
          subclassId = subclassMap.get(subclassKey)
          processedItem.subclassId = subclassId
        }

        const materialClassId = subclassId || classId!

        // Проверка существующей номенклатуры
        const existingNom = existingNomenclatures.find(n =>
          n.name.toLowerCase() === item.nomenclature.toLowerCase() &&
          n.material_class_id === materialClassId
        )

        if (existingNom) {
          processedItem.status = 'exists'
          processedItem.message = 'Уже существует'
          processedItem.nomenclatureId = existingNom.id
        } else {
          // Добавляем в список для создания
          nomenclatureToCreate.push({
            name: item.nomenclature,
            unit: item.unit || 'шт',
            material_class_id: materialClassId,
            is_active: true
          })
          processedItem.status = 'pending'
        }

        processed.push(processedItem)
      }

      setImportProgress(75)
      console.log('[ImportNomenclatureModal] Nomenclature to create:', nomenclatureToCreate.length)

      // Шаг 6: Bulk создание номенклатуры
      if (nomenclatureToCreate.length > 0) {
        const createdNomenclature = await bulkCreateMaterialNomenclature(nomenclatureToCreate)

        // Обновляем статусы
        let nomIndex = 0
        for (const item of processed) {
          if (item.status === 'pending') {
            if (nomIndex < createdNomenclature.length) {
              item.status = 'success'
              item.message = 'Добавлено'
              item.nomenclatureId = createdNomenclature[nomIndex].id
              nomIndex++
            }
          }
        }
        console.log('[ImportNomenclatureModal] Created nomenclature:', createdNomenclature.length)
      }

      setImportProgress(100)
      setProcessedData(processed)

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
              Файл должен содержать поля: [Класс], [Подкласс], [Номенклатура], [Ед. изм.]
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