import { useState, useEffect, useMemo } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Popconfirm, Select } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons'
import type { MaterialClass } from '../../services/materialClassOperations'
import {
  loadMaterialClasses,
  createMaterialClass,
  updateMaterialClass,
  deleteMaterialClass,
  toggleMaterialClassActive
} from '../../services/materialClassOperations'

// Extended interface for tree structure
interface MaterialClassTreeNode extends MaterialClass {
  children?: MaterialClassTreeNode[]
}

export const MaterialClassesTab = () => {
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingClass, setEditingClass] = useState<MaterialClass | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([])
  const [form] = Form.useForm()

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
        const parent = classMap.get(cls.parent_id)
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
  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: MaterialClassTreeNode) => (
        <Space>
          {record.children && record.children.length > 0 ? (
            <FolderOutlined style={{ color: '#1890ff' }} />
          ) : (
            <FileOutlined style={{ color: '#8c8c8c' }} />
          )}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 150,
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            Добавить класс материалов
          </Button>
        </Space>
        <Space>
          <Button
            icon={<ExpandOutlined />}
            onClick={handleExpandAll}
          >
            Развернуть все
          </Button>
          <Button
            icon={<CompressOutlined />}
            onClick={handleCollapseAll}
          >
            Свернуть все
          </Button>
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
          defaultExpandAllRows: false,
          childrenColumnName: 'children',
        }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
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
          >
            <Select
              placeholder="Выберите родительский класс (оставьте пустым для основного класса)"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {materialClasses
                .filter(cls => cls.is_active && cls.id !== editingClass?.id)
                .map(cls => (
                  <Select.Option key={cls.id} value={cls.id} label={cls.name}>
                    {cls.parent_id ? `↳ ${cls.name}` : cls.name}
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