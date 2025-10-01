import React, { useState } from 'react'
import { Modal, Button, Space } from 'antd'
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import { parseExcelFile, downloadTemplate, type ProjectData } from './ImportProjects/excelParser'
import { checkDuplicates, importProjects, type ImportResult } from './ImportProjects/importLogic'
import { ImportUploadStep } from './ImportProjects/ImportUploadStep'
import { ImportPreviewStep } from './ImportProjects/ImportPreviewStep'
import { ImportResultStep } from './ImportProjects/ImportResultStep'

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

  // Обработка загруженного Excel файла
  const handleFileUpload = async (file: File | { originFileObj?: File; name?: string }) => {
    const projects = await parseExcelFile(file)

    if (projects && projects.length > 0) {
      // Проверяем на дубликаты в базе данных
      const duplicates = await checkDuplicates(projects)

      setDuplicateCheck(duplicates)
      setParsedData(projects)
      setStep('preview')
    }

    return false // Предотвращаем автоматическую загрузку
  }

  // Импорт данных в базу
  const handleImport = async () => {
    setImporting(true)

    try {
      const results = await importProjects(parsedData, duplicateCheck, user?.id)
      setImportResults(results)
      setStep('result')

      const successCount = results.filter(r => r.status === 'success').length
      if (successCount > 0) {
        onSuccess()
      }
    } catch (error) {
      console.error('[ImportProjectsModal.handleImport] Error:', error)
    } finally {
      setImporting(false)
    }
  }

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
      {step === 'upload' && <ImportUploadStep onFileUpload={handleFileUpload} />}
      {step === 'preview' && <ImportPreviewStep parsedData={parsedData} duplicateCheck={duplicateCheck} />}
      {step === 'result' && <ImportResultStep importResults={importResults} />}
    </Modal>
  )
}
