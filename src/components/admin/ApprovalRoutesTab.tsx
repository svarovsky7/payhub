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
import type { FormValues } from '../../types/common'

export const ApprovalRoutesTab = () => {
  const [routes, setRoutes] = useState<ApprovalRoute[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<any[]>([])
  const [invoiceStatuses, setInvoiceStatuses] = useState<any[]>([])
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
      setLoading(true)
      const [
        typesRes,
        rolesRes,
        paymentStatusesRes,
        invoiceStatusesRes
      ] = await Promise.all([
        supabase.from('invoice_types').select('*'),
        supabase.from('roles').select('*'),
        supabase.from('payment_statuses').select('*'),
        supabase.from('invoice_statuses').select('*')
      ])

      if (typesRes.error) throw typesRes.error
      if (rolesRes.error) throw rolesRes.error
      if (paymentStatusesRes.error) throw paymentStatusesRes.error
      if (invoiceStatusesRes.error) throw invoiceStatusesRes.error

      setInvoiceTypes(typesRes.data)
      setRoles(rolesRes.data)
      setPaymentStatuses(paymentStatusesRes.data)
      setInvoiceStatuses(invoiceStatusesRes.data)
    } catch (error) {
      console.error('[ApprovalRoutesTab.loadReferences] Error:', error)
      message.error('Ошибка загрузки справочников')
    } finally {
      setLoading(false)
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
            invoice_status_id,
            permissions,
            role:roles(id, code, name),
            payment_status:payment_statuses(id, name),
            invoice_status:invoice_statuses(id, name)
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
  }, [loadReferences, loadRoutes])

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
  const handleCreateRoute = async (values: FormValues) => {

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
    } catch (error: unknown) {
      console.error('[ApprovalRoutesTab.handleCreateRoute] Error:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка создания маршрута')
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
    } catch (error: unknown) {
      console.error('[ApprovalRoutesTab.handleUpdateRoute] Error:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка обновления маршрута')
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
    } catch (error: unknown) {
      console.error('[ApprovalRoutesTab.handleDeleteRoute] Error:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка удаления маршрута')
    }
  }

  // Добавление этапа
  const handleAddStage = useCallback(() => {
    const newStage: WorkflowStage = {
      order_index: editingStages.length,
      role_id: 0,
      name: `Этап ${editingStages.length + 1}`,
      payment_status_id: undefined,
      invoice_status_id: undefined,
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

      console.log('[ApprovalRoutesTab.handleSaveStages] Saving stages for route:', selectedRoute.id)

      // Новая логика: UPDATE существующих этапов и INSERT новых
      // Это позволяет избежать конфликтов с foreign key при наличии активных согласований

      for (let index = 0; index < editingStages.length; index++) {
        const stage = editingStages[index]

        const stageData = {
          route_id: selectedRoute.id,
          order_index: index,
          role_id: stage.role_id,
          name: stage.name,
          payment_status_id: stage.payment_status_id || null,
          invoice_status_id: stage.invoice_status_id || null,
          permissions: stage.permissions || {},
          is_active: true
        }

        if (stage.id) {
          // UPDATE существующего этапа
          const { error: updateError } = await supabase
            .from('workflow_stages')
            .update(stageData)
            .eq('id', stage.id)

          if (updateError) {
            console.error('[ApprovalRoutesTab.handleSaveStages] Update error:', updateError)
            throw updateError
          }
          console.log('[ApprovalRoutesTab.handleSaveStages] Updated stage:', stage.id)
        } else {
          // INSERT нового этапа
          const { error: insertError } = await supabase
            .from('workflow_stages')
            .insert(stageData)

          if (insertError) {
            console.error('[ApprovalRoutesTab.handleSaveStages] Insert error:', insertError)
            throw insertError
          }
          console.log('[ApprovalRoutesTab.handleSaveStages] Inserted new stage at index:', index)
        }
      }

      // Удаляем этапы, которые больше не нужны (если их больше чем в editingStages)
      // Но только те, которые НЕ используются в активных согласованиях
      const { data: existingStages } = await supabase
        .from('workflow_stages')
        .select('id')
        .eq('route_id', selectedRoute.id)

      if (existingStages && existingStages.length > editingStages.length) {
        const stagesToKeep = editingStages.filter(s => s.id).map(s => s.id)
        const stagesToDelete = existingStages
          .filter(s => !stagesToKeep.includes(s.id))
          .map(s => s.id)

        if (stagesToDelete.length > 0) {
          // Пытаемся удалить неиспользуемые этапы (может не удастся если есть FK)
          const { error: deleteError } = await supabase
            .from('workflow_stages')
            .delete()
            .in('id', stagesToDelete)

          if (deleteError) {
            // Игнорируем ошибку FK - просто не удаляем этапы которые используются
            console.warn('[ApprovalRoutesTab.handleSaveStages] Could not delete old stages (may be in use):', deleteError)
          }
        }
      }

      message.success('Этапы сохранены')
      loadRoutes()
    } catch (error: unknown) {
      console.error('[ApprovalRoutesTab.handleSaveStages] Error:', error)
      message.error(error instanceof Error ? error.message : 'Ошибка сохранения этапов')
    } finally {
      setSavingStages(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8f9fc 0%, #eef0f5 100%)',
      minHeight: 'calc(100vh - 200px)',
      padding: '24px',
      borderRadius: '12px'
    }}>
      <Row gutter={24}>
        {/* Левая часть - список маршрутов */}
        <Col xs={24} lg={10} xl={9}>
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
        <Col xs={24} lg={14} xl={15}>
          <StagesEditor
            selectedRoute={selectedRoute}
            editingStages={editingStages}
            roles={roles}
            paymentStatuses={paymentStatuses}
            invoiceStatuses={invoiceStatuses}
            savingStages={savingStages}
            onAddStage={handleAddStage}
            onRemoveStage={handleRemoveStage}
            onStageChange={handleStageChange}
            onSaveStages={handleSaveStages}
          />
        </Col>
      </Row>
    </div>
  )
}