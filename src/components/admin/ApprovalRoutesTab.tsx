import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Switch, message, Card, Tag, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, HolderOutlined, UserOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import {
  CSS,
} from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabase'
import type { InvoiceType } from '../../lib/supabase'

interface Role {
  id: number
  code: string
  name: string
}

interface WorkflowStage {
  id?: number
  route_id?: number
  order_index: number
  role_id: number
  name: string
  payment_status_id?: number
  invoice_status_id?: number
  role?: Role
  payment_status?: any
  invoice_status?: any
}

interface ApprovalRoute {
  id: number
  invoice_type_id: number
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  invoice_type?: InvoiceType
  stages?: WorkflowStage[]
}

export const ApprovalRoutesTab = () => {
  const [routes, setRoutes] = useState<ApprovalRoute[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<any[]>([])
  const [invoiceStatuses, setInvoiceStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [stagesModalVisible, setStagesModalVisible] = useState(false)
  const [editingRoute, setEditingRoute] = useState<ApprovalRoute | null>(null)
  const [editingStages, setEditingStages] = useState<WorkflowStage[]>([])
  const [form] = Form.useForm()

  // Загрузка справочников
  const loadReferences = useCallback(async () => {
    console.log('[ApprovalRoutesTab.loadReferences] Loading references')

    try {
      const [typesResponse, rolesResponse, paymentStatusesResponse, invoiceStatusesResponse] = await Promise.all([
        supabase.from('invoice_types').select('*').order('name'),
        supabase.from('roles').select('*').order('name'),
        supabase.from('payment_statuses').select('*').order('sort_order'),
        supabase.from('invoice_statuses').select('*').order('sort_order')
      ])

      if (typesResponse.error) throw typesResponse.error
      if (rolesResponse.error) throw rolesResponse.error
      if (paymentStatusesResponse.error) throw paymentStatusesResponse.error
      if (invoiceStatusesResponse.error) throw invoiceStatusesResponse.error

      setInvoiceTypes(typesResponse.data as InvoiceType[])
      setRoles(rolesResponse.data as Role[])
      setPaymentStatuses(paymentStatusesResponse.data || [])
      setInvoiceStatuses(invoiceStatusesResponse.data || [])
    } catch (error) {
      console.error('[ApprovalRoutesTab.loadReferences] Error:', error)
      message.error('Ошибка загрузки справочников')
    }
  }, [])

  // Загрузка маршрутов
  const loadRoutes = useCallback(async () => {
    console.log('[ApprovalRoutesTab.loadRoutes] Loading routes')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('approval_routes')
        .select(`
          *,
          invoice_type:invoice_types(id, name),
          stages:workflow_stages(
            id,
            order_index,
            role_id,
            name,
            payment_status_id,
            invoice_status_id,
            role:roles(id, code, name),
            payment_status:payment_statuses(id, name),
            invoice_status:invoice_statuses(id, name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRoutes(data as ApprovalRoute[])
      console.log('[ApprovalRoutesTab.loadRoutes] Loaded routes:', data?.length)
    } catch (error) {
      console.error('[ApprovalRoutesTab.loadRoutes] Error:', error)
      message.error('Ошибка загрузки маршрутов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReferences()
    loadRoutes()
  }, [loadReferences, loadRoutes])

  // Создание/редактирование маршрута
  const handleSaveRoute = async (values: any) => {
    console.log('[ApprovalRoutesTab.handleSaveRoute] Saving route:', values)

    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('approval_routes')
          .update({
            invoice_type_id: values.invoice_type_id,
            name: values.name,
            is_active: values.is_active
          })
          .eq('id', editingRoute.id)

        if (error) throw error
        message.success('Маршрут обновлён')
      } else {
        const { error } = await supabase
          .from('approval_routes')
          .insert([{
            invoice_type_id: values.invoice_type_id,
            name: values.name,
            is_active: values.is_active
          }])

        if (error) throw error
        message.success('Маршрут создан')
      }

      setModalVisible(false)
      setEditingRoute(null)
      form.resetFields()
      loadRoutes()
    } catch (error: any) {
      console.error('[ApprovalRoutesTab.handleSaveRoute] Error:', error)
      if (error.code === '23505') {
        message.error('Маршрут для этого типа счета уже существует')
      } else {
        message.error(error.message || 'Ошибка сохранения маршрута')
      }
    }
  }

  // Удаление маршрута
  const handleDeleteRoute = async (id: number) => {
    console.log('[ApprovalRoutesTab.handleDeleteRoute] Deleting route:', id)

    Modal.confirm({
      title: 'Удалить маршрут?',
      content: 'Это действие нельзя отменить. Все связанные этапы будут удалены.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('approval_routes')
            .delete()
            .eq('id', id)

          if (error) throw error
          message.success('Маршрут удалён')
          loadRoutes()
        } catch (error: any) {
          console.error('[ApprovalRoutesTab.handleDeleteRoute] Error:', error)
          message.error(error.message || 'Ошибка удаления маршрута')
        }
      }
    })
  }

  // Открытие модала настройки этапов
  const handleConfigureStages = (route: ApprovalRoute) => {
    console.log('[ApprovalRoutesTab.handleConfigureStages] Configuring stages for route:', route.id)
    setEditingRoute(route)
    setEditingStages(route.stages || [])
    setStagesModalVisible(true)
  }

  // Добавление этапа
  const handleAddStage = () => {
    const newStage: WorkflowStage = {
      order_index: editingStages.length,
      role_id: 0,
      name: '',
      payment_status_id: undefined,
      invoice_status_id: undefined
    }
    setEditingStages([...editingStages, newStage])
  }

  // Удаление этапа
  const handleRemoveStage = (index: number) => {
    const newStages = editingStages.filter((_, i) => i !== index)
      .map((stage, i) => ({ ...stage, order_index: i }))
    setEditingStages(newStages)
  }

  // Изменение этапа
  const handleStageChange = (index: number, field: string, value: any) => {
    const newStages = [...editingStages]
    newStages[index] = { ...newStages[index], [field]: value }
    setEditingStages(newStages)
  }

  // Обработка перетаскивания этапов
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setEditingStages((stages) => {
        const oldIndex = stages.findIndex((_, index) => `stage-${index}` === active.id)
        const newIndex = stages.findIndex((_, index) => `stage-${index}` === over.id)

        const newStages = arrayMove(stages, oldIndex, newIndex)
        // Обновляем order_index для всех этапов
        return newStages.map((stage, index) => ({
          ...stage,
          order_index: index
        }))
      })
    }
  }

  // Настройка сенсоров для перетаскивания
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Сохранение этапов
  const handleSaveStages = async () => {
    if (!editingRoute) return

    console.log('[ApprovalRoutesTab.handleSaveStages] Saving stages:', editingStages)

    try {
      // Удаляем старые этапы
      const { error: deleteError } = await supabase
        .from('workflow_stages')
        .delete()
        .eq('route_id', editingRoute.id)

      if (deleteError) throw deleteError

      // Добавляем новые этапы
      if (editingStages.length > 0) {
        const stagesToInsert = editingStages.map(stage => ({
          route_id: editingRoute.id,
          order_index: stage.order_index,
          role_id: stage.role_id,
          name: stage.name,
          payment_status_id: stage.payment_status_id || null,
          invoice_status_id: stage.invoice_status_id || null
        }))

        const { error: insertError } = await supabase
          .from('workflow_stages')
          .insert(stagesToInsert)

        if (insertError) throw insertError
      }

      message.success('Этапы сохранены')
      setStagesModalVisible(false)
      setEditingRoute(null)
      setEditingStages([])
      loadRoutes()
    } catch (error: any) {
      console.error('[ApprovalRoutesTab.handleSaveStages] Error:', error)
      message.error(error.message || 'Ошибка сохранения этапов')
    }
  }

  // Компонент перетаскиваемой карточки этапа
  interface SortableStageCardProps {
    stage: WorkflowStage
    index: number
    onStageChange: (index: number, field: string, value: any) => void
    onRemoveStage: (index: number) => void
    roles: Role[]
    paymentStatuses: any[]
    invoiceStatuses: any[]
  }

  const SortableStageCard = ({
    stage,
    index,
    onStageChange,
    onRemoveStage,
    roles,
    paymentStatuses,
    invoiceStatuses
  }: SortableStageCardProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: `stage-${index}` })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
    }

    const selectedRole = roles.find(r => r.id === stage.role_id)
    const selectedPaymentStatus = paymentStatuses.find(s => s.id === stage.payment_status_id)
    const selectedInvoiceStatus = invoiceStatuses.find(s => s.id === stage.invoice_status_id)

    return (
      <div ref={setNodeRef} style={style}>
        <Card
          size="small"
          style={{
            marginBottom: 12,
            border: isDragging ? '2px dashed #1890ff' : '1px solid #d9d9d9',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
          bodyStyle={{ padding: '16px' }}
          extra={
            <Space>
              <Button
                icon={<HolderOutlined />}
                type="text"
                size="small"
                style={{ cursor: 'grab' }}
                {...attributes}
                {...listeners}
                title="Перетащить для изменения порядка"
              />
              <Button
                icon={<DeleteOutlined />}
                type="text"
                size="small"
                danger
                onClick={() => onRemoveStage(index)}
                title="Удалить этап"
              />
            </Space>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Заголовок этапа */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  minWidth: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  value={stage.name}
                  onChange={(e) => onStageChange(index, 'name', e.target.value)}
                  placeholder={`Этап ${index + 1} - название (необязательно)`}
                  style={{ fontWeight: 500 }}
                />
              </div>
            </div>

            {/* Роль */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserOutlined style={{ color: '#1890ff', fontSize: 16 }} />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                  Ответственная роль
                </div>
                <Select
                  value={stage.role_id || undefined}
                  onChange={(value) => onStageChange(index, 'role_id', value)}
                  placeholder="Выберите роль"
                  style={{ width: '100%' }}
                  size="small"
                >
                  {roles.map(role => (
                    <Select.Option key={role.id} value={role.id}>
                      <Tag color="blue" style={{ marginRight: 8 }}>
                        {role.code}
                      </Tag>
                      {role.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              {selectedRole && (
                <Tag color="blue">
                  {selectedRole.code}
                </Tag>
              )}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* Статусы */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Статус платежа */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <DollarOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                  <span style={{ fontSize: 12, color: '#666' }}>Статус платежа</span>
                </div>
                <Select
                  value={stage.payment_status_id || undefined}
                  onChange={(value) => onStageChange(index, 'payment_status_id', value)}
                  placeholder="Не изменять"
                  style={{ width: '100%' }}
                  size="small"
                  allowClear
                >
                  {paymentStatuses.map(status => (
                    <Select.Option key={status.id} value={status.id}>
                      {status.name}
                    </Select.Option>
                  ))}
                </Select>
                {selectedPaymentStatus && (
                  <Tag color="green" style={{ marginTop: 4, fontSize: 11 }}>
                    {selectedPaymentStatus.name}
                  </Tag>
                )}
              </div>

              {/* Статус счёта */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FileTextOutlined style={{ color: '#faad14', fontSize: 14 }} />
                  <span style={{ fontSize: 12, color: '#666' }}>Статус счёта</span>
                </div>
                <Select
                  value={stage.invoice_status_id || undefined}
                  onChange={(value) => onStageChange(index, 'invoice_status_id', value)}
                  placeholder="Не изменять"
                  style={{ width: '100%' }}
                  size="small"
                  allowClear
                >
                  {invoiceStatuses.map(status => (
                    <Select.Option key={status.id} value={status.id}>
                      {status.name}
                    </Select.Option>
                  ))}
                </Select>
                {selectedInvoiceStatus && (
                  <Tag color="orange" style={{ marginTop: 4, fontSize: 11 }}>
                    {selectedInvoiceStatus.name}
                  </Tag>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      title: 'Тип счёта',
      dataIndex: ['invoice_type', 'name'],
      key: 'invoice_type',
      render: (text: string) => text || 'Не указан'
    },
    {
      title: 'Название маршрута',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Этапы',
      key: 'stages',
      render: (_: any, record: ApprovalRoute) => {
        const stages = record.stages || []
        return (
          <Space direction="vertical" size={0}>
            {stages.sort((a, b) => a.order_index - b.order_index).map((stage, index) => (
              <Tag key={stage.id} color="blue">
                {index + 1}. {stage.role?.name || 'Роль не указана'}
              </Tag>
            ))}
            {stages.length === 0 && <span style={{ color: '#999' }}>Не настроены</span>}
          </Space>
        )
      }
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'Активен' : 'Неактивен'}
        </Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: ApprovalRoute) => (
        <Space>
          <Button
            icon={<SettingOutlined />}
            size="small"
            onClick={() => handleConfigureStages(record)}
            title="Настроить этапы"
          />
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingRoute(record)
              form.setFieldsValue({
                invoice_type_id: record.invoice_type_id,
                name: record.name,
                is_active: record.is_active
              })
              setModalVisible(true)
            }}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeleteRoute(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRoute(null)
            form.resetFields()
            form.setFieldsValue({ is_active: true })
            setModalVisible(true)
          }}
        >
          Добавить маршрут
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={routes}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`
        }}
      />

      {/* Модал создания/редактирования маршрута */}
      <Modal
        title={editingRoute ? 'Редактировать маршрут' : 'Новый маршрут'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false)
          setEditingRoute(null)
          form.resetFields()
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveRoute}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="invoice_type_id"
            label="Тип счёта"
            rules={[{ required: true, message: 'Выберите тип счёта' }]}
          >
            <Select placeholder="Выберите тип счёта">
              {invoiceTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Название маршрута"
            rules={[{ required: true, message: 'Введите название маршрута' }]}
          >
            <Input placeholder="Например: Согласование услуг" />
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

      {/* Модал настройки этапов */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SettingOutlined style={{ color: '#1890ff' }} />
            <span>Настройка этапов: {editingRoute?.name}</span>
          </div>
        }
        open={stagesModalVisible}
        onOk={handleSaveStages}
        onCancel={() => {
          setStagesModalVisible(false)
          setEditingRoute(null)
          setEditingStages([])
        }}
        okText="Сохранить"
        cancelText="Отмена"
        width={1000}
        styles={{
          body: { padding: '24px' }
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Button
            type="dashed"
            onClick={handleAddStage}
            block
            icon={<PlusOutlined />}
            size="large"
            style={{
              height: 48,
              borderStyle: 'dashed',
              borderColor: '#1890ff',
              color: '#1890ff',
              fontSize: 16
            }}
          >
            Добавить этап
          </Button>
        </div>

        {editingStages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 48,
              color: '#999',
              fontSize: 16,
              backgroundColor: '#fafafa',
              borderRadius: 8,
              border: '1px dashed #d9d9d9'
            }}
          >
            <SettingOutlined style={{ fontSize: 32, marginBottom: 16, color: '#d9d9d9' }} />
            <div>Добавьте этапы согласования для настройки рабочего процесса</div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={editingStages.map((_, index) => `stage-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                {editingStages.map((stage, index) => (
                  <SortableStageCard
                    key={`stage-${index}`}
                    stage={stage}
                    index={index}
                    onStageChange={handleStageChange}
                    onRemoveStage={handleRemoveStage}
                    roles={roles}
                    paymentStatuses={paymentStatuses}
                    invoiceStatuses={invoiceStatuses}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {editingStages.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <SettingOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontWeight: 500, color: '#52c41a' }}>
                Настроено этапов: {editingStages.length}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Перетащите карточки этапов для изменения порядка. Каждый этап может автоматически изменять статусы счёта и платежа при прохождении.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}