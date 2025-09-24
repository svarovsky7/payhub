import { Modal, Form, Input, Switch } from 'antd'
import type { Department } from '../../../services/employeeOperations'

interface DepartmentFormModalProps {
  visible: boolean
  editingDepartment: Department | null
  form: any
  onSubmit: (values: any) => void
  onCancel: () => void
}

export const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({
  visible,
  editingDepartment,
  form,
  onSubmit,
  onCancel
}) => {
  return (
    <Modal
      title={editingDepartment ? 'Редактировать отдел' : 'Добавить отдел'}
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
          label="Код отдела"
          rules={[
            { required: true, message: 'Введите код отдела' },
            { max: 50, message: 'Код не должен превышать 50 символов' }
          ]}
        >
          <Input placeholder="IT" />
        </Form.Item>

        <Form.Item
          name="name"
          label="Название отдела"
          rules={[
            { required: true, message: 'Введите название отдела' },
            { max: 255, message: 'Название не должно превышать 255 символов' }
          ]}
        >
          <Input placeholder="Отдел информационных технологий" />
        </Form.Item>

        <Form.Item
          name="is_active"
          label="Активный"
          valuePropName="checked"
        >
          <Switch checkedChildren="Да" unCheckedChildren="Нет" />
        </Form.Item>
      </Form>
    </Modal>
  )
}