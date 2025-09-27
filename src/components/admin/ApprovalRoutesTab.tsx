import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Form, message } from 'antd'
import { supabase } from '../../lib/supabase'
import type { InvoiceType } from '../../lib/supabase'
import { RoutesList } from './approval-routes/RoutesList'
import { NewRouteForm } from './approval-routes/NewRouteForm'
import { StagesEditor } from './approval-routes/StagesEditor'
import type {
  ApprovalRoute,
  Role,
  WorkflowStage
} from './approval-routes/types'

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
        <NewRouteForm
          form={newRouteForm}
          invoiceTypes={invoiceTypes}
          loading={loading}
          isAddingRoute={isAddingRoute}
          setIsAddingRoute={setIsAddingRoute}
          onCreateRoute={handleCreateRoute}
        />

        <div style={{ marginTop: isAddingRoute ? 16 : 0 }}>
          <RoutesList
            routes={routes}
            loading={loading}
            selectedRoute={selectedRoute}
            onSelectRoute={handleSelectRoute}
            onUpdateRoute={handleUpdateRoute}
            onDeleteRoute={handleDeleteRoute}
            setEditingRoute={setEditingRoute}
            editingRoute={editingRoute}
          />
        </div>
      </Col>

      {/* Правая часть - конструктор этапов */}
      <Col span={16}>
        <StagesEditor
          selectedRoute={selectedRoute}
          editingStages={editingStages}
          roles={roles}
          paymentStatuses={paymentStatuses}
          savingStages={savingStages}
          onAddStage={handleAddStage}
          onRemoveStage={handleRemoveStage}
          onStageChange={handleStageChange}
          onSaveStages={handleSaveStages}
        />
      </Col>
    </Row>
  )
}