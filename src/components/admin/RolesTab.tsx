import { useState, useEffect, useRef } from 'react'
import type { FormValues } from '../../types/common'
import { Table, Space, Button, Modal, Form, Input, Switch, message, Tooltip, Select, Tag, type InputRef } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import { supabase, type Role } from '../../lib/supabase'
import type { FilterConfirmProps } from 'antd/es/table/interface'

// Определение доступных страниц
const AVAILABLE_PAGES = [
  { value: '/invoices', label: 'Счета' },
  { value: '/material-requests', label: 'Заявки на материалы' },
  { value: '/contracts', label: 'Договоры' },
  { value: '/letters', label: 'Письма' },
  { value: '/letter-stats', label: 'Статистика писем' },
  { value: '/documents', label: 'Распознавание документов' },
  { value: '/approvals', label: 'Согласования' },
  { value: '/project-budgets', label: 'Бюджеты проектов' },
  { value: '/admin', label: 'Администрирование' },
]

type DataIndex = keyof Role

export const RolesTab = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()
  const searchInput = useRef<InputRef>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRoles(data || [])
    } catch (error) {
      console.error('[RolesTab.loadRoles] Error:', error)
      message.error('Ошибка загрузки ролей')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRole(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Role) => {
    setEditingRole(record)
    // Парсим allowed_pages из JSON, если это строка
    const allowedPages = record.allowed_pages
      ? (typeof record.allowed_pages === 'string'
          ? JSON.parse(record.allowed_pages)
          : record.allowed_pages)
      : []

    form.setFieldsValue({
      ...record,
      allowed_pages: allowedPages
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: FormValues) => {
    try {
      // Преобразуем allowed_pages в JSON строку для хранения в базе
      const dataToSave = {
        ...values,
        allowed_pages: JSON.stringify(values.allowed_pages || [])
      }

      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update(dataToSave)
          .eq('id', editingRole.id)

        if (error) throw error
        message.success('Роль обновлена')
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([dataToSave])

        if (error) throw error
        message.success('Роль создана')
      }

      setIsModalVisible(false)
      loadRoles()
    } catch (error: unknown) {
      console.error('[RolesTab.handleSubmit] Error:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка сохранения роли')
    }
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Удалить роль?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id)

          if (error) throw error
          message.success('Роль удалена')
          loadRoles()
        } catch (error) {
          console.error('[RolesTab.handleDelete] Error:', error)
          message.error('Ошибка удаления роли')
        }
      }
    })
  }

  const handleSearch = (
    confirm: (param?: FilterConfirmProps) => void
  ) => {
    confirm()
  }

  const handleReset = (clearFilters: () => void) => {
    clearFilters()
  }

  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<Role> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Поиск по ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(confirm)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Сброс
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close()
            }}
          >
            Закрыть
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex]!.toString().toLowerCase().includes((value as string).toLowerCase())
        : false,
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100)
      }
    }
  })


  const columns: ColumnsType<Role> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      sorter: (a, b) => a.code.localeCompare(b.code),
      ...getColumnSearchProps('code')
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name')
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
      ...getColumnSearchProps('description')
    },
    {
      title: 'Доступные страницы',
      dataIndex: 'allowed_pages',
      key: 'allowed_pages',
      filters: AVAILABLE_PAGES.map(p => ({ text: p.label, value: p.value })),
      onFilter: (value, record) => {
        const pages = record.allowed_pages
          ? (typeof record.allowed_pages === 'string'
              ? JSON.parse(record.allowed_pages)
              : record.allowed_pages)
          : []
        return pages.includes(value)
      },
      render: (value: any) => {
        const pages = value
          ? (typeof value === 'string' ? JSON.parse(value) : value)
          : []

        if (pages.length === 0) {
          return <Tag color="red">Нет доступа</Tag>
        }

        const pageLabels = pages.map((page: string) => {
          const pageInfo = AVAILABLE_PAGES.find(p => p.value === page)
          return pageInfo ? pageInfo.label : page
        })

        if (pageLabels.length > 2) {
          return (
            <Tooltip title={pageLabels.join(', ')}>
              <span>
                {pageLabels.slice(0, 2).map((label: string, index: number) => (
                  <Tag key={index} color="blue">{label}</Tag>
                ))}
                <Tag color="blue">+{pageLabels.length - 2}</Tag>
              </span>
            </Tooltip>
          )
        }

        return pageLabels.map((label: string, index: number) => (
          <Tag key={index} color="blue">{label}</Tag>
        ))
      }
    },
    {
      title: 'Только свои проекты',
      dataIndex: 'own_projects_only',
      key: 'own_projects_only',
      align: 'center',
      filters: [
        { text: 'Да', value: true },
        { text: 'Нет', value: false }
      ],
      onFilter: (value, record) => record.own_projects_only === value,
      sorter: (a, b) => Number(a.own_projects_only) - Number(b.own_projects_only),
      render: (value: boolean) => (
        <Tooltip title={value ? 'Видит только данные своих проектов' : 'Видит данные всех проектов'}>
          <Switch checked={value} disabled />
        </Tooltip>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить роль
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        loading={loading}
        rowKey="id"
        pagination={{
          defaultPageSize: 100,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (total) => `Всего: ${total} ролей`,
          showSizeChanger: true
        }}
        tableLayout="auto"
      />

      <Modal
        title={editingRole ? 'Редактировать роль' : 'Создать роль'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код роли' },
              { max: 50, message: 'Максимум 50 символов' }
            ]}
          >
            <Input placeholder="Например: admin" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название роли' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="allowed_pages"
            label="Доступные страницы"
            rules={[{ required: false, message: 'Выберите доступные страницы' }]}
            help="Выберите страницы, к которым будет иметь доступ роль"
          >
            <Select
              mode="multiple"
              placeholder="Выберите страницы"
              options={AVAILABLE_PAGES}
            />
          </Form.Item>

          <Form.Item
            name="own_projects_only"
            label="Только свои проекты"
            valuePropName="checked"
            initialValue={false}
            help="Если включено, пользователи с этой ролью будут видеть только данные проектов, к которым они привязаны"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}