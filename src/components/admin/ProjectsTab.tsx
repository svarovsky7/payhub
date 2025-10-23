import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Switch, message, Popconfirm, Tag, Tooltip } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  ClearOutlined
} from '@ant-design/icons'
import type { ColumnsType, FilterDropdownProps, FilterValue } from 'antd/es/table/interface'
import { supabase, type Project } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { exportProjectsToExcel } from './ImportProjects/excelParser'

interface ProjectWithNames extends Project {
  project_alternative_names?: Array<{ id: number; alternative_name: string; sort_order: number }>
}

export const ProjectsTab = () => {
  const [projects, setProjects] = useState<ProjectWithNames[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithNames | null>(null)
  const [filteredInfo, setFilteredInfo] = useState<Record<string, FilterValue | null>>({})
  const [alternativeNames, setAlternativeNames] = useState<Array<{ id?: number; alternative_name: string }>>([])
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
        .select(`
          *,
          project_alternative_names(id, alternative_name, sort_order)
        `)
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
    setAlternativeNames([])
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setIsModalVisible(true)
  }

  const handleEdit = (record: ProjectWithNames) => {
    setEditingProject(record)
    const names = record.project_alternative_names?.map(n => ({
      id: n.id,
      alternative_name: n.alternative_name
    })) || []
    setAlternativeNames(names)
    form.setFieldsValue({
      ...record,
      alternative_names: names
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingProject) {
        // Update project
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            code: values.code,
            name: values.name,
            description: values.description,
            is_active: values.is_active
          })
          .eq('id', editingProject.id)

        if (updateError) throw updateError

        // Delete old names and add new ones
        if (editingProject.id) {
          await supabase
            .from('project_alternative_names')
            .delete()
            .eq('project_id', editingProject.id)

          if (alternativeNames.length > 0) {
            const { error: insertError } = await supabase
              .from('project_alternative_names')
              .insert(
                alternativeNames.map((name, idx) => ({
                  project_id: editingProject.id,
                  alternative_name: name.alternative_name,
                  sort_order: idx
                }))
              )
            if (insertError) throw insertError
          }
        }

        message.success('Проект обновлен')
      } else {
        // Create project
        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert([{ ...values, created_by: user?.id }])
          .select()

        if (insertError) throw insertError

        // Add alternative names
        if (newProject && newProject[0] && alternativeNames.length > 0) {
          const { error: namesError } = await supabase
            .from('project_alternative_names')
            .insert(
              alternativeNames.map((name, idx) => ({
                project_id: newProject[0].id,
                alternative_name: name.alternative_name,
                sort_order: idx
              }))
            )
          if (namesError) throw namesError
        }

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
      // Удаляем все связи пользователей с этим проектом
      const { data: associations, error: checkError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('project_id', id)

      if (checkError) {
        console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error checking associations:', checkError)
      }

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

      // Теперь удаляем сам проект (альтернативные названия удалятся каскадом)
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
  const getColumnSearchProps = (dataIndex: keyof ProjectWithNames) => ({
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
    onFilter: (value: boolean | React.Key, record: ProjectWithNames) => {
      const fieldValue = record[dataIndex]
      if (fieldValue === null || fieldValue === undefined) return false
      return fieldValue.toString().toLowerCase().includes(value.toString().toLowerCase())
    },
  })

  const columns: ColumnsType<ProjectWithNames> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 80,
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
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name'),
    },
    {
      title: 'Связанные названия',
      dataIndex: 'project_alternative_names',
      key: 'alternative_names',
      width: 180,
      render: (names: Array<{ alternative_name: string }> | undefined) => {
        if (!names || names.length === 0) {
          return <span style={{ color: '#999' }}>—</span>
        }

        const visibleTags = names.slice(0, 1)
        const hiddenCount = names.length - visibleTags.length

        const tooltipContent = (
          <div>
            {names.map((name, idx) => (
              <div key={idx}>{name.alternative_name}</div>
            ))}
          </div>
        )

        return (
          <Tooltip title={tooltipContent} placement="topLeft">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {visibleTags.map((name, idx) => (
                <Tag key={idx}>{name.alternative_name}</Tag>
              ))}
              {hiddenCount > 0 && (
                <Tag style={{ cursor: 'default' }}>+{hiddenCount}...</Tag>
              )}
            </div>
          </Tooltip>
        )
      }
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
      width: 80,
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

  const handleExport = () => {
    exportProjectsToExcel(projects)
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
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Скачать в Excel
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
        onChange={(_, filters) => {
          setFilteredInfo(filters)
        }}
        pagination={{
          defaultPageSize: 100,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} проектов`
        }}
        tableLayout="auto"
      />

      <Modal
        title={editingProject ? 'Редактировать проект' : 'Создать проект'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
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

          <Form.Item label="Связанные названия">
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '2px', padding: '8px' }}>
              {alternativeNames.map((name, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <Input
                    placeholder="Введите альтернативное название"
                    value={name.alternative_name}
                    onChange={(e) => {
                      const updated = [...alternativeNames]
                      updated[idx].alternative_name = e.target.value
                      setAlternativeNames(updated)
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    danger
                    onClick={() => {
                      setAlternativeNames(alternativeNames.filter((_, i) => i !== idx))
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
              <Button
                type="dashed"
                block
                onClick={() => setAlternativeNames([...alternativeNames, { alternative_name: '' }])}
              >
                + Добавить название
              </Button>
            </div>
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
    </>
  )
}