import { Modal, Form, Input, Select, Switch } from 'antd'
import type { Employee, Department, Position } from '../../../services/employeeOperations'

interface EmployeeFormModalProps {
  visible: boolean
  editingEmployee: Employee | null
  form: any
  departments: Department[]
  positions: Position[]
  onSubmit: (values: any) => void
  onCancel: () => void
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  visible,
  editingEmployee,
  form,
  departments,
  positions,
  onSubmit,
  onCancel
}) => {
  return (
    <Modal
      title={editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ is_active: true }}
      >
        <Form.Item
          name="last_name"
          label="Фамилия"
          rules={[{ required: true, message: 'Введите фамилию' }]}
        >
          <Input placeholder="Иванов" />
        </Form.Item>

        <Form.Item
          name="first_name"
          label="Имя"
          rules={[{ required: true, message: 'Введите имя' }]}
        >
          <Input placeholder="Иван" />
        </Form.Item>

        <Form.Item
          name="middle_name"
          label="Отчество"
        >
          <Input placeholder="Иванович" />
        </Form.Item>

        <Form.Item
          name="department_id"
          label="Отдел"
        >
          <Select
            placeholder="Выберите отдел"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {departments.map(dept => (
              <Select.Option key={dept.id} value={dept.id}>
                {dept.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="position_id"
          label="Должность"
        >
          <Select
            placeholder="Выберите должность"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {positions.map(pos => (
              <Select.Option key={pos.id} value={pos.id}>
                {pos.name}
              </Select.Option>
            ))}
          </Select>
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