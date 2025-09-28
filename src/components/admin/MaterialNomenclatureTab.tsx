import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, message, Popconfirm, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  loadMaterialNomenclature,
  createMaterialNomenclature,
  updateMaterialNomenclature,
  deleteMaterialNomenclature
} from '../../services/materialNomenclatureOperations'
import type {
  MaterialNomenclature,
  CreateMaterialNomenclatureData,
  UpdateMaterialNomenclatureData
} from '../../services/materialNomenclatureOperations'
import { loadMaterialClasses, loadSubclasses } from '../../services/materialClassOperations'
import type { MaterialClass } from '../../services/materialClassOperations'
import { ImportNomenclatureModal } from './ImportNomenclatureModal'

export default function MaterialNomenclatureTab() {
  const [nomenclatures, setNomenclatures] = useState<MaterialNomenclature[]>([])
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([])
  const [selectedParentClass, setSelectedParentClass] = useState<number | null>(null)
  const [subclasses, setSubclasses] = useState<MaterialClass[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<MaterialNomenclature | null>(null)
  const [searchText, setSearchText] = useState('')
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
    loadClasses()
  }, [])

  const loadData = async () => {
    console.log('[MaterialNomenclatureTab.loadData] Loading nomenclature data')
    setLoading(true)
    try {
      const data = await loadMaterialNomenclature()
      setNomenclatures(data)
    } catch (error) {
      console.error('[MaterialNomenclatureTab.loadData] Error:', error)
      message.error(`Ошибка загрузки номенклатуры: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    console.log('[MaterialNomenclatureTab.loadClasses] Loading material classes')
    try {
      const data = await loadMaterialClasses()
      setMaterialClasses(data)
    } catch (error) {
      console.error('[MaterialNomenclatureTab.loadClasses] Error:', error)
    }
  }

  const handleParentClassChange = async (parentId: number | null) => {
    setSelectedParentClass(parentId)
    if (parentId) {
      const subs = await loadSubclasses(parentId)
      setSubclasses(subs)
      form.setFieldValue('material_class_id', null) // Reset subclass selection
    } else {
      setSubclasses([])
    }
  }

  const handleAdd = () => {
    console.log('[MaterialNomenclatureTab.handleAdd] Opening add modal')
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setSelectedParentClass(null)
    setSubclasses([])
    setModalVisible(true)
  }

  const handleEdit = async (record: MaterialNomenclature) => {
    console.log('[MaterialNomenclatureTab.handleEdit] Editing:', record)
    setEditingItem(record)

    // Find the material class and its parent if it exists
    if (record.material_class_id) {
      const materialClass = materialClasses.find(c => c.id === record.material_class_id)
      if (materialClass?.parent_id) {
        // It's a subclass
        setSelectedParentClass(materialClass.parent_id)
        const subs = await loadSubclasses(materialClass.parent_id)
        setSubclasses(subs)
      } else if (materialClass && !materialClass.parent_id) {
        // It's a root class - treat it as parent for selection
        setSelectedParentClass(materialClass.id)
        const subs = await loadSubclasses(materialClass.id)
        setSubclasses(subs)
        // Don't set material_class_id in this case as it's the parent
        form.setFieldsValue({
          ...record,
          material_class_id: null
        })
        setModalVisible(true)
        return
      }
    } else {
      setSelectedParentClass(null)
      setSubclasses([])
    }

    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    console.log('[MaterialNomenclatureTab.handleDelete] Deleting:', { id })
    try {
      await deleteMaterialNomenclature(id)
      message.success('Номенклатура удалена')
      await loadData()
    } catch (error) {
      console.error('[MaterialNomenclatureTab.handleDelete] Error:', error)
      message.error(`Ошибка удаления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const handleModalOk = async () => {
    console.log('[MaterialNomenclatureTab.handleModalOk] Submitting form')
    try {
      const values = await form.validateFields()

      if (editingItem) {
        const updates: UpdateMaterialNomenclatureData = {
          name: values.name,
          unit: values.unit,
          material_class_id: values.material_class_id || null,
          is_active: values.is_active
        }
        await updateMaterialNomenclature(editingItem.id, updates)
        message.success('Номенклатура обновлена')
      } else {
        const newItem: CreateMaterialNomenclatureData = {
          name: values.name,
          unit: values.unit,
          material_class_id: values.material_class_id || null,
          is_active: values.is_active ?? true
        }
        await createMaterialNomenclature(newItem)
        message.success('Номенклатура добавлена')
      }

      setModalVisible(false)
      form.resetFields()
      await loadData()
    } catch (error) {
      console.error('[MaterialNomenclatureTab.handleModalOk] Error:', error)
      if ((error as any)?.errorFields) {
        return
      }
      message.error(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const handleModalCancel = () => {
    console.log('[MaterialNomenclatureTab.handleModalCancel] Closing modal')
    setModalVisible(false)
    form.resetFields()
    setEditingItem(null)
    setSelectedParentClass(null)
    setSubclasses([])
  }

  const filteredData = nomenclatures.filter(item => {
    if (!searchText) return true
    const search = searchText.toLowerCase()
    return (
      item.name.toLowerCase().includes(search) ||
      item.unit.toLowerCase().includes(search)
    )
  })

  const columns: ColumnsType<MaterialNomenclature> = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Класс материалов',
      dataIndex: 'material_class_id',
      key: 'material_class_id',
      width: 200,
      render: (classId: number | null) => {
        const materialClass = materialClasses.find(c => c.id === classId)
        return materialClass ? materialClass.name : '-'
      },
      filters: materialClasses.map(cls => ({ text: cls.name, value: cls.id })),
      onFilter: (value, record) => record.material_class_id === value,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Switch checked={active} disabled />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить номенклатуру?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Отмена"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Добавить номенклатуру
        </Button>
        <Button
          icon={<UploadOutlined />}
          onClick={() => setImportModalVisible(true)}
        >
          Импорт из JSON
        </Button>
        <Input
          placeholder="Поиск..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={editingItem ? 'Редактировать номенклатуру' : 'Добавить номенклатуру'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Введите наименование' },
              { max: 500, message: 'Максимум 500 символов' }
            ]}
          >
            <Input placeholder="Например: Кабель силовой ВВГнг 3х2.5" />
          </Form.Item>

          <Form.Item
            label="Основной класс материалов"
          >
            <Select
              value={selectedParentClass}
              onChange={handleParentClassChange}
              placeholder="Выберите основной класс"
              allowClear
              showSearch
              optionFilterProp="label"
              options={materialClasses
                .filter(cls => cls.is_active && cls.level === 0)
                .map(cls => ({
                  value: cls.id,
                  label: cls.name
                }))}
            />
          </Form.Item>

          <Form.Item
            name="material_class_id"
            label="Подкласс материалов"
          >
            <Select
              placeholder={selectedParentClass ? "Выберите подкласс" : "Сначала выберите основной класс"}
              disabled={!selectedParentClass}
              allowClear
              showSearch
              optionFilterProp="label"
              options={subclasses
                .filter(cls => cls.is_active)
                .map(cls => ({
                  value: cls.id,
                  label: cls.name
                }))}
            />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Единица измерения"
            rules={[
              { required: true, message: 'Введите единицу измерения' },
              { max: 50, message: 'Максимум 50 символов' }
            ]}
          >
            <Input placeholder="Например: м, шт, кг, л, м2, м3" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <ImportNomenclatureModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => {
          loadData()
          loadClasses()
          setImportModalVisible(false)
        }}
      />
    </div>
  )
}