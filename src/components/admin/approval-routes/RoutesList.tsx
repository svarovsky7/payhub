import {
  List,
  Button,
  Popconfirm,
  Switch,
  Space,
  Tag,
  Typography,
  Empty
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import type { ApprovalRoute } from './types'

const { Text } = Typography

interface RoutesListProps {
  routes: ApprovalRoute[]
  loading: boolean
  selectedRoute: ApprovalRoute | null
  onSelectRoute: (route: ApprovalRoute) => void
  onUpdateRoute: (id: number, values: any) => void
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
  editingRoute
}: RoutesListProps) => {
  const handleToggleActive = async (route: ApprovalRoute) => {
    await onUpdateRoute(route.id, { is_active: !route.is_active })
  }

  return (
    <List
      loading={loading}
      dataSource={routes}
      locale={{
        emptyText: (
          <Empty
            description="Нет маршрутов согласования"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )
      }}
      renderItem={(route) => (
        <List.Item
          key={route.id}
          style={{
            cursor: 'pointer',
            backgroundColor: selectedRoute?.id === route.id ? '#f0f0f0' : 'transparent',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '8px'
          }}
          actions={[
            <Switch
              key="active"
              size="small"
              checked={route.is_active}
              onChange={() => handleToggleActive(route)}
              loading={editingRoute === route.id}
            />,
            <Button
              key="edit"
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                // Логика редактирования будет в родительском компоненте
              }}
              style={{ color: '#1890ff' }}
            />,
            <Popconfirm
              key="delete"
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
                style={{ color: '#ff4d4f' }}
              />
            </Popconfirm>
          ]}
          onClick={() => onSelectRoute(route)}
        >
          <List.Item.Meta
            title={
              <Space>
                {route.name}
                <Tag color={route.is_active ? 'green' : 'default'}>
                  {route.is_active ? 'Активен' : 'Неактивен'}
                </Tag>
              </Space>
            }
            description={
              <div>
                <Text type="secondary">
                  Тип счета: {route.invoice_type?.name || 'Не указан'}
                </Text>
                <br />
                <Text type="secondary">
                  Этапов: {route.stages?.length || 0}
                </Text>
              </div>
            }
          />
        </List.Item>
      )}
    />
  )
}