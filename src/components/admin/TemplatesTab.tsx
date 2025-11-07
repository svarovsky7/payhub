import { useState, useEffect } from 'react'
import { Card, Button, Upload, Space, Typography, Alert, Spin, Popconfirm, Tag, Table, Modal } from 'antd'
import { UploadOutlined, DeleteOutlined, DownloadOutlined, FileWordOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import {
  getLetterTemplate,
  uploadLetterTemplate,
  deleteLetterTemplate,
  uploadProjectTemplate,
  deleteProjectTemplate,
  getAllProjectTemplates
} from '../../services/templateService'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../lib/supabase'

const { Title, Text } = Typography

export const TemplatesTab = () => {
  const [loading, setLoading] = useState(false)
  const [templateInfo, setTemplateInfo] = useState<{ exists: boolean; url?: string; lastModified?: string }>({ exists: false })
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  
  // Project templates
  const [projects, setProjects] = useState<Project[]>([])
  const [projectTemplates, setProjectTemplates] = useState<Record<number, { exists: boolean; url?: string }>>({})
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [projectFileList, setProjectFileList] = useState<UploadFile[]>([])
  const [projectUploading, setProjectUploading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  useEffect(() => {
    loadTemplateInfo()
    loadProjects()
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

  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProjects(data || [])
      
      const allTemplates = await getAllProjectTemplates()
      
      const templatesWithStatus = (data || []).reduce((acc, project) => {
        acc[project.id] = allTemplates[project.id] || { exists: false }
        return acc
      }, {} as Record<number, { exists: boolean; url?: string }>)
      
      setProjectTemplates(templatesWithStatus)

    } catch (error) {
      console.error('[TemplatesTab.loadProjects] Error:', error)
    } finally {
      setLoadingProjects(false)
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
    return false
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

  const handleProjectTemplateUpload = async (file: File) => {
    if (!selectedProjectId) {
      return false
    }
    console.log('[TemplatesTab.handleProjectTemplateUpload] Uploading for project:', selectedProjectId)
    setProjectUploading(true)
    try {
      await uploadProjectTemplate(selectedProjectId, file)
      await loadProjects()
      setProjectFileList([])
      setSelectedProjectId(null)
    } catch (error) {
      console.error('[TemplatesTab.handleProjectTemplateUpload] Error:', error)
    } finally {
      setProjectUploading(false)
    }
    return false
  }

  const handleProjectTemplateDelete = async (projectId: number) => {
    console.log('[TemplatesTab.handleProjectTemplateDelete] Deleting template for project:', projectId)
    try {
      await deleteProjectTemplate(projectId)
      await loadProjects()
    } catch (error) {
      console.error('[TemplatesTab.handleProjectTemplateDelete] Error:', error)
    }
  }

  const handleProjectTemplateDownload = (url?: string) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const projectColumns = [
    {
      title: 'Проект',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Шаблон',
      key: 'template',
      render: (_: any, record: Project) => {
        const template = projectTemplates[record.id]
        return template?.exists ? (
          <Tag color="green">Загружен</Tag>
        ) : (
          <Tag>Не загружен</Tag>
        )
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Project) => {
        const template = projectTemplates[record.id]
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              onClick={() => setSelectedProjectId(record.id)}
            >
              {template?.exists ? 'Обновить' : 'Загрузить'}
            </Button>
            {template?.exists && (
              <>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleProjectTemplateDownload(template.url)}
                >
                  Скачать
                </Button>
                <Popconfirm
                  title="Удалить шаблон?"
                  description="Вы уверены, что хотите удалить шаблон для этого проекта?"
                  onConfirm={() => handleProjectTemplateDelete(record.id)}
                  okText="Да"
                  cancelText="Отмена"
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>
                    Удалить
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        )
      }
    }
  ]

  return (
    <div>
      <Title level={3}>Шаблоны документов</Title>
      <Text type="secondary">
        Управление шаблонами документов для генерации писем с QR-кодами
      </Text>

      {/* Global template */}
      <Card
        title="Шаблон письма (DOCX) - Глобальный"
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

      {/* Project templates */}
      <Card
        title="Шаблоны по проектам"
        style={{ marginTop: 24 }}
      >
        <Table
          columns={projectColumns}
          dataSource={projects}
          rowKey="id"
          loading={loadingProjects}
          pagination={false}
          size="small"
        />
      </Card>

      {/* Upload modal for project template */}
      <Modal
        title={`Загрузить шаблон для проекта`}
        open={selectedProjectId !== null}
        onCancel={() => setSelectedProjectId(null)}
        footer={null}
      >
        <Upload
          fileList={projectFileList}
          beforeUpload={handleProjectTemplateUpload}
          onChange={({ fileList }) => setProjectFileList(fileList)}
          accept=".docx"
          maxCount={1}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={projectUploading} size="large">
            Выбрать файл DOCX
          </Button>
        </Upload>
      </Modal>
    </div>
  )
}
