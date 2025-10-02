import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Row,
  Col,
  Empty,
  Popconfirm,
  Typography,
  Alert,
  Collapse,
  Divider
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'

import { StagePermissions } from './StagePermissions'
import type { ApprovalRoute, Role, WorkflowStage } from './types'

const { Panel } = Collapse
const { Text } = Typography

interface StagesEditorProps {
  selectedRoute: ApprovalRoute | null
  editingStages: WorkflowStage[]
  roles: Role[]
  paymentStatuses: any[]
  savingStages: boolean
  onAddStage: () => void
  onRemoveStage: (index: number) => void
  onStageChange: (index: number, field: string, value: any) => void
  onSaveStages: () => void
}

export const StagesEditor = ({
  selectedRoute,
  editingStages,
  roles,
  paymentStatuses,
  savingStages,
  onAddStage,
  onRemoveStage,
  onStageChange,
  onSaveStages
}: StagesEditorProps) => {
  if (!selectedRoute) {
    return (
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e8e8f0',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Empty
          description={
            <span style={{ fontSize: '15px', color: '#8c8c8c', fontWeight: 500 }}>
              Выберите маршрут для редактирования этапов
            </span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  const handlePermissionsChange = (index: number, permissions: any) => {
    onStageChange(index, 'permissions', permissions)
  }

  return (
    <Card
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e8e8f0'
      }}
      styles={{
        header: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px 12px 0 0',
          padding: '16px 24px'
        },
        body: {
          padding: '24px'
        }
      }}
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#fff', fontSize: '18px' }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>
            Этапы маршрута: {selectedRoute.name}
          </span>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={onAddStage}
            size="large"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              height: '36px'
            }}
          >
            Добавить этап
          </Button>
          <Button
            icon={<SaveOutlined />}
            loading={savingStages}
            onClick={onSaveStages}
            disabled={editingStages.length === 0}
            size="large"
            style={{
              background: '#fff',
              color: '#667eea',
              border: 'none',
              fontWeight: 600,
              height: '36px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
          >
            Сохранить изменения
          </Button>
        </Space>
      }
    >
      {editingStages.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Empty
            description={
              <span style={{ fontSize: '15px', color: '#8c8c8c', fontWeight: 500 }}>
                Нет этапов в маршруте
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            message="Этапы выполняются последовательно в указанном порядке"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{
              borderRadius: '8px',
              border: '1px solid #91caff',
              background: '#e6f4ff'
            }}
          />

          <Collapse
            defaultActiveKey={['0']}
            accordion
            style={{
              background: 'transparent',
              border: 'none'
            }}
          >
            {editingStages.map((stage, index) => (
              <Panel
                key={index}
                style={{
                  marginBottom: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e8e8f0',
                  background: '#fff',
                  overflow: 'hidden'
                }}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '50%',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: '15px', color: '#262626' }}>
                        {stage.name || `Этап ${index + 1}`}
                      </Text>
                      {stage.role_id && (
                        <Text type="secondary" style={{ fontSize: 13, marginLeft: '8px' }}>
                          • {roles.find(r => r.id === stage.role_id)?.name}
                        </Text>
                      )}
                    </div>
                  </div>
                }
                extra={
                  <Popconfirm
                    title="Удалить этап?"
                    onConfirm={() => onRemoveStage(index)}
                    okText="Удалить"
                    cancelText="Отмена"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: '#ff4d4f',
                        fontWeight: 500
                      }}
                    />
                  </Popconfirm>
                }
              >
              <div style={{ padding: '20px' }}>
                <Row gutter={[16, 20]}>

                  <Col span={8}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '14px', color: '#262626' }}>Название этапа</Text>
                    </div>
                    <Input
                      value={stage.name}
                      onChange={(e) => onStageChange(index, 'name', e.target.value)}
                      placeholder="Название этапа"
                      size="large"
                      style={{ borderRadius: '8px' }}
                    />
                  </Col>

                  <Col span={8}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '14px', color: '#262626' }}>Роль согласования</Text>
                    </div>
                    <Select
                      value={stage.role_id || undefined}
                      onChange={(value) => onStageChange(index, 'role_id', value)}
                      placeholder="Выберите роль"
                      style={{ width: '100%' }}
                      size="large"
                    >
                      {roles.map(role => (
                        <Select.Option key={role.id} value={role.id}>
                          {role.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>

                  <Col span={8}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '14px', color: '#262626' }}>Статус после согласования</Text>
                    </div>
                    <Select
                      value={stage.payment_status_id || undefined}
                      onChange={(value) => onStageChange(index, 'payment_status_id', value)}
                      placeholder="Статус платежа (опционально)"
                      style={{ width: '100%' }}
                      size="large"
                      allowClear
                    >
                      {paymentStatuses.map(status => (
                        <Select.Option key={status.id} value={status.id}>
                          {status.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>

                  <Col span={24}>
                    <Divider style={{ margin: '12px 0 16px' }} />
                    <StagePermissions
                      permissions={stage.permissions || {}}
                      onChange={(permissions) => handlePermissionsChange(index, permissions)}
                    />
                  </Col>
                </Row>
              </div>
              </Panel>
            ))}
          </Collapse>
        </Space>
      )}
    </Card>
  )
}