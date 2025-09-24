import { Modal, Form, Input, Switch } from 'antd'
import type { Position } from '../../../services/employeeOperations'

interface PositionFormModalProps {
  visible: boolean
  editingPosition: Position | null
  form: any
  onSubmit: (values: any) => void
  onCancel: () => void
}

export const PositionFormModal: React.FC<PositionFormModalProps> = ({
  visible,
  editingPosition,
  form,
  onSubmit,
  onCancel
}) => {
  return (
    <Modal
      title={editingPosition ? 'Редактировать должность' : 'Добавить должность'}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ is_active: true }}
      >
        <Form.Item
          name="code"
          label="Код должности"
          rules={[
            { required: true, message: 'Введите код должности' },
            { max: 50, message: 'Код не должен превышать 50 символов' }
          ]}
        >
          <Input placeholder="DEV" />
        </Form.Item>

        <Form.Item
          name="name"
          label="Название должности"
          rules={[
            { required: true, message: 'Введите название должности' },
            { max: 255, message: 'Название не должно превышать 255 символов' }
          ]}
        >
          <Input placeholder="Разработчик" />
        </Form.Item>

        <Form.Item
          name="is_active"
          label="Активная"
          valuePropName="checked"
        >
          <Switch checkedChildren="Да" unCheckedChildren="Нет" />
        </Form.Item>
      </Form>
    </Modal>
  )
}