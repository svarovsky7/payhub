import { useState, useEffect } from 'react'
import { Button, Table, Space, message, Typography, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { documentTaskService } from '../services/documentTaskService'
import { CreateTaskModal } from '../components/documents/CreateTaskModal'
import { TaskFileManager } from '../components/documents/TaskFileManager'
import type { DocumentTask, AttachmentWithRecognition } from '../types/documentTask'

const { Title } = Typography

export const DocumentRecognitionPage = () => {
  const [tasks, setTasks] = useState<DocumentTask[]>([])
  const [selectedTask, setSelectedTask] = useState<DocumentTask | null>(null)
  const [taskFiles, setTaskFiles] = useState<AttachmentWithRecognition[]>([])
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await documentTaskService.getTasks()
      setTasks(data)
    } catch (error: any) {
      console.error('Load tasks error:', error)
      message.error('Ошибка загрузки заданий')
    } finally {
      setLoading(false)
    }
  }

  const loadTaskFiles = async (taskId: string) => {
    try {
      const files = await documentTaskService.getTaskAttachments(taskId)
      setTaskFiles(files)
    } catch (error: any) {
      console.error('Load files error:', error)
      message.error('Ошибка загрузки файлов')
    }
  }

  const handleSelectTask = async (task: DocumentTask) => {
    setSelectedTask(task)
    await loadTaskFiles(task.id)
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await documentTaskService.deleteTask(taskId)
      message.success('Задание удалено')
      loadTasks()
      if (selectedTask?.id === taskId) {
        setSelectedTask(null)
        setTaskFiles([])
      }
    } catch (error: any) {
      console.error('Delete task error:', error)
      message.error('Ошибка удаления')
    }
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Создано',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: DocumentTask) => (
        <Space>
          <Button size="small" icon={<FolderOpenOutlined />} onClick={() => handleSelectTask(record)}>
            Открыть
          </Button>
          <Popconfirm title="Удалить задание?" onConfirm={() => handleDeleteTask(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Задания на обработку документов</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          Создать задание
        </Button>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowClassName={(record) => record.id === selectedTask?.id ? 'ant-table-row-selected' : ''}
        />

        {selectedTask && (
          <div style={{ background: '#fafafa', padding: 24, borderRadius: 8 }}>
            <Title level={4}>Файлы задания: {selectedTask.title}</Title>
            <TaskFileManager
              taskId={selectedTask.id}
              files={taskFiles}
              onRefresh={() => loadTaskFiles(selectedTask.id)}
            />
          </div>
        )}
      </Space>

      <CreateTaskModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false)
          loadTasks()
        }}
      />
    </div>
  )
}

