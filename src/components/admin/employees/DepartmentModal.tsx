import React from 'react'
import type { FormValues } from '../../../types/common'
import { Modal, Form, Input, Button, Space } from 'antd'
import type { Department } from '../../../services/employeeOperations'

interface DepartmentModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: FormValues) => Promise<void>
  editingDepartment: Department | null
  form: any
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingDepartment,
  form
}) => {
  return (
    <Modal
      title={editingDepartment ? 'Редактировать отдел' : 'Добавить отдел'}
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: 'Укажите название отдела' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="description"
          label="Описание"
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {editingDepartment ? 'Сохранить' : 'Добавить'}
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