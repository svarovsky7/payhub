import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Switch, message, Popconfirm, Tag } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  SearchOutlined,
  ClearOutlined
} from '@ant-design/icons'
import type { ColumnsType, FilterDropdownProps, FilterValue } from 'antd/es/table/interface'
import { supabase, type Project } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ImportProjectsModal } from './ImportProjectsModal'

export const ProjectsTab = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [filteredInfo, setFilteredInfo] = useState<Record<string, FilterValue | null>>({})
  const [form] = Form.useForm()
  const { user } = useAuth()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjects(data || [])
    } catch (error) {
      console.error('[ProjectsTab.loadProjects] Error:', error)
      message.error('Ошибка загрузки проектов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProject(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setIsModalVisible(true)
  }

  const handleEdit = (record: Project) => {
    setEditingProject(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: Partial<Project>) => {
    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(values)
          .eq('id', editingProject.id)

        if (error) throw error
        message.success('Проект обновлен')
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([{ ...values, created_by: user?.id }])

        if (error) throw error
        message.success('Проект создан')
      }

      setIsModalVisible(false)
      loadProjects()
    } catch (error) {
      console.error('[ProjectsTab.handleSubmit] Error:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка сохранения проекта')
    }
  }

  const handleDeleteWithPopconfirm = async (id: number) => {

    if (!id) {
      console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error: Project ID is undefined or null')
      message.error('Ошибка: ID проекта не определен')
      return
    }

    try {
      // Сначала проверим, есть ли связи с пользователями
      const { data: associations, error: checkError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('project_id', id)


      if (checkError) {
        console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error checking associations:', checkError)
      }

      // Удаляем все связи пользователей с этим проектом
      if (associations && associations.length > 0) {
        const { error: userProjectsError } = await supabase
          .from('user_projects')
          .delete()
          .eq('project_id', id)
          .select()


        if (userProjectsError) {
          console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error removing user associations:', userProjectsError)
          throw userProjectsError
        }
      }

      // Теперь удаляем сам проект
      const { data: deletedProject, error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select()


      if (projectError) {
        console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error removing project:', projectError)
        throw projectError
      }

      if (!deletedProject || deletedProject.length === 0) {
        throw new Error('Проект не был удален. Возможно, у вас нет прав на удаление.')
      }

      message.success('Проект удален')
      await loadProjects()
    } catch (error) {
      console.error('[ProjectsTab.handleDeleteWithPopconfirm] Full error object:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка удаления проекта')
    }
  }

  // Старая функция handleDelete удалена - используем handleDeleteWithPopconfirm
  // Modal.confirm не работает корректно с React 19, используем Popconfirm

  // Функция для создания поискового фильтра
  const getColumnSearchProps = (dataIndex: keyof Project) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Поиск`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Найти
          </Button>
          <Button
            onClick={() => {
              if (clearFilters) clearFilters()
              confirm()
            }}
            size="small"
            style={{ width: 90 }}
          >
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: Project) => {
      const fieldValue = record[dataIndex]
      if (fieldValue === null || fieldValue === undefined) return false
      return fieldValue.toString().toLowerCase().includes(value.toString().toLowerCase())
    },
  })

  const columns: ColumnsType<Project> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a, b) => {
        const codeA = a.code || ''
        const codeB = b.code || ''
        return codeA.localeCompare(codeB)
      },
      ...getColumnSearchProps('code'),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name'),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      ...getColumnSearchProps('description'),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      filters: [
        { text: 'Активные', value: true },
        { text: 'Неактивные', value: false },
      ],
      onFilter: (value: boolean | React.Key, record) => record.is_active === value,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Активен' : 'Неактивен'}
        </Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить проект?"
            description="Это действие нельзя отменить. Все пользователи будут отвязаны от этого проекта."
            onConfirm={() => {
              handleDeleteWithPopconfirm(record.id)
            }}
            onCancel={() => {
            }}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => {
              }}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Функция для сброса всех фильтров
  const handleClearFilters = () => {
    setFilteredInfo({})
    message.info('Все фильтры сброшены')
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Добавить проект
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            Импорт из Excel
          </Button>
        </Space>
        {Object.keys(filteredInfo).length > 0 && (
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearFilters}
          >
            Сбросить фильтры
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1200 }}
        onChange={(_, filters) => {
          setFilteredInfo(filters)
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} проектов`,
          showQuickJumper: true,
        }}
      />

      <Modal
        title={editingProject ? 'Редактировать проект' : 'Создать проект'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код проекта"
            rules={[{ max: 50, message: 'Максимум 50 символов' }]}
          >
            <Input placeholder="Например: PROJ-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProject ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <ImportProjectsModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => {
          loadProjects()
          setImportModalVisible(false)
        }}
      />
    </>
  )
}