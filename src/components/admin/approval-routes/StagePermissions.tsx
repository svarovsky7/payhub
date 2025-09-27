import { Checkbox, Space, Typography } from 'antd'
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

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Text strong style={{ fontSize: '12px' }}>Разрешения этапа:</Text>

      <Checkbox
        checked={permissions.can_edit_invoice || false}
        onChange={(e) => handlePermissionChange('can_edit_invoice', e.target.checked)}
        disabled={disabled}
      >
        <Space size="small">
          <EditOutlined style={{ color: '#1890ff' }} />
          <Text style={{ fontSize: '12px' }}>Редактировать счёт</Text>
        </Space>
      </Checkbox>

      <Checkbox
        checked={permissions.can_add_files || false}
        onChange={(e) => handlePermissionChange('can_add_files', e.target.checked)}
        disabled={disabled}
      >
        <Space size="small">
          <FileAddOutlined style={{ color: '#52c41a' }} />
          <Text style={{ fontSize: '12px' }}>Добавлять файлы</Text>
        </Space>
      </Checkbox>

      <Checkbox
        checked={permissions.can_edit_amount || false}
        onChange={(e) => handlePermissionChange('can_edit_amount', e.target.checked)}
        disabled={disabled}
      >
        <Space size="small">
          <DollarOutlined style={{ color: '#fa8c16' }} />
          <Text style={{ fontSize: '12px' }}>Изменить сумму платежа</Text>
        </Space>
      </Checkbox>
    </Space>
  )
}