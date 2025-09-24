import { Modal, Form, Input, Select, Checkbox, Space, Typography } from 'antd'
import {
  FileTextOutlined,
  FileAddOutlined,
  DollarOutlined
} from '@ant-design/icons'

const { Title } = Typography

interface Role {
  id: number
  code: string
  name: string
}

interface StagePermissions {
  can_edit_invoice?: boolean
  can_add_files?: boolean
  can_edit_amount?: boolean
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
  permissions?: StagePermissions
}

interface StageModalProps {
  visible: boolean
  stage: WorkflowStage | null
  roles: Role[]
  paymentStatuses: any[]
  onSave: (stage: WorkflowStage) => void
  onCancel: () => void
}

export const StageModal: React.FC<StageModalProps> = ({
  visible,
  stage,
  roles,
  paymentStatuses,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm()

  const handleOk = () => {
    form.validateFields().then(values => {
      const updatedStage: WorkflowStage = {
        ...stage,
        ...values,
        order_index: stage?.order_index || 0,
        permissions: {
          can_edit_invoice: values.can_edit_invoice || false,
          can_add_files: values.can_add_files || false,
          can_edit_amount: values.can_edit_amount || false
        }
      }
      onSave(updatedStage)
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  // Обновляем форму при изменении stage
  React.useEffect(() => {
    if (stage) {
      form.setFieldsValue({
        name: stage.name,
        role_id: stage.role_id,
        payment_status_id: stage.payment_status_id,
        can_edit_invoice: stage.permissions?.can_edit_invoice || false,
        can_add_files: stage.permissions?.can_add_files || false,
        can_edit_amount: stage.permissions?.can_edit_amount || false
      })
    } else {
      form.resetFields()
    }
  }, [stage, form])

  return (
    <Modal
      title={stage ? `Редактировать этап ${(stage.order_index || 0) + 1}` : 'Новый этап'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label="Название этапа"
          rules={[{ required: true, message: 'Укажите название этапа' }]}
        >
          <Input placeholder="Например: Первичное согласование" />
        </Form.Item>

        <Form.Item
          name="role_id"
          label="Роль для согласования"
          rules={[{ required: true, message: 'Выберите роль' }]}
        >
          <Select
            placeholder="Выберите роль"
            showSearch
            optionFilterProp="children"
          >
            {roles.map(role => (
              <Select.Option key={role.id} value={role.id}>
                {role.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="payment_status_id"
          label="Статус платежа после согласования"
          extra="Оставьте пустым, если статус не должен меняться"
        >
          <Select
            placeholder="Выберите статус (опционально)"
            showSearch
            optionFilterProp="children"
            allowClear
          >
            {paymentStatuses.map(status => (
              <Select.Option key={status.id} value={status.id}>
                {status.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Title level={5}>Разрешения на этапе</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="can_edit_invoice"
            valuePropName="checked"
            style={{ marginBottom: 8 }}
          >
            <Checkbox>
              <Space>
                <FileTextOutlined />
                Редактирование счёта
              </Space>
            </Checkbox>
          </Form.Item>

          <Form.Item
            name="can_add_files"
            valuePropName="checked"
            style={{ marginBottom: 8 }}
          >
            <Checkbox>
              <Space>
                <FileAddOutlined />
                Добавление файлов
              </Space>
            </Checkbox>
          </Form.Item>

          <Form.Item
            name="can_edit_amount"
            valuePropName="checked"
            style={{ marginBottom: 8 }}
          >
            <Checkbox>
              <Space>
                <DollarOutlined />
                Изменение суммы платежа
              </Space>
            </Checkbox>
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}