import { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, message, Popconfirm, Select, type InputRef } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType, ColumnType, TablePaginationConfig } from 'antd/es/table'
import type { FilterConfirmProps, FilterValue } from 'antd/es/table/interface'
import { debounce } from 'lodash'
import { useLocation } from 'react-router-dom'
import {
  loadMaterialNomenclaturePaginated,
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

type DataIndex = keyof MaterialNomenclature

export default function MaterialNomenclatureTab() {
  const location = useLocation()
  const [nomenclatures, setNomenclatures] = useState<MaterialNomenclature[]>([])
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([])
  const [selectedParentClass, setSelectedParentClass] = useState<number | null>(null)
  const [subclasses, setSubclasses] = useState<MaterialClass[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<MaterialNomenclature | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState<number | null>(null)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `Всего: ${total}`,
    pageSizeOptions: ['50', '100', '200']
  })
  const [form] = Form.useForm()
  const searchInput = useRef<InputRef>(null)

  // Загрузка данных с пагинацией
  const loadData = useCallback(async (
    page: number = pagination.current,
    pageSize: number = pagination.pageSize,
    search: string = searchText,
    classId: number | null = selectedClassFilter
  ) => {
    console.log('[MaterialNomenclatureTab.loadData] Loading nomenclature data:', {
      page, pageSize, search, classId
    })
    setLoading(true)
    try {
      const result = await loadMaterialNomenclaturePaginated({
        page,
        pageSize,
        searchText: search,
        classId,
        activeOnly: false
      })

      setNomenclatures(result.data)
      setPagination(prev => ({
        ...prev,
        current: result.page,
        pageSize: result.pageSize,
        total: result.total
      }))
    } catch (error) {
      console.error('[MaterialNomenclatureTab.loadData] Error:', error)
      message.error(`Ошибка загрузки номенклатуры: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, searchText, selectedClassFilter])

  // Дебаунсированный поиск
  const debouncedSearch = useCallback(
    debounce((search: string) => {
      setPagination(prev => ({ ...prev, current: 1 })) // Сброс на первую страницу при поиске
      loadData(1, pagination.pageSize, search, selectedClassFilter)
    }, 500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadData, pagination.pageSize, selectedClassFilter]
  )

  const loadClasses = useCallback(async () => {
    console.log('[MaterialNomenclatureTab.loadClasses] Loading material classes')
    try {
      const data = await loadMaterialClasses()
      setMaterialClasses(data)
    } catch (error) {
      console.error('[MaterialNomenclatureTab.loadClasses] Error:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
    loadClasses()
  }, [loadData, loadClasses])

  // Перезагрузка классов при переключении на эту вкладку
  useEffect(() => {
    if (location.pathname === '/admin/material-nomenclature') {
      console.log('[MaterialNomenclatureTab] Tab activated, reloading classes')
      loadClasses()
    }
  }, [location.pathname, loadClasses])

  const handleParentClassChange = async (parentId: number | null) => {
    setSelectedParentClass(parentId)
    if (parentId) {
      const subs = await loadSubclasses(parentId)
      setSubclasses(subs)
      form.setFieldValue('material_class_id', null)
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

    if (record.material_class_id) {
      const materialClass = materialClasses.find(c => c.id === record.material_class_id)
      if (materialClass?.parent_id) {
        setSelectedParentClass(materialClass.parent_id)
        const subs = await loadSubclasses(materialClass.parent_id)
        setSubclasses(subs)
      } else if (materialClass && !materialClass.parent_id) {
        setSelectedParentClass(materialClass.id)
        const subs = await loadSubclasses(materialClass.id)
        setSubclasses(subs)
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

  const handleSearch = (
    confirm: (param?: FilterConfirmProps) => void
  ) => {
    confirm()
  }

  const handleReset = (clearFilters: () => void) => {
    clearFilters()
  }

  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<MaterialNomenclature> => ({
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

  const handleModalCancel = () => {
    console.log('[MaterialNomenclatureTab.handleModalCancel] Closing modal')
    setModalVisible(false)
    form.resetFields()
    setEditingItem(null)
    setSelectedParentClass(null)
    setSubclasses([])
  }

  const handleTableChange = (
    paginationConfig: TablePaginationConfig,
    filters: Record<string, FilterValue | null>
  ) => {
    const classFilter = filters.material_class_id as number | null
    setSelectedClassFilter(classFilter)
    setPagination(prev => ({
      ...prev,
      current: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 100
    }))
    loadData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 100,
      searchText,
      classFilter
    )
  }

  const handleSearchInput = (value: string) => {
    setSearchText(value)
    debouncedSearch(value)
  }

  // Получаем корневые классы и подклассы для отображения
  const rootClasses = materialClasses.filter(c => c.level === 0)
  const getParentClass = (classId: number | null) => {
    if (!classId) return null
    const cls = materialClasses.find(c => c.id === classId)
    if (!cls) return null

    // Если это подкласс, найти родительский класс
    if (cls.parent_id) {
      return materialClasses.find(c => c.id === cls.parent_id)
    }
    // Если это корневой класс
    return cls
  }

  const columns: ColumnsType<MaterialNomenclature> = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      ellipsis: true,
      ...getColumnSearchProps('name')
    },
    {
      title: 'Класс материалов',
      dataIndex: 'material_class_id',
      key: 'parent_class',
      sorter: (a, b) => {
        const parentA = getParentClass(a.material_class_id ?? null)
        const parentB = getParentClass(b.material_class_id ?? null)
        return (parentA?.name || '').localeCompare(parentB?.name || '')
      },
      render: (classId: number | null) => {
        const parentClass = getParentClass(classId)
        return parentClass ? parentClass.name : '-'
      },
      filters: rootClasses.map(cls => ({ text: cls.name, value: cls.id })),
      onFilter: (value, record) => {
        const parentClass = getParentClass(record.material_class_id ?? null)
        return parentClass ? parentClass.id === value : false
      },
    },
    {
      title: 'Подкласс материалов',
      dataIndex: 'material_class_id',
      key: 'material_class_id',
      sorter: (a, b) => {
        const classA = a.material_class_id ? materialClasses.find(c => c.id === a.material_class_id) : null
        const classB = b.material_class_id ? materialClasses.find(c => c.id === b.material_class_id) : null
        const nameA = classA && classA.parent_id ? classA.name : ''
        const nameB = classB && classB.parent_id ? classB.name : ''
        return nameA.localeCompare(nameB)
      },
      render: (classId: number | null) => {
        if (!classId) return '-'
        const cls = materialClasses.find(c => c.id === classId)
        // Показываем имя подкласса, только если это действительно подкласс
        return (cls && cls.parent_id) ? cls.name : '-'
      },
      filters: materialClasses
        .filter(c => c.parent_id !== null)
        .map(cls => ({ text: cls.name, value: cls.id })),
      filteredValue: selectedClassFilter ? [selectedClassFilter] : null,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      sorter: (a, b) => a.unit.localeCompare(b.unit),
      ...getColumnSearchProps('unit')
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      sorter: (a, b) => Number(a.is_active) - Number(b.is_active),
      filters: [
        { text: 'Да', value: true },
        { text: 'Нет', value: false }
      ],
      onFilter: (value, record) => record.is_active === value,
      render: (active: boolean) => (
        <Switch checked={active} disabled />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center',
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
          onChange={e => handleSearchInput(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Space>

      <Table
        columns={columns}
        dataSource={nomenclatures}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        tableLayout="auto"
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