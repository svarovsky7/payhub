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
  Alert
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { StagePermissions } from './StagePermissions'
import type { ApprovalRoute, Role, WorkflowStage } from './types'

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
      <Card>
        <Empty
          description="Выберите маршрут для редактирования этапов"
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
      title={`Этапы маршрута: ${selectedRoute.name}`}
      extra={
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={onAddStage}
          >
            Добавить этап
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingStages}
            onClick={onSaveStages}
            disabled={editingStages.length === 0}
          >
            Сохранить изменения
          </Button>
        </Space>
      }
    >
      {editingStages.length === 0 ? (
        <Empty
          description="Нет этапов в маршруте"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="Этапы выполняются последовательно в указанном порядке"
            type="info"
            showIcon
          />

          {editingStages.map((stage, index) => (
            <Card
              key={index}
              size="small"
              title={`Этап ${index + 1}`}
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
                  />
                </Popconfirm>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#1890ff',
                      color: 'white',
                      borderRadius: '50%',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </div>
                    <Text strong>Порядок выполнения</Text>
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>Название этапа</Text>
                  </div>
                  <Input
                    value={stage.name}
                    onChange={(e) => onStageChange(index, 'name', e.target.value)}
                    placeholder="Название этапа"
                  />
                </Col>

                <Col span={8}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>Роль согласования</Text>
                  </div>
                  <Select
                    value={stage.role_id || undefined}
                    onChange={(value) => onStageChange(index, 'role_id', value)}
                    placeholder="Выберите роль"
                    style={{ width: '100%' }}
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
                    <Text strong>Статус после согласования</Text>
                  </div>
                  <Select
                    value={stage.payment_status_id || undefined}
                    onChange={(value) => onStageChange(index, 'payment_status_id', value)}
                    placeholder="Статус платежа (опционально)"
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

                <Col span={24}>
                  <StagePermissions
                    permissions={stage.permissions || {}}
                    onChange={(permissions) => handlePermissionsChange(index, permissions)}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  )
}