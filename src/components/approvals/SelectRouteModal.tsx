import { Modal, List, Typography, Empty, Spin } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

interface ApprovalRoute {
  id: number
  name: string
  description?: string
  invoice_type_id: number
  is_active: boolean
}

interface SelectRouteModalProps {
  open: boolean
  onClose: () => void
  onSelect: (routeId: number) => void
  routes: ApprovalRoute[]
  loading?: boolean
}

export const SelectRouteModal: React.FC<SelectRouteModalProps> = ({
  open,
  onClose,
  onSelect,
  routes,
  loading = false
}) => {
  const handleRouteClick = (routeId: number) => {
    onSelect(routeId)
    onClose()
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#1890ff' }} />
          <span>Выбор маршрута согласования</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Выберите маршрут согласования для отправки платежа
        </Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin>
            <div style={{ padding: 20 }}>Загрузка маршрутов...</div>
          </Spin>
        </div>
      ) : routes.length === 0 ? (
        <Empty
          description="Для данного типа счёта нет активных маршрутов согласования"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={routes}
          renderItem={(route) => (
            <List.Item
              key={route.id}
              onClick={() => handleRouteClick(route.id)}
              style={{
                cursor: 'pointer',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #d9d9d9',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f7ff'
                e.currentTarget.style.borderColor = '#1890ff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = '#d9d9d9'
              }}
            >
              <List.Item.Meta
                title={
                  <span style={{ fontSize: 16, fontWeight: 500 }}>
                    {route.name}
                  </span>
                }
                description={
                  route.description && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {route.description}
                    </Text>
                  )
                }
              />
              <CheckCircleOutlined
                style={{ fontSize: 20, color: '#52c41a', opacity: 0.6 }}
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
