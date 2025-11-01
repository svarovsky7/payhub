
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Spin, Empty, Card, Divider, Button, Space, message, Drawer, Alert } from 'antd'
import { DownloadOutlined, FileOutlined } from '@ant-design/icons'
import type { Letter } from '../lib/supabase'
import { getLetterByShareToken } from '../services/letterOperations'
import { useAuth } from '../contexts/AuthContext'
import { getAttachments, downloadFile } from '../services/fileAttachmentService'
import '../styles/letter-share-page.css'

interface FileAttachment {
  id: string
  original_name: string
  storage_path: string
  description?: string
}

export default function LetterSharePage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false)
  const [files, setFiles] = useState<FileAttachment[]>([])
  const isNewLetter = searchParams.get('id') !== null

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate(`/login?redirect=/letter-share/${token}`)
      return
    }

    loadLetter()
  }, [token, user, authLoading, navigate])

  const loadLetter = async () => {
    try {
      if (!token) throw new Error('Invalid token')
      const letterData = await getLetterByShareToken(token)
      if (!letterData) {
        // Letter not found - might be unsaved
        return
      }
      setLetter(letterData)
      await loadFiles(letterData.id)
    } catch (error) {
      console.error('Error loading letter:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFiles = async (letterId: string) => {
    try {
      const { data } = await getAttachments('letter', letterId)
      setFiles(data || [])
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  const handleDownloadFile = async (file: FileAttachment) => {
    try {
      const response = await downloadFile(file.storage_path)
      const url = window.URL.createObjectURL(response)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_name
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      message.error('Ошибка загрузки файла')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="letter-share-loading">
        <Spin size="large" tip="Загрузка письма..." />
      </div>
    )
  }

  if (!letter) {
    return (
      <div className="letter-share-container">
        <Card className="letter-share-card">
          {isNewLetter ? (
            <Alert
              message="Письмо не сохранено"
              description="Пожалуйста, сохраните письмо перед тем, как предоставить доступ по этой ссылке."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Empty description="Письмо не найдено" />
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="letter-share-container">
      <Card className="letter-share-card">
        <div className="letter-header">
          <h1>Письмо</h1>
          <Button 
            type="primary" 
            icon={<FileOutlined />}
            onClick={() => setFilesDrawerOpen(true)}
          >
            Приложения ({files.length})
          </Button>
        </div>

        <Divider />

        <div className="letter-content">
          <div className="letter-row">
            <span className="letter-label">Номер:</span>
            <span className="letter-value">{letter.number || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Регистрационный номер:</span>
            <span className="letter-value">{letter.reg_number || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Дата письма:</span>
            <span className="letter-value">
              {letter.letter_date ? new Date(letter.letter_date).toLocaleDateString('ru-RU') : '—'}
            </span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Тема:</span>
            <span className="letter-value">{letter.subject || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">От:</span>
            <span className="letter-value">{letter.sender || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Кому:</span>
            <span className="letter-value">{letter.recipient || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Направление:</span>
            <span className="letter-value">
              {letter.direction === 'incoming' ? 'Входящее' : 'Исходящее'}
            </span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Создано:</span>
            <span className="letter-value">{letter.creator?.full_name || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Ответственный:</span>
            <span className="letter-value">
              {letter.responsible_user?.full_name || letter.responsible_person_name || '—'}
            </span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Статус:</span>
            <span className="letter-value">{letter.status?.name || '—'}</span>
          </div>

          <div className="letter-row">
            <span className="letter-label">Содержание:</span>
            <div className="letter-content-text">{letter.content || '—'}</div>
          </div>
        </div>
      </Card>

      <Drawer
        title="Приложения к письму"
        onClose={() => setFilesDrawerOpen(false)}
        open={filesDrawerOpen}
        className="files-drawer"
      >
        {files.length === 0 ? (
          <Empty description="Нет приложений" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {files.map((file) => (
              <Card key={file.id} size="small" className="file-item">
                <div className="file-info">
                  <FileOutlined className="file-icon" />
                  <div className="file-details">
                    <div className="file-name">{file.original_name}</div>
                    {file.description && <div className="file-description">{file.description}</div>}
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadFile(file)}
                  size="small"
                >
                  Скачать
                </Button>
              </Card>
            ))}
          </Space>
        )}
      </Drawer>
    </div>
  )
}
