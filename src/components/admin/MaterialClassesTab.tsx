import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Popconfirm, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { MaterialClass } from '../../services/materialClassOperations'
import {
  loadMaterialClasses,
  createMaterialClass,
  updateMaterialClass,
  deleteMaterialClass,
  toggleMaterialClassActive
} from '../../services/materialClassOperations'

export const MaterialClassesTab = () => {
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingClass, setEditingClass] = useState<MaterialClass | null>(null)
  const [form] = Form.useForm()

  // Load material classes
  const loadData = async () => {
    console.log('[MaterialClassesTab.loadData] Loading material classes')
    setLoading(true)
    try {
      const data = await loadMaterialClasses()
      setMaterialClasses(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handle create/edit
  const handleSubmit = async (values: any) => {
    console.log('[MaterialClassesTab.handleSubmit] Submitting:', values, 'Editing:', editingClass?.id)

    try {
      if (editingClass) {
        await updateMaterialClass(editingClass.id, values)
      } else {
        await createMaterialClass(values)
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
    console.log('[MaterialClassesTab.handleDelete] Deleting material class:', id)

    try {
      await deleteMaterialClass(id)
      await loadData()
    } catch (error) {
      console.error('[MaterialClassesTab.handleDelete] Error:', error)
    }
  }

  // Handle toggle active
  const handleToggleActive = async (id: number, checked: boolean) => {
    console.log('[MaterialClassesTab.handleToggleActive] Toggling active:', id, checked)

    try {
      await toggleMaterialClassActive(id, checked)
      await loadData()
    } catch (error) {
      console.error('[MaterialClassesTab.handleToggleActive] Error:', error)
    }
  }

  // Open modal for create/edit
  const openModal = (materialClass?: MaterialClass) => {
    console.log('[MaterialClassesTab.openModal] Opening modal for:', materialClass?.id)

    if (materialClass) {
      setEditingClass(materialClass)
      form.setFieldsValue({
        code: materialClass.code,
        name: materialClass.name,
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
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: MaterialClass, b: MaterialClass) => a.code.localeCompare(b.code),
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: MaterialClass, b: MaterialClass) => a.name.localeCompare(b.name),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (is_active: boolean, record: MaterialClass) => (
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
      onFilter: (value: any, record: MaterialClass) => record.is_active === value,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: MaterialClass) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openModal(record)}
          />
          <Popconfirm
            title="Удалить класс материалов?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          Добавить класс материалов
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={materialClasses}
        rowKey="id"
        loading={loading}
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
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код класса' },
              { max: 10, message: 'Код не должен превышать 10 символов' }
            ]}
          >
            <Input placeholder="Например: 01" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Введите наименование класса' },
              { max: 255, message: 'Наименование не должно превышать 255 символов' }
            ]}
          >
            <Input placeholder="Например: Класс 01. Бетоны и растворы" />
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