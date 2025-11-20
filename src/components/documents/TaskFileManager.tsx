import { useState, useEffect } from 'react'
import { Upload, Button, Table, Space, message, Modal, Badge, Popconfirm } from 'antd'
import { UploadOutlined, ScanOutlined, DownloadOutlined, ClearOutlined, ScissorOutlined, EyeOutlined, FileMarkdownOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { documentTaskService } from '../../services/documentTaskService'
import { supabase } from '../../lib/supabase'
import { PdfCropModal } from '../common/PdfCropModal'
import { PageConfigModal } from './PageConfigModal'
import { MarkdownViewModal } from './MarkdownViewModal'
import type { AttachmentWithRecognition } from '../../types/documentTask'
import { usePageConfigs, type PageConfig } from '../../hooks/usePageConfigs'
import { useDocumentRecognition } from '../../hooks/useDocumentRecognition'

interface TaskFileManagerProps {
  taskId: string
  files: AttachmentWithRecognition[]
  onRefresh: () => void
}

export const TaskFileManager = ({ taskId, files, onRefresh }: TaskFileManagerProps) => {
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewFile, setPreviewFile] = useState<AttachmentWithRecognition | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [cropFile, setCropFile] = useState<AttachmentWithRecognition | null>(null)
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const [cropUrl, setCropUrl] = useState('')
  const [markdownPreview, setMarkdownPreview] = useState<string | null>(null)
  const [markdownModalVisible, setMarkdownModalVisible] = useState(false)
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false)
  const [editedMarkdown, setEditedMarkdown] = useState('')
  const [currentMarkdownFile, setCurrentMarkdownFile] = useState<AttachmentWithRecognition | null>(null)
  const [pageConfigModalVisible, setPageConfigModalVisible] = useState(false)
  const [currentRecognizeFile, setCurrentRecognizeFile] = useState<AttachmentWithRecognition | null>(null)
  const [currentRecognizePdfUrl, setCurrentRecognizePdfUrl] = useState('')
  
  const pageConfigsHook = usePageConfigs()
  const { recognizingFiles, startRecognition } = useDocumentRecognition(taskId, onRefresh)

  useEffect(() => {
    if (previewFile) {
      loadPreviewUrl(previewFile)
    }
  }, [previewFile])

  useEffect(() => {
    if (cropFile) {
      loadCropUrl(cropFile)
    }
  }, [cropFile])

  const loadPreviewUrl = async (file: AttachmentWithRecognition) => {
    const { data } = await supabase.storage
      .from('attachments')
      .createSignedUrl(file.storage_path, 3600)
    setPreviewUrl(data?.signedUrl || '')
  }

  const loadCropUrl = async (file: AttachmentWithRecognition) => {
    const { data } = await supabase.storage
      .from('attachments')
      .createSignedUrl(file.storage_path, 3600)
    setCropUrl(data?.signedUrl || '')
  }

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      message.error('Только PDF')
      return
    }

    try {
      setUploading(true)
      await documentTaskService.uploadAttachment(taskId, file)
      message.success('Файл загружен')
      setFileList([])
      onRefresh()
    } catch (error: any) {
      console.error('Upload error:', error)
      message.error('Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const handleRecognize = async (file: AttachmentWithRecognition) => {
    try {
      const { data } = await supabase.storage
        .from('attachments')
        .createSignedUrl(file.storage_path, 3600)

      if (!data?.signedUrl) throw new Error('Не удалось получить URL')

      setCurrentRecognizeFile(file)
      setCurrentRecognizePdfUrl(data.signedUrl)
      setPageConfigModalVisible(true)
    } catch (error: any) {
      console.error('Recognition error:', error)
      message.error('Ошибка распознавания')
    }
  }

  const handlePageConfigConfirm = async (pages: PageConfig[]) => {
    if (!currentRecognizeFile || !currentRecognizePdfUrl) return
    setPageConfigModalVisible(false)
    await startRecognition(currentRecognizePdfUrl, currentRecognizeFile.id, currentRecognizeFile.original_name, pages)
  }


  const handlePreview = (file: AttachmentWithRecognition) => {
    setPreviewFile(file)
    setPreviewVisible(true)
  }

  const handleCleanStamps = async (file: AttachmentWithRecognition) => {
    try {
      const hide = message.loading('Очистка от штампов и QR...', 0)
      
      try {
        const { data } = await supabase.storage
          .from('attachments')
          .createSignedUrl(file.storage_path, 3600)

        if (!data?.signedUrl) throw new Error('Не удалось получить URL')

        const response = await fetch(data.signedUrl)
        const arrayBuffer = await response.arrayBuffer()
        const base64Pdf = arrayBufferToBase64(arrayBuffer)

        const cleanResponse = await fetch('https://pdf.fvds.ru/clean-pdf-base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf_base64: base64Pdf })
        })

        if (!cleanResponse.ok) {
          const errorData = await cleanResponse.json()
          throw new Error(errorData.error || 'Ошибка обработки PDF')
        }

        const { pdf_base64: cleanedBase64 } = await cleanResponse.json()
        const cleanedBytes = base64ToArrayBuffer(cleanedBase64)
        const blob = new Blob([cleanedBytes], { type: 'application/pdf' })

        const cleanedFile = new File([blob], `${file.original_name.replace(/\.[^/.]+$/, '')}_очищено.pdf`, { type: 'application/pdf' })
        await documentTaskService.uploadAttachment(taskId, cleanedFile)

        message.success('Файл очищен и добавлен')
        onRefresh()
      } finally {
        hide()
      }
    } catch (error: any) {
      console.error('Clean stamps error:', error)
      message.error(`Ошибка: ${error.message}`)
    }
  }

  const handleCropSuccess = async (croppedBlob?: Blob) => {
    try {
      if (!cropFile || !croppedBlob) return

      const croppedFile = new File([croppedBlob], `${cropFile.original_name.replace(/\.[^/.]+$/, '')}_размечено.pdf`, { type: 'application/pdf' })
      await documentTaskService.uploadAttachment(taskId, croppedFile)

      message.success('Размеченный файл добавлен')
      setCropModalVisible(false)
      setCropFile(null)
      onRefresh()
    } catch (error: any) {
      console.error('Crop save error:', error)
      message.error('Ошибка сохранения')
    }
  }

  const handleViewMarkdown = async (file: AttachmentWithRecognition) => {
    if (!file.recognition?.recognized_attachment_id) return

    try {
      const { data: mdAttachment } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', file.recognition.recognized_attachment_id)
        .single()

      if (!mdAttachment) throw new Error('Markdown файл не найден')

      const { data } = await supabase.storage
        .from('attachments')
        .createSignedUrl(mdAttachment.storage_path, 3600)

      if (!data?.signedUrl) throw new Error('Не удалось получить URL')

      const response = await fetch(data.signedUrl)
      const text = await response.text()

      setMarkdownPreview(text)
      setEditedMarkdown(text)
      setCurrentMarkdownFile(file)
      pageConfigsHook.setPageConfigs(pageConfigsHook.extractPageConfigsFromMarkdown(text))
      setMarkdownModalVisible(true)
      setIsEditingMarkdown(false)
    } catch (error: any) {
      console.error('View error:', error)
      message.error('Ошибка загрузки')
    }
  }

  const handlePageDescriptionChange = (pageNumber: number, description: string) => {
    const updatedConfigs = pageConfigsHook.handlePageDescriptionChange(pageNumber, description)
    const updatedMarkdown = pageConfigsHook.updateMarkdownWithPageConfigs(editedMarkdown, updatedConfigs)
    setEditedMarkdown(updatedMarkdown)
    setMarkdownPreview(updatedMarkdown)
  }

  const handleContinuationChange = (pageNumber: number, checked: boolean) => {
    const updatedConfigs = pageConfigsHook.handleContinuationChange(pageNumber, checked)
    const updatedMarkdown = pageConfigsHook.updateMarkdownWithPageConfigs(editedMarkdown, updatedConfigs)
    setEditedMarkdown(updatedMarkdown)
    setMarkdownPreview(updatedMarkdown)
  }

  const handleSaveMarkdown = async () => {
    if (!currentMarkdownFile?.recognition?.recognized_attachment_id) return

    try {
      const hide = message.loading('Сохранение...', 0)

      const { data: mdAttachment } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', currentMarkdownFile.recognition.recognized_attachment_id)
        .single()

      if (!mdAttachment) throw new Error('Markdown файл не найден')

      const blob = new Blob([editedMarkdown], { type: 'text/markdown' })

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .update(mdAttachment.storage_path, blob, { upsert: true })

      if (uploadError) throw uploadError

      setMarkdownPreview(editedMarkdown)
      setIsEditingMarkdown(false)
      message.success('Сохранено')
      hide()
    } catch (error: any) {
      console.error('Save error:', error)
      message.error('Ошибка сохранения')
    }
  }

  const handleDownloadMarkdown = async (file: AttachmentWithRecognition) => {
    if (!file.recognition?.recognized_attachment_id) return

    try {
      const { data: mdAttachment } = await supabase
        .from('attachments')
        .select('storage_path, original_name')
        .eq('id', file.recognition.recognized_attachment_id)
        .single()

      if (!mdAttachment) throw new Error('Markdown файл не найден')

      const { data } = await supabase.storage
        .from('attachments')
        .createSignedUrl(mdAttachment.storage_path, 3600)

      if (!data?.signedUrl) throw new Error('Не удалось получить URL')

      const response = await fetch(data.signedUrl)
      const text = await response.text()

      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = mdAttachment.original_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Download error:', error)
      message.error('Ошибка скачивания')
    }
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    return btoa(binary)
  }

  const base64ToArrayBuffer = (base64: string): Uint8Array => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const columns = [
    {
      title: 'Файл',
      dataIndex: 'original_name',
      key: 'original_name',
      ellipsis: true
    },
    {
      title: 'Markdown',
      key: 'markdown',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: AttachmentWithRecognition) => {
        if (record.recognition?.recognized_attachment_id) {
          return (
            <Button 
              type="link" 
              icon={<FileMarkdownOutlined />} 
              onClick={() => handleViewMarkdown(record)}
            />
          )
        }
        return null
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 450,
      render: (_: any, record: AttachmentWithRecognition) => {
        const isRecognizing = recognizingFiles.has(record.id)
        const hasRecognition = !!record.recognition?.recognized_attachment_id
        
        return (
          <Space size="small" wrap>
            <Button 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handlePreview(record)}
              title="Просмотр"
            />
            {!hasRecognition && (
              <>
                <Button 
                  size="small" 
                  icon={<ClearOutlined />} 
                  onClick={() => handleCleanStamps(record)}
                  disabled={isRecognizing}
                  title="Очистить от штампов"
                >
                  Очистить
                </Button>
                <Button 
                  size="small" 
                  icon={<ScissorOutlined />} 
                  onClick={() => {
                    setCropFile(record)
                    setCropModalVisible(true)
                  }}
                  disabled={isRecognizing}
                  title="Разметить области"
                >
                  Разметить
                </Button>
                <Badge dot={isRecognizing} color="red">
                  <Button 
                    size="small" 
                    type="primary" 
                    icon={<ScanOutlined />} 
                    onClick={() => handleRecognize(record)}
                    loading={isRecognizing}
                    disabled={isRecognizing}
                    title="Распознать текст"
                  >
                    Распознать
                  </Button>
                </Badge>
              </>
            )}
            {hasRecognition && (
              <Button 
                size="small" 
                icon={<DownloadOutlined />} 
                onClick={() => handleDownloadMarkdown(record)}
                title="Скачать Markdown"
              >
                Скачать MD
              </Button>
            )}
            <Popconfirm
              title="Удалить файл?"
              onConfirm={() => handleDeleteFile(record)}
              okText="Да"
              cancelText="Нет"
            >
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                title="Удалить файл"
              />
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  const handleDeleteFile = async (file: AttachmentWithRecognition) => {
    try {
      await documentTaskService.deleteAttachment(file.id)
      message.success('Файл удален')
      onRefresh()
    } catch (error: any) {
      console.error('Delete error:', error)
      message.error('Ошибка удаления')
    }
  }

  const filteredFiles = files.filter(f => f.mime_type !== 'text/markdown')

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Upload
        fileList={fileList}
        beforeUpload={(file) => {
          handleUpload(file)
          return false
        }}
        accept="application/pdf"
        maxCount={1}
        onChange={({ fileList }) => setFileList(fileList)}
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          Загрузить PDF
        </Button>
      </Upload>

      <Table
        columns={columns}
        dataSource={filteredFiles}
        rowKey="id"
        size="small"
        pagination={false}
      />

      <Modal
        title={previewFile?.original_name}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false)
          setPreviewFile(null)
          setPreviewUrl('')
        }}
        width="90vw"
        footer={null}
        style={{ top: 20 }}
      >
        <div style={{ height: 'calc(90vh - 100px)', width: '100%' }}>
          {previewUrl && (
            <embed
              src={previewUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          )}
        </div>
      </Modal>

      {cropFile && (
        <PdfCropModal
          visible={cropModalVisible}
          onCancel={() => {
            setCropModalVisible(false)
            setCropFile(null)
            setCropUrl('')
          }}
          onSuccess={handleCropSuccess}
          attachmentUrl={cropUrl}
          fileName={cropFile.original_name}
          taskId={taskId}
        />
      )}

      {currentRecognizeFile && (
        <PageConfigModal
          visible={pageConfigModalVisible}
          pdfUrl={currentRecognizePdfUrl}
          onConfirm={handlePageConfigConfirm}
          onCancel={() => {
            setPageConfigModalVisible(false)
            setCurrentRecognizeFile(null)
            setCurrentRecognizePdfUrl('')
          }}
        />
      )}

      <MarkdownViewModal
        visible={markdownModalVisible}
        onCancel={() => {
          setMarkdownModalVisible(false)
          setMarkdownPreview(null)
          setIsEditingMarkdown(false)
          setCurrentMarkdownFile(null)
          pageConfigsHook.setPageConfigs([])
          pageConfigsHook.setSelectedPageRow(null)
        }}
        markdown={markdownPreview}
        isEditing={isEditingMarkdown}
        editedMarkdown={editedMarkdown}
        onEditedMarkdownChange={setEditedMarkdown}
        onStartEditing={() => setIsEditingMarkdown(true)}
        onSave={handleSaveMarkdown}
        pageConfigs={pageConfigsHook.pageConfigs}
        selectedPageRow={pageConfigsHook.selectedPageRow}
        onSelectRow={pageConfigsHook.setSelectedPageRow}
        onPageDescriptionChange={handlePageDescriptionChange}
        onContinuationChange={handleContinuationChange}
      />
    </Space>
  )
}

