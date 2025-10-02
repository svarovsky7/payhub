import React from 'react'
import type { FormValues } from '../../../types/common'
import { Modal, Form, Input, Button, Space } from 'antd'
import type { Position } from '../../../services/employeeOperations'

interface PositionModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: FormValues) => Promise<void>
  editingPosition: Position | null
  form: any
}

export const PositionModal: React.FC<PositionModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingPosition,
  form
}) => {
  return (
    <Modal
      title={editingPosition ? 'Редактировать должность' : 'Добавить должность'}
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
          rules={[{ required: true, message: 'Укажите название должности' }]}
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
              {editingPosition ? 'Сохранить' : 'Добавить'}
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