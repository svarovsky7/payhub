import { Checkbox, Space, Typography, Row, Col } from 'antd'
import {
  EditOutlined,
  FileAddOutlined,
  DollarOutlined
} from '@ant-design/icons'
import type { StagePermissions as StagePermissionsType } from './types'

const { Text } = Typography

interface StagePermissionsProps {
  permissions: StagePermissionsType
  onChange: (permissions: StagePermissionsType) => void
  disabled?: boolean
}

export const StagePermissions = ({
  permissions,
  onChange,
  disabled = false
}: StagePermissionsProps) => {
  const handlePermissionChange = (key: keyof StagePermissionsType, checked: boolean) => {
    onChange({
      ...permissions,
      [key]: checked
    })
  }

  const permissionItems = [
    {
      key: 'can_edit_invoice' as keyof StagePermissionsType,
      label: 'Редактировать счёт',
      icon: <EditOutlined />,
      color: '#667eea'
    },
    {
      key: 'can_add_files' as keyof StagePermissionsType,
      label: 'Добавлять файлы',
      icon: <FileAddOutlined />,
      color: '#52c41a'
    },
    {
      key: 'can_edit_amount' as keyof StagePermissionsType,
      label: 'Изменить сумму платежа',
      icon: <DollarOutlined />,
      color: '#fa8c16'
    }
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)',
      padding: '20px',
      borderRadius: '10px',
      border: '1px solid #d8dce6'
    }}>
      <Text strong style={{ fontSize: '14px', color: '#262626', display: 'block', marginBottom: '16px' }}>
        Разрешения этапа
      </Text>

      <Row gutter={[16, 12]}>
        {permissionItems.map((item) => (
          <Col span={8} key={item.key}>
            <div
              style={{
                background: '#fff',
                padding: '12px 16px',
                borderRadius: '8px',
                border: permissions[item.key] ? `2px solid ${item.color}` : '2px solid #e8e8f0',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => !disabled && handlePermissionChange(item.key, !permissions[item.key])}
            >
              <Checkbox
                checked={permissions[item.key] || false}
                onChange={(e) => handlePermissionChange(item.key, e.target.checked)}
                disabled={disabled}
                style={{ width: '100%' }}
              >
                <Space size={8} align="center">
                  <span style={{ color: item.color, fontSize: '16px', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <Text style={{ fontSize: '13px', fontWeight: 500, color: '#262626' }}>
                    {item.label}
                  </Text>
                </Space>
              </Checkbox>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}