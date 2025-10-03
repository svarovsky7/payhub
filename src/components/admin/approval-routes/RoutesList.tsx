import { useState } from 'react'
import {
  Button,
  Popconfirm,
  Switch,
  Space,
  Tag,
  Typography,
  Empty,
  Input,
  message,
  Badge,
  Spin
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import type { ApprovalRoute } from './types'

const { Text } = Typography

interface RoutesListProps {
  routes: ApprovalRoute[]
  loading: boolean
  selectedRoute: ApprovalRoute | null
  onSelectRoute: (route: ApprovalRoute) => void
  onUpdateRoute: (id: number, values: { name?: string; invoice_type_id?: number; is_active?: boolean }) => void
  onDeleteRoute: (id: number) => void
  setEditingRoute: (id: number | null) => void
  editingRoute: number | null
}

export const RoutesList = ({
  routes,
  loading,
  selectedRoute,
  onSelectRoute,
  onUpdateRoute,
  onDeleteRoute,
  setEditingRoute,
  editingRoute
}: RoutesListProps) => {
  const [editingName, setEditingName] = useState<string>('')

  const handleToggleActive = async (route: ApprovalRoute) => {
    await onUpdateRoute(route.id, { is_active: !route.is_active })
  }

  const handleStartEdit = (route: ApprovalRoute, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingRoute(route.id)
    setEditingName(route.name)
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingRoute(null)
    setEditingName('')
  }

  const handleSaveEdit = async (route: ApprovalRoute, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!editingName.trim()) {
      message.warning('Название не может быть пустым')
      return
    }

    if (editingName.trim().length < 3) {
      message.warning('Название должно содержать минимум 3 символа')
      return
    }

    await onUpdateRoute(route.id, {
      name: editingName.trim(),
      invoice_type_id: route.invoice_type_id,
      is_active: route.is_active
    })

    setEditingRoute(null)
    setEditingName('')
  }

  // Группировка маршрутов по типам счетов
  const groupedRoutes = routes.reduce((acc, route) => {
    const typeId = route.invoice_type_id
    const typeName = route.invoice_type?.name || 'Без типа'

    if (!acc[typeId]) {
      acc[typeId] = {
        typeName,
        routes: []
      }
    }
    acc[typeId].routes.push(route)
    return acc
  }, {} as Record<number, { typeName: string; routes: ApprovalRoute[] }>)

  const groupedData = Object.entries(groupedRoutes).map(([typeId, data]) => ({
    typeId: Number(typeId),
    typeName: data.typeName,
    routes: data.routes
  }))

  return (
    <div style={{
      maxHeight: 'calc(100vh - 300px)',
      overflowY: 'auto',
      paddingRight: '8px'
    }}>
      {loading ? (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid #e8e8f0'
        }}>
          <Spin size="large" tip="Загрузка маршрутов..." />
        </div>
      ) : routes.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid #e8e8f0'
        }}>
          <Empty
            description="Нет маршрутов согласования"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        groupedData.map((group) => (
          <div key={group.typeId} style={{ marginBottom: 24 }}>
            <div style={{
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf2 100%)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: 12,
              fontWeight: 600,
              fontSize: 14,
              color: '#262626',
              border: '1px solid #d8dce6',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ApartmentOutlined style={{ color: '#667eea', fontSize: '16px' }} />
              {group.typeName}
              <Badge
                count={group.routes.length}
                style={{
                  background: '#667eea',
                  color: '#fff',
                  marginLeft: '4px'
                }}
              />
            </div>
            {group.routes.map((route) => (
              renderRouteItem(route)
            ))}
          </div>
        ))
      )}
    </div>
  )

  function renderRouteItem(route: ApprovalRoute) {
    const isSelected = selectedRoute?.id === route.id

    return (
      <div
        key={route.id}
        onClick={() => onSelectRoute(route)}
        style={{
          cursor: 'pointer',
          background: isSelected
            ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
            : '#fff',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '10px',
          border: isSelected ? '2px solid #667eea' : '1px solid #e8e8f0',
          boxShadow: isSelected
            ? '0 4px 12px rgba(102, 126, 234, 0.15)'
            : '0 2px 4px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingRoute === route.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onPressEnter={(e) => {
                  e.preventDefault()
                  handleSaveEdit(route, e as unknown as React.MouseEvent<HTMLInputElement>)
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                placeholder="Введите название маршрута"
                size="large"
                style={{ borderRadius: '8px', marginBottom: 8 }}
              />
            ) : (
              <div style={{ marginBottom: 8 }}>
                <Space size={8}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: isSelected ? '#667eea' : '#262626'
                  }}>
                    {route.name}
                  </span>
                  <Tag
                    color={route.is_active ? 'success' : 'default'}
                    style={{
                      borderRadius: '6px',
                      fontWeight: 500,
                      padding: '2px 10px'
                    }}
                  >
                    {route.is_active ? 'Активен' : 'Неактивен'}
                  </Tag>
                </Space>
              </div>
            )}
            <Space size={4}>
              <Badge
                count={route.stages?.length || 0}
                showZero
                style={{
                  background: isSelected ? '#667eea' : '#8c8c8c',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>
                этапов согласования
              </Text>
            </Space>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 16 }}>
            {editingRoute === route.id ? (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={(e) => handleSaveEdit(route, e)}
                  style={{
                    color: '#52c41a',
                    fontWeight: 600
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                  style={{
                    color: '#ff4d4f',
                    fontWeight: 600
                  }}
                />
              </>
            ) : (
              <>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    size="small"
                    checked={route.is_active}
                    onChange={() => handleToggleActive(route)}
                    style={{
                      background: route.is_active ? '#52c41a' : undefined
                    }}
                  />
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => handleStartEdit(route, e)}
                  style={{
                    color: '#667eea',
                    fontWeight: 500
                  }}
                />
                <Popconfirm
                  title="Удалить маршрут?"
                  description="Это действие нельзя отменить"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    onDeleteRoute(route.id)
                  }}
                  okText="Удалить"
                  cancelText="Отмена"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: '#ff4d4f',
                      fontWeight: 500
                    }}
                  />
                </Popconfirm>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
}