import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Switch, message, Card, Tag, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, UserOutlined, DollarOutlined } from '@ant-design/icons'
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
  role?: Role
  payment_status?: any
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
  const [modalVisible, setModalVisible] = useState(false)
  const [stagesModalVisible, setStagesModalVisible] = useState(false)
  const [editingRoute, setEditingRoute] = useState<ApprovalRoute | null>(null)
  const [editingStages, setEditingStages] = useState<WorkflowStage[]>([])
  const [form] = Form.useForm()

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
            role:roles(id, code, name),
            payment_status:payment_statuses(id, name)
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
  const handleAddStage = useCallback(() => {
    const newStage: WorkflowStage = {
      order_index: editingStages.length,
      role_id: 0,
      name: '',
      payment_status_id: undefined
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
      newStages[index] = { ...newStages[index], [field]: value }
      return newStages
    })
  }, [])

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
          payment_status_id: stage.payment_status_id || null
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
        width={900}
        styles={{
          body: { padding: '24px' }
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <Button
            type="dashed"
            onClick={handleAddStage}
            block
            icon={<PlusOutlined />}
            style={{ borderColor: '#1890ff', color: '#1890ff' }}
          >
            Добавить этап
          </Button>
        </div>

        {editingStages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: '#999',
              backgroundColor: '#fafafa',
              borderRadius: 8,
              border: '1px dashed #d9d9d9'
            }}
          >
            <SettingOutlined style={{ fontSize: 24, marginBottom: 8, color: '#d9d9d9' }} />
            <div>Добавьте этапы согласования</div>
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {editingStages.map((stage, index) => (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 12 }}
                styles={{ body: { padding: '12px' } }}
              >
                <Row gutter={[12, 12]} align="middle">
                  <Col span={1}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#1890ff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {index + 1}
                    </div>
                  </Col>
                  <Col span={7}>
                    <Input
                      value={stage.name}
                      onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                      placeholder={`Название этапа ${index + 1}`}
                      size="small"
                    />
                  </Col>
                  <Col span={7}>
                    <Select
                      value={stage.role_id || undefined}
                      onChange={(value) => handleStageChange(index, 'role_id', value)}
                      placeholder="Выберите роль"
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {roles.map(role => (
                        <Select.Option key={role.id} value={role.id}>
                          {role.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={7}>
                    <Select
                      value={stage.payment_status_id || undefined}
                      onChange={(value) => handleStageChange(index, 'payment_status_id', value)}
                      placeholder="Статус платежа"
                      size="small"
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
                    <Button
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      onClick={() => handleRemoveStage(index)}
                    />
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}

        {editingStages.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 13, color: '#52c41a', fontWeight: 500 }}>
              Настроено этапов: {editingStages.length}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Каждый этап может автоматически изменять статус платежа при прохождении
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}