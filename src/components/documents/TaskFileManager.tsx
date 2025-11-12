import { useState, useEffect } from 'react'
import { Upload, Button, Table, Space, message, Typography, Modal, Badge } from 'antd'
import { UploadOutlined, ScanOutlined, DownloadOutlined, ClearOutlined, ScissorOutlined, EyeOutlined, FileMarkdownOutlined, DeleteOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UploadFile } from 'antd'
import { documentTaskService } from '../../services/documentTaskService'
import { datalabService } from '../../services/datalabService'
import { supabase } from '../../lib/supabase'
import { DocumentCropModal } from './DocumentCropModal'
import type { AttachmentWithRecognition } from '../../types/documentTask'

const { Text } = Typography

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
  const [recognizingFiles, setRecognizingFiles] = useState<Set<string>>(new Set())
  const [markdownPreview, setMarkdownPreview] = useState<string | null>(null)
  const [markdownModalVisible, setMarkdownModalVisible] = useState(false)
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false)
  const [editedMarkdown, setEditedMarkdown] = useState('')
  const [currentMarkdownFile, setCurrentMarkdownFile] = useState<AttachmentWithRecognition | null>(null)

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
      setRecognizingFiles(prev => new Set(prev).add(file.id))
      
      const { data } = await supabase.storage
        .from('attachments')
        .createSignedUrl(file.storage_path, 3600)

      if (!data?.signedUrl) throw new Error('Не удалось получить URL')

      const externalTaskId = await datalabService.requestMarker(data.signedUrl)
      await pollRecognition(externalTaskId, file.id, file.original_name)
    } catch (error: any) {
      console.error('Recognition error:', error)
      message.error('Ошибка распознавания')
      setRecognizingFiles(prev => {
        const next = new Set(prev)
        next.delete(file.id)
        return next
      })
    }
  }

  const pollRecognition = async (externalTaskId: string, originalAttachmentId: string, originalFileName: string) => {
    let attempts = 0
    const maxAttempts = 60

    const check = async (): Promise<boolean> => {
      attempts++
      try {
        const statusCheck = await datalabService.checkMarkerStatus(externalTaskId)
        
        if (statusCheck.isReady && statusCheck.markdown) {
          const markdownAttachmentId = await documentTaskService.createMarkdownAttachment(
            taskId,
            statusCheck.markdown,
            originalFileName
          )
          
          await documentTaskService.linkRecognizedFile(originalAttachmentId, markdownAttachmentId)
          message.success('Распознавание завершено')
          setRecognizingFiles(prev => {
            const next = new Set(prev)
            next.delete(originalAttachmentId)
            return next
          })
          onRefresh()
          return true
        }

        if (attempts >= maxAttempts) {
          throw new Error('Превышено время ожидания')
        }

        return false
      } catch (error: any) {
        message.error('Ошибка распознавания')
        setRecognizingFiles(prev => {
          const next = new Set(prev)
          next.delete(originalAttachmentId)
          return next
        })
        onRefresh()
        return true
      }
    }

    const interval = setInterval(async () => {
      const done = await check()
      if (done) clearInterval(interval)
    }, 5000)
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

  const handleCropSuccess = async (croppedBlob: Blob) => {
    try {
      if (!cropFile) return

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
      setMarkdownModalVisible(true)
      setIsEditingMarkdown(false)
    } catch (error: any) {
      console.error('View error:', error)
      message.error('Ошибка загрузки')
    }
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
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteFile(record)}
              title="Удалить файл"
            />
          </Space>
        )
      }
    }
  ]

  const handleDeleteFile = async (file: AttachmentWithRecognition) => {
    try {
      await supabase.storage
        .from('attachments')
        .remove([file.storage_path])

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
        <DocumentCropModal
          visible={cropModalVisible}
          onCancel={() => {
            setCropModalVisible(false)
            setCropFile(null)
            setCropUrl('')
          }}
          onSuccess={handleCropSuccess}
          attachmentUrl={cropUrl}
          fileName={cropFile.original_name}
        />
      )}

      <Modal
        title="Markdown документ"
        open={markdownModalVisible}
        onCancel={() => {
          setMarkdownModalVisible(false)
          setMarkdownPreview(null)
          setIsEditingMarkdown(false)
          setCurrentMarkdownFile(null)
        }}
        width="90vw"
        footer={
          <Space>
            <Button onClick={() => {
              setMarkdownModalVisible(false)
              setMarkdownPreview(null)
              setIsEditingMarkdown(false)
              setCurrentMarkdownFile(null)
            }}>
              Закрыть
            </Button>
            {isEditingMarkdown ? (
              <Button type="primary" onClick={handleSaveMarkdown}>
                Сохранить
              </Button>
            ) : (
              <Button type="primary" onClick={() => setIsEditingMarkdown(true)}>
                Редактировать
              </Button>
            )}
          </Space>
        }
        style={{ top: 20 }}
      >
        <div 
          style={{ 
            height: 'calc(90vh - 100px)', 
            overflow: 'auto', 
            padding: '20px 24px',
            background: '#fff',
            fontSize: '14px',
            lineHeight: '1.6'
          }}
          className="markdown-preview"
        >
          {isEditingMarkdown ? (
            <textarea
              value={editedMarkdown}
              onChange={(e) => setEditedMarkdown(e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'none'
              }}
            />
          ) : (
            markdownPreview && (
              <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({node, ...props}) => (
                  <table style={{ 
                    borderCollapse: 'collapse', 
                    width: '100%', 
                    marginBottom: '16px',
                    border: '1px solid #e8e8e8'
                  }} {...props} />
                ),
                thead: ({node, ...props}) => (
                  <thead style={{ background: '#fafafa' }} {...props} />
                ),
                th: ({node, ...props}) => (
                  <th style={{ 
                    border: '1px solid #e8e8e8', 
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 600
                  }} {...props} />
                ),
                td: ({node, ...props}) => (
                  <td style={{ 
                    border: '1px solid #e8e8e8', 
                    padding: '8px 12px'
                  }} {...props} />
                ),
                h1: ({node, ...props}) => (
                  <h1 style={{ 
                    fontSize: '24px', 
                    fontWeight: 600, 
                    marginTop: '24px', 
                    marginBottom: '16px',
                    borderBottom: '1px solid #e8e8e8',
                    paddingBottom: '8px'
                  }} {...props} />
                ),
                h2: ({node, ...props}) => (
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: 600, 
                    marginTop: '20px', 
                    marginBottom: '12px'
                  }} {...props} />
                ),
                h3: ({node, ...props}) => (
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    marginTop: '16px', 
                    marginBottom: '8px'
                  }} {...props} />
                ),
                p: ({node, ...props}) => (
                  <p style={{ marginBottom: '12px' }} {...props} />
                ),
                code: ({node, inline, ...props}: any) => (
                  inline 
                    ? <code style={{ 
                        background: '#f5f5f5', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        fontSize: '13px'
                      }} {...props} />
                    : <code style={{ 
                        display: 'block',
                        background: '#f5f5f5', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontSize: '13px',
                        overflow: 'auto'
                      }} {...props} />
                ),
                ul: ({node, ...props}) => (
                  <ul style={{ paddingLeft: '24px', marginBottom: '12px' }} {...props} />
                ),
                ol: ({node, ...props}) => (
                  <ol style={{ paddingLeft: '24px', marginBottom: '12px' }} {...props} />
                ),
                li: ({node, ...props}) => (
                  <li style={{ marginBottom: '4px' }} {...props} />
                )
              }}
            >
              {markdownPreview}
            </ReactMarkdown>
            )
          )}
        </div>
      </Modal>
    </Space>
  )
}

