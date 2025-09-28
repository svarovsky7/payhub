# Универсальный компонент загрузки файлов

## Обзор

Создан единый функциональный блок для работы с файлами во всех модальных формах приложения PayHub.

## Основные возможности

### 1. FileUploadBlock - универсальный компонент

- ✅ Множественная загрузка файлов
- ✅ Добавление описания к каждому файлу
- ✅ Быстрый просмотр файлов в модальном окне
- ✅ Поддержка изображений, PDF и других форматов
- ✅ Скачивание файлов
- ✅ Удаление файлов
- ✅ Редактирование описаний существующих файлов
- ✅ Отображение размера и даты загрузки

### 2. fileAttachmentService - сервис для работы с файлами

- Загрузка файлов в Supabase Storage
- Привязка файлов к различным сущностям (счета, платежи, договоры, заявки)
- Управление описаниями файлов
- Копирование и перемещение файлов между сущностями

### 3. useFileAttachment - хук для упрощения работы

- Автоматическая загрузка существующих файлов
- Управление состоянием загрузки
- Batch-загрузка нескольких файлов
- Интеграция с системой аутентификации

## Примеры использования

### Простая интеграция в модальную форму

```tsx
import { FileUploadBlock } from '@/components/common/FileUploadBlock'
import { useFileAttachment } from '@/hooks/useFileAttachment'

const InvoiceFormModal = ({ invoiceId, onClose }) => {
  const {
    fileList,
    existingFiles,
    fileDescriptions,
    loading,
    uploading,
    handleFileListChange,
    handleFileDescriptionChange,
    uploadAllFiles,
    loadFiles
  } = useFileAttachment({
    entityType: 'invoice',
    entityId: invoiceId,
    autoLoad: true // Автоматически загрузит файлы при открытии
  })

  const handleSubmit = async (values) => {
    // Сохраняем данные формы
    await saveInvoice(values)

    // Загружаем все новые файлы
    await uploadAllFiles()

    onClose()
  }

  return (
    <Modal title="Редактирование счета">
      <Form onFinish={handleSubmit}>
        {/* Другие поля формы */}

        <FileUploadBlock
          entityType="invoice"
          entityId={invoiceId}
          fileList={fileList}
          onFileListChange={handleFileListChange}
          existingFiles={existingFiles}
          onExistingFilesChange={loadFiles}
          fileDescriptions={fileDescriptions}
          onFileDescriptionChange={handleFileDescriptionChange}
          multiple={true}
          maxSize={10}
        />

        <Button htmlType="submit" loading={uploading}>
          Сохранить
        </Button>
      </Form>
    </Modal>
  )
}
```

### Расширенная интеграция с кастомным просмотром

```tsx
const ContractEditModal = ({ contractId }) => {
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)

  const handleCustomPreview = (file) => {
    // Кастомная логика просмотра
    setPreviewFile(file)
    setPreviewVisible(true)
  }

  return (
    <>
      <FileUploadBlock
        entityType="contract"
        entityId={contractId}
        // ... другие пропсы
        onPreview={handleCustomPreview}
        accept=".pdf,.doc,.docx,.jpg,.png" // Ограничение типов файлов
      />

      {/* Кастомное окно просмотра */}
      <CustomPreviewModal
        visible={previewVisible}
        file={previewFile}
        onClose={() => setPreviewVisible(false)}
      />
    </>
  )
}
```

### Использование в режиме создания новой сущности

```tsx
const CreatePaymentModal = () => {
  const [tempFiles, setTempFiles] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState({})

  const handleSubmit = async (values) => {
    // Создаем платеж
    const { data: payment } = await createPayment(values)

    // Загружаем файлы для созданного платежа
    for (const file of tempFiles) {
      if (file.originFileObj) {
        await uploadAndLinkFile({
          file: file.originFileObj,
          entityType: 'payment',
          entityId: payment.id,
          description: fileDescriptions[file.uid],
          userId: user.id
        })
      }
    }
  }

  return (
    <FileUploadBlock
      entityType="payment"
      // entityId не указываем, так как платеж еще не создан
      fileList={tempFiles}
      onFileListChange={setTempFiles}
      fileDescriptions={fileDescriptions}
      onFileDescriptionChange={(uid, desc) =>
        setFileDescriptions(prev => ({ ...prev, [uid]: desc }))
      }
      showUploadButton={true}
    />
  )
}
```

## Архитектура

### Структура компонентов

```
src/
├── components/
│   └── common/
│       └── FileUploadBlock.tsx      # Универсальный UI компонент
├── services/
│   └── fileAttachmentService.ts     # Бизнес-логика работы с файлами
└── hooks/
    └── useFileAttachment.ts          # React хук для управления состоянием
```

### База данных

Используются следующие таблицы:

1. **attachments** - основная таблица файлов
   - id: UUID
   - original_name: имя файла
   - storage_path: путь в storage
   - size_bytes: размер
   - mime_type: MIME тип
   - description: описание
   - uploaded_by: кто загрузил
   - created_at: дата загрузки

2. **Таблицы связей** (с CASCADE удалением):
   - invoice_attachments
   - payment_attachments
   - contract_attachments
   - material_request_attachments

### Storage

Файлы хранятся в Supabase Storage в bucket `attachments` со структурой:
```
attachments/
├── invoice/
│   └── {invoice_id}/
│       └── {timestamp}_{filename}
├── payment/
│   └── {payment_id}/
│       └── {timestamp}_{filename}
├── contract/
│   └── {contract_id}/
│       └── {timestamp}_{filename}
└── material_request/
    └── {request_id}/
        └── {timestamp}_{filename}
```

## Миграция существующего кода

Для миграции существующих форм на новый компонент:

1. Заменить старые компоненты загрузки на `FileUploadBlock`
2. Использовать `useFileAttachment` хук вместо ручного управления состоянием
3. Обновить обработчики сохранения форм для вызова `uploadAllFiles()`

## Преимущества

1. **Единообразие** - один компонент для всех форм
2. **Переиспользуемость** - легко добавить в новые формы
3. **Функциональность** - все необходимые функции из коробки
4. **Поддерживаемость** - изменения в одном месте применяются везде
5. **UX** - единый опыт работы с файлами во всем приложении