import { useState, useRef, useEffect } from 'react'
import { Button, Upload, Card, Space, message, Typography, Row, Col, Progress, Modal } from 'antd'
import { UploadOutlined, ScanOutlined, ScissorOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { supabase } from '../lib/supabase'
import { DocumentCropModal } from '../components/documents/DocumentCropModal'
import { datalabService } from '../services/datalabService'

const { Title, Text, Paragraph } = Typography

interface ProcessedDocument {
  id: string
  fileName: string
  url: string
  storagePath?: string
  isCropped?: boolean
  originalDocId?: string
  markdown?: string
  status: 'uploaded' | 'cropped' | 'recognizing' | 'recognized'
  progress?: number
  taskId?: string
}

export const DocumentRecognitionPage = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [documents, setDocuments] = useState<ProcessedDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null)
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ProcessedDocument | null>(null)
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current)
      }
    }
  }, [])

  const handleUpload = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        message.error('Пользователь не авторизован')
        return
      }

      const timestamp = Date.now()
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `documents/${user.id}/${timestamp}_${cleanFileName}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = await supabase.storage
        .from('attachments')
        .createSignedUrl(storagePath, 3600 * 24)

      if (!urlData?.signedUrl) throw new Error('Не удалось получить URL файла')

      const newDoc: ProcessedDocument = {
        id: timestamp.toString(),
        fileName: file.name,
        url: urlData.signedUrl,
        storagePath,
        status: 'uploaded'
      }

      setDocuments(prev => [...prev, newDoc])
      setFileList([])
      message.success('Файл загружен')
    } catch (error: any) {
      console.error('Upload error:', error)
      message.error('Ошибка загрузки файла')
    }
  }

  const beforeUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      message.error('Можно загружать только PDF файлы')
      return false
    }
    handleUpload(file)
    return false
  }

  const handleCropSuccess = async (croppedBlob: Blob, docId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Пользователь не авторизован')

      const originalDoc = documents.find(d => d.id === docId)
      if (!originalDoc) throw new Error('Документ не найден')

      const timestamp = Date.now()
      const baseName = originalDoc.fileName.replace(/\.[^/.]+$/, '')
      const croppedFileName = `${baseName}_обрезано.pdf`
      const storagePath = `documents/${user.id}/${timestamp}_cropped.pdf`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, croppedBlob)

      if (uploadError) throw uploadError

      const { data: urlData } = await supabase.storage
        .from('attachments')
        .createSignedUrl(storagePath, 3600 * 24)

      if (!urlData?.signedUrl) throw new Error('Не удалось получить URL файла')

      const croppedDoc: ProcessedDocument = {
        id: timestamp.toString(),
        fileName: croppedFileName,
        url: urlData.signedUrl,
        storagePath,
        isCropped: true,
        originalDocId: docId,
        status: 'cropped'
      }

      setDocuments(prev => [...prev, croppedDoc])
      setCropModalVisible(false)
      setSelectedDoc(null)
      
      // Автоматически открываем превью результата
      setPreviewDoc(croppedDoc)
      setPreviewVisible(true)
      
      message.success('Обрезанный документ добавлен. Проверьте результат!')
    } catch (error: any) {
      console.error('Crop save error:', error)
      message.error('Ошибка сохранения обрезанного документа')
    }
  }

  const handleRecognize = async (doc: ProcessedDocument) => {
    try {
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, status: 'recognizing', progress: 0 } : d
      ))

      const taskId = await datalabService.requestMarker(doc.url)
      
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, taskId } : d
      ))

      pollRecognitionStatus(doc.id, taskId)
      message.info('Распознавание запущено')
    } catch (error: any) {
      console.error('Recognition error:', error)
      message.error('Ошибка запуска распознавания')
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, status: doc.isCropped ? 'cropped' : 'uploaded' } : d
      ))
    }
  }

  const pollRecognitionStatus = async (docId: string, taskId: string) => {
    let attempts = 0
    const maxAttempts = 60
    
    const checkStatus = async () => {
      attempts++
      
      try {
        const statusCheck = await datalabService.checkMarkerStatus(taskId)
        
        const progress = Math.min(95, Math.floor((attempts / maxAttempts) * 100))
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { ...d, progress } : d
        ))

        if (statusCheck.isReady && statusCheck.markdown) {
          setDocuments(prev => prev.map(d => 
            d.id === docId ? { 
              ...d, 
              markdown: statusCheck.markdown, 
              status: 'recognized',
              progress: 100 
            } : d
          ))
          message.success('Распознавание завершено')
          return true
        }

        if (attempts >= maxAttempts) {
          throw new Error('Превышено время ожидания')
        }

        return false
      } catch (error: any) {
        console.error('Status check error:', error)
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { 
            ...d, 
            status: d.isCropped ? 'cropped' : 'uploaded',
            progress: 0
          } : d
        ))
        message.error('Ошибка проверки статуса распознавания')
        return true
      }
    }

    const interval = setInterval(async () => {
      const isDone = await checkStatus()
      if (isDone) {
        clearInterval(interval)
      }
    }, 5000)
  }

  const handleDownloadMarkdown = (doc: ProcessedDocument) => {
    if (!doc.markdown) return

    const blob = new Blob([doc.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.fileName.replace(/\.[^/.]+$/, '')}_распознано.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId))
    message.success('Документ удален')
  }

  const handlePreview = (doc: ProcessedDocument) => {
    setPreviewDoc(doc)
    setPreviewVisible(true)
  }

  return (
    <div>
      <Title level={2}>Распознавание документов</Title>
      <Paragraph>
        Загрузите PDF документ, выберите области для обрезки (опционально) и распознайте текст
      </Paragraph>

      <Card style={{ marginBottom: 24 }}>
        <Upload
          fileList={fileList}
          beforeUpload={beforeUpload}
          accept="application/pdf"
          maxCount={1}
          onChange={({ fileList }) => setFileList(fileList)}
        >
          <Button icon={<UploadOutlined />} size="large" type="primary">
            Загрузить PDF файл
          </Button>
        </Upload>
      </Card>

      <Row gutter={[16, 16]}>
        {documents.map(doc => (
          <Col key={doc.id} xs={24} sm={12} lg={8} xl={6}>
            <Card
              hoverable
              title={
                <Text ellipsis title={doc.fileName}>
                  {doc.fileName}
                  {doc.isCropped && ' 🔪'}
                </Text>
              }
              extra={
                <Space size={0}>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(doc)}
                  />
                  <Button 
                    type="text" 
                    danger 
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(doc.id)}
                  />
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">
                  Статус: {
                    doc.status === 'uploaded' ? 'Загружен' :
                    doc.status === 'cropped' ? 'Обрезан' :
                    doc.status === 'recognizing' ? 'Распознается...' :
                    'Распознан'
                  }
                </Text>

                {doc.status === 'recognizing' && doc.progress !== undefined && (
                  <Progress percent={doc.progress} size="small" />
                )}

                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {(doc.status === 'uploaded' || doc.status === 'cropped') && (
                    <>
                      {!doc.isCropped && (
                        <Button
                          block
                          icon={<ScissorOutlined />}
                          onClick={() => {
                            setSelectedDoc(doc)
                            setCropModalVisible(true)
                          }}
                        >
                          Выбрать области
                        </Button>
                      )}
                      <Button
                        block
                        type="primary"
                        icon={<ScanOutlined />}
                        onClick={() => handleRecognize(doc)}
                      >
                        Распознать
                      </Button>
                    </>
                  )}

                  {doc.status === 'recognized' && doc.markdown && (
                    <Button
                      block
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadMarkdown(doc)}
                    >
                      Скачать Markdown
                    </Button>
                  )}
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {selectedDoc && (
        <DocumentCropModal
          visible={cropModalVisible}
          onCancel={() => {
            setCropModalVisible(false)
            setSelectedDoc(null)
          }}
          onSuccess={(croppedBlob) => handleCropSuccess(croppedBlob, selectedDoc.id)}
          attachmentUrl={selectedDoc.url}
          fileName={selectedDoc.fileName}
        />
      )}

      <Modal
        title={previewDoc?.fileName}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false)
          setPreviewDoc(null)
        }}
        width="90vw"
        footer={null}
        style={{ top: 20 }}
      >
        {previewDoc && (
          <div style={{ 
            height: 'calc(90vh - 100px)', 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <embed
              src={previewDoc.url}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

