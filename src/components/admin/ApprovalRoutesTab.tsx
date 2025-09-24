import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Space,
  Switch,
  message,
  Tag,
  Row,
  Col,
  List,
  Empty,
  Popconfirm,
  Typography,
  Divider,
  Spin,
  Checkbox
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileAddOutlined,
  DollarOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import type { InvoiceType } from '../../lib/supabase'

const { Title, Text } = Typography

interface Role {
  id: number
  code: string
  name: string
}

interface StagePermissions {
  can_edit_invoice?: boolean
  can_add_files?: boolean
  can_edit_amount?: boolean
  [key: string]: boolean | undefined // Для будущих разрешений
}

interface WorkflowStage {
  id?: number
  route_id?: number
  order_index: number
  role_id: number
  name: string
  payment_status_id?: number
  role?: Role
  payment_status?: any
  permissions?: StagePermissions
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
  const [loading, setLoading] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<ApprovalRoute | null>(null)
  const [editingRoute, setEditingRoute] = useState<number | null>(null)
  const [editingStages, setEditingStages] = useState<WorkflowStage[]>([])
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  const [savingStages, setSavingStages] = useState(false)
  const [form] = Form.useForm()
  const [newRouteForm] = Form.useForm()

  // Загрузка справочников
  const loadReferences = useCallback(async () => {
    console.log('[ApprovalRoutesTab.loadReferences] Loading references')

    try {
      const [typesResponse, rolesResponse, paymentStatusesResponse] = await Promise.all([
        supabase.from('invoice_types').select('*').order('name'),
        supabase.from('roles').select('*').order('name'),
        supabase.from('payment_statuses').select('*').order('sort_order')
      ])

      if (typesResponse.error) throw typesResponse.error
      if (rolesResponse.error) throw rolesResponse.error
      if (paymentStatusesResponse.error) throw paymentStatusesResponse.error

      setInvoiceTypes(typesResponse.data as InvoiceType[])
      setRoles(rolesResponse.data as Role[])
      setPaymentStatuses(paymentStatusesResponse.data || [])
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
            permissions,
            role:roles(id, code, name),
            payment_status:payment_statuses(id, name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const routesData = data as ApprovalRoute[]
      setRoutes(routesData)

      // Если есть выбранный маршрут, обновляем его данные
      setSelectedRoute(prevSelected => {
        if (prevSelected) {
          const updatedRoute = routesData.find(r => r.id === prevSelected.id)
          if (updatedRoute) {
            const stages = updatedRoute.stages?.sort((a, b) => a.order_index - b.order_index).map(stage => ({
              ...stage,
              permissions: stage.permissions || {}
            })) || []
            setEditingStages(stages)
            return updatedRoute
          }
        }
        return prevSelected
      })

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
  }, [])

  // Выбор маршрута
  const handleSelectRoute = (route: ApprovalRoute) => {
    console.log('[ApprovalRoutesTab.handleSelectRoute] Selected route:', route.id)
    setSelectedRoute(route)
    const stages = route.stages?.sort((a, b) => a.order_index - b.order_index).map(stage => ({
      ...stage,
      permissions: stage.permissions || {}
    })) || []
    setEditingStages(stages)
    setEditingRoute(null)
    setIsAddingRoute(false)
  }

  // Создание нового маршрута
  const handleCreateRoute = async (values: any) => {
    console.log('[ApprovalRoutesTab.handleCreateRoute] Creating route:', values)

    try {
      const { data, error } = await supabase
        .from('approval_routes')
        .insert([{
          invoice_type_id: values.invoice_type_id,
          name: values.name,
          is_active: values.is_active ?? true
        }])
        .select()
        .single()

      if (error) throw error

      message.success('Маршрут создан')
      setIsAddingRoute(false)
      newRouteForm.resetFields()
      await loadRoutes()

      // Автоматически выбираем новый маршрут
      if (data) {
        handleSelectRoute(data as ApprovalRoute)
      }
    } catch (error: any) {
      console.error('[ApprovalRoutesTab.handleCreateRoute] Error:', error)
      if (error.code === '23505') {
        message.error('Маршрут для этого типа счета уже существует')
      } else {
        message.error(error.message || 'Ошибка создания маршрута')
      }
    }
  }

  // Обновление маршрута
  const handleUpdateRoute = async (id: number, values: any) => {
    console.log('[ApprovalRoutesTab.handleUpdateRoute] Updating route:', id, values)

    try {
      const { error } = await supabase
        .from('approval_routes')
        .update({
          name: values.name,
          invoice_type_id: values.invoice_type_id,
          is_active: values.is_active
        })
        .eq('id', id)

      if (error) throw error

      message.success('Маршрут обновлён')
      setEditingRoute(null)
      form.resetFields()
      loadRoutes()
    } catch (error: any) {
      console.error('[ApprovalRoutesTab.handleUpdateRoute] Error:', error)
      message.error(error.message || 'Ошибка обновления маршрута')
    }
  }

  // Удаление маршрута
  const handleDeleteRoute = async (id: number) => {
    console.log('[ApprovalRoutesTab.handleDeleteRoute] Deleting route:', id)

    try {
      const { error } = await supabase
        .from('approval_routes')
        .delete()
        .eq('id', id)

      if (error) throw error

      message.success('Маршрут удалён')

      // Если удалили выбранный маршрут, сбрасываем выбор
      if (selectedRoute?.id === id) {
        setSelectedRoute(null)
        setEditingStages([])
      }

      loadRoutes()
    } catch (error: any) {
      console.error('[ApprovalRoutesTab.handleDeleteRoute] Error:', error)
      message.error(error.message || 'Ошибка удаления маршрута')
    }
  }

  // Добавление этапа
  const handleAddStage = useCallback(() => {
    const newStage: WorkflowStage = {
      order_index: editingStages.length,
      role_id: 0,
      name: `Этап ${editingStages.length + 1}`,
      payment_status_id: undefined,
      permissions: {
        can_edit_invoice: false,
        can_add_files: false,
        can_edit_amount: false
      }
    }
    setEditingStages([...editingStages, newStage])
  }, [editingStages])

  // Удаление этапа
  const handleRemoveStage = useCallback((index: number) => {
    const newStages = editingStages.filter((_, i) => i !== index)
      .map((stage, i) => ({ ...stage, order_index: i }))
    setEditingStages(newStages)
  }, [editingStages])

  // Изменение этапа
  const handleStageChange = useCallback((index: number, field: string, value: any) => {
    setEditingStages(prev => {
      const newStages = [...prev]
      if (field === 'permissions') {
        // Для разрешений объединяем с существующими
        newStages[index] = {
          ...newStages[index],
          permissions: value
        }
      } else {
        newStages[index] = { ...newStages[index], [field]: value }
      }
      return newStages
    })
  }, [])

  // Сохранение этапов
  const handleSaveStages = async () => {
    if (!selectedRoute) return

    console.log('[ApprovalRoutesTab.handleSaveStages] Saving stages:', editingStages)
    setSavingStages(true)

    try {
      // Проверяем, что все этапы заполнены
      const invalidStages = editingStages.filter(s => !s.name || !s.role_id)
      if (invalidStages.length > 0) {
        message.warning('Заполните название и роль для всех этапов')
        setSavingStages(false)
        return
      }

      // Получаем существующие этапы
      const { data: existingStages, error: fetchError } = await supabase
        .from('workflow_stages')
        .select('id, order_index')
        .eq('route_id', selectedRoute.id)
        .order('order_index')

      if (fetchError) throw fetchError

      const existingIds = existingStages?.map(s => s.id) || []
      const stagesToUpdate: any[] = []
      const stagesToInsert: any[] = []
      const idsToKeep: number[] = []

      // Разделяем этапы на обновляемые и новые
      editingStages.forEach((stage, index) => {
        const stageData = {
          route_id: selectedRoute.id,
          order_index: index,
          role_id: stage.role_id,
          name: stage.name,
          payment_status_id: stage.payment_status_id || null,
          permissions: stage.permissions || {}
        }

        if (stage.id && existingIds.includes(stage.id)) {
          // Обновляем существующий этап
          stagesToUpdate.push({ ...stageData, id: stage.id })
          idsToKeep.push(stage.id)
        } else if (existingStages && existingStages[index]) {
          // Переиспользуем существующий этап по индексу
          stagesToUpdate.push({ ...stageData, id: existingStages[index].id })
          idsToKeep.push(existingStages[index].id)
        } else {
          // Добавляем новый этап
          stagesToInsert.push(stageData)
        }
      })

      // Обновляем существующие этапы
      for (const stage of stagesToUpdate) {
        const { error: updateError } = await supabase
          .from('workflow_stages')
          .update({
            order_index: stage.order_index,
            role_id: stage.role_id,
            name: stage.name,
            payment_status_id: stage.payment_status_id,
            is_active: stage.is_active,
            permissions: stage.permissions
          })
          .eq('id', stage.id)

        if (updateError) throw updateError
      }

      // Добавляем новые этапы
      if (stagesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('workflow_stages')
          .insert(stagesToInsert)

        if (insertError) throw insertError
      }

      // Деактивируем неиспользуемые этапы вместо удаления
      const idsToDeactivate = existingIds.filter(id => !idsToKeep.includes(id))
      if (idsToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
          .from('workflow_stages')
          .update({ is_active: false })
          .in('id', idsToDeactivate)

        if (deactivateError) throw deactivateError
      }

      message.success('Этапы сохранены')
      loadRoutes()
    } catch (error: any) {
      console.error('[ApprovalRoutesTab.handleSaveStages] Error:', error)
      message.error(error.message || 'Ошибка сохранения этапов')
    } finally {
      setSavingStages(false)
    }
  }

  return (
    <Row gutter={16} style={{ height: 'calc(100vh - 200px)' }}>
      {/* Левая часть - список маршрутов */}
      <Col span={8}>
        <Card
          title="Маршруты согласования"
          style={{ height: '100%' }}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setIsAddingRoute(true)}
            >
              Добавить
            </Button>
          }
        >
          {isAddingRoute && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed' }} styles={{ body: { padding: '12px' } }}>
              <Form
                form={newRouteForm}
                layout="vertical"
                onFinish={handleCreateRoute}
                size="small"
              >
                <Form.Item
                  name="invoice_type_id"
                  label="Тип счёта"
                  rules={[{ required: true, message: 'Выберите тип' }]}
                  style={{ marginBottom: 8 }}
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
                  label="Название"
                  rules={[{ required: true, message: 'Введите название' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Название маршрута" />
                </Form.Item>

                <Form.Item
                  name="is_active"
                  label="Активен"
                  valuePropName="checked"
                  initialValue={true}
                  style={{ marginBottom: 8 }}
                >
                  <Switch />
                </Form.Item>

                <Space>
                  <Button type="primary" htmlType="submit" size="small" icon={<SaveOutlined />}>
                    Создать
                  </Button>
                  <Button size="small" onClick={() => {
                    setIsAddingRoute(false)
                    newRouteForm.resetFields()
                  }}>
                    Отмена
                  </Button>
                </Space>
              </Form>
            </Card>
          )}

          <List
            loading={loading}
            dataSource={routes}
            renderItem={route => (
              <List.Item
                key={route.id}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor: selectedRoute?.id === route.id ? '#e6f7ff' : 'transparent',
                  borderRadius: 4,
                  marginBottom: 8
                }}
                onClick={() => handleSelectRoute(route)}
                actions={editingRoute === route.id ? [
                  <Button
                    key="save"
                    type="link"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      form.submit()
                    }}
                  >
                    Сохранить
                  </Button>,
                  <Button
                    key="cancel"
                    type="link"
                    size="small"
                    danger
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingRoute(null)
                      form.resetFields()
                    }}
                  >
                    Отмена
                  </Button>
                ] : [
                  <Button
                    key="edit"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingRoute(route.id)
                      form.setFieldsValue({
                        name: route.name,
                        invoice_type_id: route.invoice_type_id,
                        is_active: route.is_active
                      })
                    }}
                  />,
                  <Popconfirm
                    key="delete"
                    title="Удалить маршрут?"
                    description="Все этапы будут удалены"
                    onConfirm={(e) => {
                      e?.stopPropagation()
                      handleDeleteRoute(route.id)
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="Удалить"
                    cancelText="Отмена"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                ]}
              >
                {editingRoute === route.id ? (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => handleUpdateRoute(route.id, values)}
                    size="small"
                    style={{ width: '100%' }}
                  >
                    <Form.Item
                      name="name"
                      style={{ marginBottom: 8 }}
                      rules={[{ required: true, message: 'Введите название' }]}
                    >
                      <Input placeholder="Название маршрута" />
                    </Form.Item>
                    <Form.Item
                      name="invoice_type_id"
                      style={{ marginBottom: 8 }}
                      rules={[{ required: true, message: 'Выберите тип' }]}
                    >
                      <Select placeholder="Тип счёта">
                        {invoiceTypes.map(type => (
                          <Select.Option key={type.id} value={type.id}>
                            {type.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      name="is_active"
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
                    </Form.Item>
                  </Form>
                ) : (
                  <List.Item.Meta
                    title={
                      <Space>
                        {route.name}
                        <Tag color={route.is_active ? 'green' : 'default'} style={{ marginLeft: 8 }}>
                          {route.is_active ? 'Активен' : 'Неактивен'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {route.invoice_type?.name || 'Тип не указан'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Этапов: {route.stages?.length || 0}
                        </Text>
                      </Space>
                    }
                  />
                )}
              </List.Item>
            )}
            locale={{
              emptyText: <Empty description="Нет маршрутов" />
            }}
          />
        </Card>
      </Col>

      {/* Правая часть - конструктор этапов */}
      <Col span={16}>
        <Card
          title={
            selectedRoute ? (
              <Space>
                <Text>Настройка этапов:</Text>
                <Text strong>{selectedRoute.name}</Text>
              </Space>
            ) : (
              'Выберите маршрут для настройки этапов'
            )
          }
          style={{ height: '100%' }}
          extra={
            selectedRoute && (
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveStages}
                  loading={savingStages}
                >
                  Сохранить этапы
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={handleAddStage}
                >
                  Добавить этап
                </Button>
              </Space>
            )
          }
        >
          {!selectedRoute ? (
            <Empty
              description="Выберите маршрут из списка слева для настройки этапов согласования"
              style={{ marginTop: 100 }}
            />
          ) : (
            <div style={{ height: 'calc(100% - 50px)', overflowY: 'auto' }}>
              {editingStages.length === 0 ? (
                <Empty
                  description="Нет этапов согласования"
                  style={{ marginTop: 100 }}
                >
                  <Button type="primary" onClick={handleAddStage}>
                    Добавить первый этап
                  </Button>
                </Empty>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {editingStages.map((stage, index) => (
                    <Card
                      key={index}
                      size="small"
                      style={{ backgroundColor: '#fafafa' }}
                      styles={{ body: { padding: '12px 16px' } }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Row gutter={12} align="middle">
                          <Col span={1}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: '#1890ff',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600
                              }}
                            >
                              {index + 1}
                            </div>
                          </Col>
                          <Col span={5}>
                            <Input
                              value={stage.name}
                              onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                              placeholder="Название этапа"
                              size="middle"
                            />
                          </Col>
                          <Col span={6}>
                            <Select
                              value={stage.role_id || undefined}
                              onChange={(value) => handleStageChange(index, 'role_id', value)}
                              placeholder="Выберите роль"
                              size="middle"
                              style={{ width: '100%' }}
                            >
                              {roles.map(role => (
                                <Select.Option key={role.id} value={role.id}>
                                  {role.name}
                                </Select.Option>
                              ))}
                            </Select>
                          </Col>
                          <Col span={6}>
                            <Select
                              value={stage.payment_status_id || undefined}
                              onChange={(value) => handleStageChange(index, 'payment_status_id', value)}
                              placeholder="Статус платежа (опционально)"
                              size="middle"
                              style={{ width: '100%' }}
                              allowClear
                            >
                              {paymentStatuses.map(status => (
                                <Select.Option key={status.id} value={status.id}>
                                  {status.name}
                                </Select.Option>
                              ))}
                            </Select>
                          </Col>
                          <Col span={2}>
                            <Popconfirm
                              title="Удалить этап?"
                              onConfirm={() => handleRemoveStage(index)}
                              okText="Удалить"
                              cancelText="Отмена"
                            >
                              <Button
                                icon={<DeleteOutlined />}
                                size="middle"
                                danger
                                type="text"
                              />
                            </Popconfirm>
                          </Col>
                        </Row>
                        <Row gutter={12}>
                          <Col span={1}></Col>
                          <Col span={22}>
                            <Card size="small" style={{ backgroundColor: '#f9f9f9' }}>
                              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Дополнительные разрешения на этом этапе:
                                </Text>
                                <Space wrap>
                                  <Checkbox
                                    checked={stage.permissions?.can_edit_invoice || false}
                                    onChange={(e) => handleStageChange(index, 'permissions', {
                                      ...stage.permissions,
                                      can_edit_invoice: e.target.checked
                                    })}
                                  >
                                    <Space size={4}>
                                      <FileTextOutlined style={{ color: '#1890ff' }} />
                                      <Text style={{ fontSize: 13 }}>Редактировать счёт и файлы</Text>
                                    </Space>
                                  </Checkbox>
                                  <Checkbox
                                    checked={stage.permissions?.can_add_files || false}
                                    onChange={(e) => handleStageChange(index, 'permissions', {
                                      ...stage.permissions,
                                      can_add_files: e.target.checked
                                    })}
                                  >
                                    <Space size={4}>
                                      <FileAddOutlined style={{ color: '#52c41a' }} />
                                      <Text style={{ fontSize: 13 }}>Добавлять файлы</Text>
                                    </Space>
                                  </Checkbox>
                                  <Checkbox
                                    checked={stage.permissions?.can_edit_amount || false}
                                    onChange={(e) => handleStageChange(index, 'permissions', {
                                      ...stage.permissions,
                                      can_edit_amount: e.target.checked
                                    })}
                                  >
                                    <Space size={4}>
                                      <DollarOutlined style={{ color: '#fa8c16' }} />
                                      <Text style={{ fontSize: 13 }}>Редактировать сумму платежа</Text>
                                    </Space>
                                  </Checkbox>
                                </Space>
                              </Space>
                            </Card>
                          </Col>
                        </Row>
                      </Space>
                    </Card>
                  ))}

                  {editingStages.length > 0 && (
                    <Card size="small" style={{ backgroundColor: '#f6ffed', marginTop: 16 }}>
                      <Space direction="vertical" size={4}>
                        <Text strong style={{ color: '#52c41a' }}>
                          <CheckCircleOutlined /> Настроено этапов: {editingStages.length}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Каждый этап может автоматически изменять статус платежа при прохождении.
                          Не забудьте сохранить изменения после настройки этапов.
                        </Text>
                      </Space>
                    </Card>
                  )}
                </Space>
              )}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )
}