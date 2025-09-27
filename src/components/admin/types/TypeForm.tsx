import React from 'react'
import { Form, Input, Select, Button, Space } from 'antd'
import type { FormInstance } from 'antd'

interface TypeFormProps {
  form: FormInstance
  onSubmit: (values: any) => void
  onCancel: () => void
  isEditing: boolean
  typeCategory: 'invoice' | 'payment'
}

export const TypeForm: React.FC<TypeFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isEditing,
  typeCategory
}) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
    >
      <Form.Item
        name="id"
        label="ID"
        rules={[
          { required: true, message: 'Введите ID' },
          {
            pattern: /^[1-9]\d*$/,
            message: 'ID должен быть положительным числом'
          }
        ]}
      >
        <Input
          type="number"
          min={1}
          placeholder="Введите уникальный ID"
        />
      </Form.Item>

      <Form.Item
        name="name"
        label="Название"
        rules={[{ required: true, message: 'Введите название' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="code"
        label="Код"
        rules={[
          { required: true, message: 'Введите код' },
          { max: 50, message: 'Код не должен превышать 50 символов' }
        ]}
      >
        <Input />
      </Form.Item>

      {typeCategory === 'invoice' && (
        <Form.Item
          name="is_active"
          label="Статус"
          valuePropName="value"
          initialValue={true}
        >
          <Select>
            <Select.Option value={true}>Активен</Select.Option>
            <Select.Option value={false}>Неактивен</Select.Option>
          </Select>
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0 }}>
        <Space>
          <Button type="primary" htmlType="submit">
            {isEditing ? 'Обновить' : 'Создать'}
          </Button>
          <Button onClick={onCancel}>
            Отмена
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}