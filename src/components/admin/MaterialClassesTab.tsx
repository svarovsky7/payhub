import { useState, useEffect, useMemo, useRef } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Popconfirm, Select, Tooltip, Badge, type InputRef } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  ExpandOutlined,
  CompressOutlined,
  FolderOpenOutlined,
  SearchOutlined
} from '@ant-design/icons'
import type { MaterialClass } from '../../services/materialClassOperations'
import {
  loadMaterialClasses,
  createMaterialClass,
  updateMaterialClass,
  deleteMaterialClass,
  toggleMaterialClassActive
} from '../../services/materialClassOperations'
import type { ColumnType } from 'antd/es/table'
import type { FilterConfirmProps } from 'antd/es/table/interface'

// Extended interface for tree structure
interface MaterialClassTreeNode extends MaterialClass {
  children?: MaterialClassTreeNode[]
}

type DataIndex = keyof MaterialClassTreeNode

export const MaterialClassesTab = () => {
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingClass, setEditingClass] = useState<MaterialClass | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()
  const searchInput = useRef<InputRef>(null)

  // Load material classes
  const loadData = async () => {
    setLoading(true)
    try {
      const allClasses = await loadMaterialClasses()
      setMaterialClasses(allClasses)
      // Auto-expand root classes on initial load
      const rootClassIds = allClasses
        .filter(cls => cls.parent_id === null)
        .map(cls => cls.id)
      setExpandedRowKeys(rootClassIds)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Build hierarchical tree structure from flat list
  const treeData = useMemo<MaterialClassTreeNode[]>(() => {
    const classMap = new Map<number, MaterialClassTreeNode>()
    const rootNodes: MaterialClassTreeNode[] = []

    // First pass: create nodes
    materialClasses.forEach(cls => {
      classMap.set(cls.id, { ...cls, children: [] })
    })

    // Second pass: build tree structure
    materialClasses.forEach(cls => {
      const node = classMap.get(cls.id)!
      if (cls.parent_id === null) {
        rootNodes.push(node)
      } else if (cls.parent_id !== null) {
        const parent = classMap.get(cls.parent_id!)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(node)
        }
      }
    })

    // Sort nodes at each level
    const sortNodes = (nodes: MaterialClassTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children)
        }
      })
    }
    sortNodes(rootNodes)

    return rootNodes
  }, [materialClasses])

  const handleSearch = (
    confirm: (param?: FilterConfirmProps) => void
  ) => {
    confirm()
  }

  const handleReset = (clearFilters: () => void) => {
    clearFilters()
  }

  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<MaterialClassTreeNode> => ({
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

  // Handle create/edit
  const handleSubmit = async (values: { name: string; parent_id?: number | null; is_active: boolean }) => {

    try {
      if (editingClass) {
        await updateMaterialClass(editingClass.id, {
          name: values.name,
          parent_id: values.parent_id || null,
          is_active: values.is_active
        })
      } else {
        await createMaterialClass({
          name: values.name,
          parent_id: values.parent_id || null,
          is_active: values.is_active
        })
      }

      setModalVisible(false)
      form.resetFields()
      setEditingClass(null)
      await loadData()
    } catch (error) {
      console.error('[MaterialClassesTab.handleSubmit] Error:', error)
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {

    try {
      await deleteMaterialClass(id)
      await loadData()
    } catch (error) {
      console.error('[MaterialClassesTab.handleDelete] Error:', error)
    }
  }

  // Handle toggle active
  const handleToggleActive = async (id: number, checked: boolean) => {

    try {
      await toggleMaterialClassActive(id, checked)
      await loadData()
    } catch (error) {
      console.error('[MaterialClassesTab.handleToggleActive] Error:', error)
    }
  }

  // Open modal for create/edit
  const openModal = (materialClass?: MaterialClass) => {

    if (materialClass) {
      setEditingClass(materialClass)
      form.setFieldsValue({
        name: materialClass.name,
        parent_id: materialClass.parent_id,
        is_active: materialClass.is_active
      })
    } else {
      setEditingClass(null)
      form.resetFields()
      form.setFieldsValue({ is_active: true })
    }

    setModalVisible(true)
  }

  // Table columns
  const columns: ColumnType<MaterialClassTreeNode>[] = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name'),
      render: (name: string, record: MaterialClassTreeNode) => {
        const hasChildren = record.children && record.children.length > 0
        const isExpanded = expandedRowKeys.includes(record.id)

        return (
          <Space>
            {hasChildren ? (
              isExpanded ? (
                <FolderOpenOutlined style={{ color: '#1890ff' }} />
              ) : (
                <FolderOutlined style={{ color: '#1890ff' }} />
              )
            ) : (
              <FileOutlined style={{ color: '#8c8c8c' }} />
            )}
            <span style={{ fontWeight: !record.parent_id ? 500 : 400 }}>{name}</span>
            {hasChildren && (
              <Badge
                count={record.children!.length}
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#595959',
                  boxShadow: 'none'
                }}
              />
            )}
          </Space>
        )
      },
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 150,
      sorter: (a, b) => Number(a.is_active) - Number(b.is_active),
      render: (is_active: boolean, record: MaterialClassTreeNode) => (
        <Switch
          checked={is_active}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          checkedChildren="Активен"
          unCheckedChildren="Неактивен"
        />
      ),
      filters: [
        { text: 'Активные', value: true },
        { text: 'Неактивные', value: false },
      ],
      onFilter: (value: boolean | React.Key, record: MaterialClassTreeNode) => record.is_active === value,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MaterialClassTreeNode) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openModal(record)}
          />
          <Popconfirm
            title="Удалить класс материалов?"
            description={
              record.children && record.children.length > 0
                ? "Внимание! Этот класс содержит подклассы. Они также будут удалены."
                : "Это действие нельзя отменить"
            }
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              disabled={record.children && record.children.length > 0}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Helper to get all expandable row keys
  const getAllExpandableKeys = (): number[] => {
    const keys: number[] = []
    const collectKeys = (nodes: MaterialClassTreeNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          keys.push(node.id)
          collectKeys(node.children)
        }
      })
    }
    collectKeys(treeData)
    return keys
  }

  // Expand/Collapse all
  const handleExpandAll = () => {
    setExpandedRowKeys(getAllExpandableKeys())
  }

  const handleCollapseAll = () => {
    setExpandedRowKeys([])
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            Добавить класс материалов
          </Button>
          <span style={{ color: '#8c8c8c', marginLeft: 16 }}>
            Всего классов: {materialClasses.length}
            {' '}
            (основных: {treeData.length}, подклассов: {materialClasses.length - treeData.length})
          </span>
        </Space>
        <Space>
          <Tooltip title="Развернуть все подклассы">
            <Button
              icon={<ExpandOutlined />}
              onClick={handleExpandAll}
              disabled={getAllExpandableKeys().length === 0}
              type={expandedRowKeys.length === 0 ? "default" : "text"}
            >
              Развернуть все
            </Button>
          </Tooltip>
          <Tooltip title="Свернуть все подклассы">
            <Button
              icon={<CompressOutlined />}
              onClick={handleCollapseAll}
              disabled={expandedRowKeys.length === 0}
              type={expandedRowKeys.length > 0 ? "default" : "text"}
            >
              Свернуть все
            </Button>
          </Tooltip>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={treeData}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as number[]),
        }}
        pagination={{
          defaultPageSize: 100,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (total) => `Всего: ${total}`,
        }}
        tableLayout="auto"
      />

      <Modal
        title={editingClass ? 'Редактировать класс материалов' : 'Новый класс материалов'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingClass(null)
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Введите наименование класса' },
              { max: 255, message: 'Наименование не должно превышать 255 символов' }
            ]}
          >
            <Input placeholder="Например: Бетоны и растворы" />
          </Form.Item>

          <Form.Item
            name="parent_id"
            label="Родительский класс"
            help="Оставьте пустым для создания основного класса. Выберите класс для создания подкласса."
          >
            <Select
              placeholder="Не выбрано (будет основной класс)"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {materialClasses
                .filter(cls =>
                  cls.is_active &&
                  cls.id !== editingClass?.id &&
                  cls.parent_id === null // Только корневые классы (level 0) могут быть родителями
                )
                .map(cls => (
                  <Select.Option key={cls.id} value={cls.id} label={cls.name}>
                    {cls.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
          >
            <Switch checkedChildren="Да" unCheckedChildren="Нет" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false)
                form.resetFields()
                setEditingClass(null)
              }}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingClass ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}