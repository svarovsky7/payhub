import { useState, useEffect } from 'react'
import { Card, Button, Upload, Space, Typography, Alert, Spin, Popconfirm, Tag } from 'antd'
import { UploadOutlined, DeleteOutlined, DownloadOutlined, FileWordOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import {
  getLetterTemplate,
  uploadLetterTemplate,
  deleteLetterTemplate
} from '../../services/templateService'

const { Title, Text } = Typography

export const TemplatesTab = () => {
  const [loading, setLoading] = useState(false)
  const [templateInfo, setTemplateInfo] = useState<{ exists: boolean; url?: string; lastModified?: string }>({ exists: false })
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    loadTemplateInfo()
  }, [])

  const loadTemplateInfo = async () => {
    console.log('[TemplatesTab.loadTemplateInfo] Loading template info')
    setLoading(true)
    try {
      const info = await getLetterTemplate()
      setTemplateInfo(info)
    } catch (error) {
      console.error('[TemplatesTab.loadTemplateInfo] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    console.log('[TemplatesTab.handleUpload] Uploading file:', file.name)
    setUploading(true)
    try {
      await uploadLetterTemplate(file)
      await loadTemplateInfo()
      setFileList([])
    } catch (error) {
      console.error('[TemplatesTab.handleUpload] Error:', error)
    } finally {
      setUploading(false)
    }
    return false // Prevent default upload
  }

  const handleDelete = async () => {
    console.log('[TemplatesTab.handleDelete] Deleting template')
    setLoading(true)
    try {
      await deleteLetterTemplate()
      await loadTemplateInfo()
    } catch (error) {
      console.error('[TemplatesTab.handleDelete] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (templateInfo.url) {
      window.open(templateInfo.url, '_blank')
    }
  }

  return (
    <div>
      <Title level={3}>Шаблоны документов</Title>
      <Text type="secondary">
        Управление шаблонами документов для генерации писем с QR-кодами
      </Text>

      <Card
        title="Шаблон письма (DOCX)"
        style={{ marginTop: 24 }}
        extra={
          templateInfo.exists && (
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                disabled={loading}
              >
                Скачать
              </Button>
              <Popconfirm
                title="Удалить шаблон?"
                description="Вы уверены, что хотите удалить текущий шаблон?"
                onConfirm={handleDelete}
                okText="Да"
                cancelText="Отмена"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={loading}
                >
                  Удалить
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {templateInfo.exists ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message="Шаблон загружен"
                  description={
                    <div>
                      <div>
                        <FileWordOutlined style={{ marginRight: 8, fontSize: 16 }} />
                        <strong>letter_template.docx</strong>
                      </div>
                      {templateInfo.lastModified && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">
                            Обновлен: {new Date(templateInfo.lastModified).toLocaleString('ru-RU')}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                  type="success"
                  showIcon
                />

                <Alert
                  message="Инструкция по использованию"
                  description={
                    <div>
                      <p>В верхнем правом углу шаблона будет автоматически размещён QR-код с уникальной ссылкой на просмотр письма.</p>
                      <p>Каждый QR-код содержит идентификатор формата <Tag>СУ-10-[ID письма]</Tag></p>
                      <p>При сканировании QR-кода авторизованный пользователь будет перенаправлен на страницу просмотра соответствующего письма.</p>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />

                <div style={{ marginTop: 16 }}>
                  <Text strong>Обновить шаблон:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Upload
                      fileList={fileList}
                      beforeUpload={handleUpload}
                      onChange={({ fileList }) => setFileList(fileList)}
                      accept=".docx"
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />} loading={uploading}>
                        Выбрать новый файл DOCX
                      </Button>
                    </Upload>
                  </div>
                </div>
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message="Шаблон не загружен"
                  description="Загрузите DOCX-файл шаблона для генерации писем с QR-кодами"
                  type="warning"
                  showIcon
                />

                <Alert
                  message="Требования к шаблону"
                  description={
                    <ul style={{ marginBottom: 0 }}>
                      <li>Формат файла: DOCX</li>
                      <li>Максимальный размер: 10 МБ</li>
                      <li>QR-код будет размещён в верхнем правом углу документа</li>
                      <li>Размер QR-кода: 3x3 см</li>
                      <li>Файл будет сохранён в <code>attachments/templates/letter_template.docx</code></li>
                    </ul>
                  }
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />

                <div style={{ marginTop: 24 }}>
                  <Upload
                    fileList={fileList}
                    beforeUpload={handleUpload}
                    onChange={({ fileList }) => setFileList(fileList)}
                    accept=".docx"
                    maxCount={1}
                  >
                    <Button type="primary" icon={<UploadOutlined />} loading={uploading} size="large">
                      Загрузить шаблон DOCX
                    </Button>
                  </Upload>
                </div>
              </Space>
            )}
          </>
        )}
      </Card>

      <Card
        title="Создание шаблона"
        style={{ marginTop: 24 }}
      >
        <Alert
          message="Как создать шаблон"
          description={
            <div>
              <p><strong>Шаг 1:</strong> Создайте документ Word (DOCX) с нужным форматированием и содержанием</p>
              <p><strong>Шаг 2:</strong> Оставьте пространство в верхнем правом углу документа (примерно 4x4 см) для QR-кода</p>
              <p><strong>Шаг 3:</strong> Загрузите файл через кнопку "Загрузить шаблон DOCX" выше</p>
              <p><strong>Шаг 4:</strong> После загрузки шаблон будет доступен для генерации документов писем</p>
              <p style={{ marginTop: 16, marginBottom: 0 }}>
                <Text type="secondary">
                  <strong>Примечание:</strong> При генерации документа система автоматически добавит QR-код с идентификатором письма.
                  Формат QR-кода: <Tag>СУ-10-[ID]</Tag> где ID - уникальный идентификатор письма.
                </Text>
              </p>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  )
}
