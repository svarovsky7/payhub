import React from 'react'
import type { FormValues } from '../../../types/common'
import { Modal, Form, Input, Select, Switch, Button, Space, Row, Col } from 'antd'
import type { Employee, Department, Position } from '../../../services/employeeOperations'

interface EmployeeFormModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: FormValues) => Promise<void>
  editingEmployee: Employee | null
  departments: Department[]
  positions: Position[]
  form: any
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingEmployee,
  departments,
  positions,
  form
}) => {
  return (
    <Modal
      title={editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="last_name"
              label="Фамилия"
              rules={[{ required: true, message: 'Укажите фамилию' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="first_name"
              label="Имя"
              rules={[{ required: true, message: 'Укажите имя' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="middle_name"
              label="Отчество"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="department_id"
              label="Отдел"
            >
              <Select
                placeholder="Выберите отдел"
                allowClear
              >
                {departments.map(dept => (
                  <Select.Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="position_id"
              label="Должность"
            >
              <Select
                placeholder="Выберите должность"
                allowClear
              >
                {positions.map(pos => (
                  <Select.Option key={pos.id} value={pos.id}>
                    {pos.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Некорректный email' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Телефон"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="is_active"
          label="Статус"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch
            checkedChildren="Активен"
            unCheckedChildren="Уволен"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {editingEmployee ? 'Сохранить' : 'Добавить'}
            </Button>
            <Button onClick={onCancel}>
              Отмена
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}