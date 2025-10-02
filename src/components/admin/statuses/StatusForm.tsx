import React from 'react'
import { Form, Input, Select, InputNumber, Button, Space, Tag } from 'antd'
import type { FormInstance } from 'antd'
import type { Status } from '../../../types/statuses'

interface StatusFormProps {
  form: FormInstance
  onSubmit: (values: Partial<Status> & Record<string, unknown>) => void
  onCancel: () => void
  isEditing: boolean
}

const colorOptions = [
  { value: 'default', label: 'По умолчанию', color: 'default' },
  { value: 'success', label: 'Зелёный', color: 'success' },
  { value: 'processing', label: 'Синий', color: 'processing' },
  { value: 'warning', label: 'Оранжевый', color: 'warning' },
  { value: 'error', label: 'Красный', color: 'error' },
  { value: 'cyan', label: 'Голубой', color: 'cyan' },
  { value: 'purple', label: 'Фиолетовый', color: 'purple' },
  { value: 'magenta', label: 'Малиновый', color: 'magenta' },
  { value: 'gold', label: 'Золотой', color: 'gold' },
  { value: 'lime', label: 'Лайм', color: 'lime' }
]

export const StatusForm: React.FC<StatusFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isEditing
}) => {
  const isCodeDisabled = false // Разрешаем редактирование кода для всех статусов

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
    >
      <Form.Item
        name="code"
        label="Код"
        rules={[
          { required: true, message: 'Укажите код статуса' },
          { pattern: /^[a-z_]+$/, message: 'Код должен содержать только латинские буквы и подчеркивание' }
        ]}
      >
        <Input
          placeholder="например: pending"
          disabled={isCodeDisabled}
        />
      </Form.Item>

      <Form.Item
        name="name"
        label="Название"
        rules={[{ required: true, message: 'Укажите название статуса' }]}
      >
        <Input placeholder="Название статуса" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Описание"
      >
        <Input.TextArea rows={3} placeholder="Описание статуса" />
      </Form.Item>

      <Form.Item
        name="color"
        label="Цвет"
      >
        <Select placeholder="Выберите цвет для статуса">
          {colorOptions.map(option => (
            <Select.Option key={option.value} value={option.value}>
              <Space>
                <Tag color={option.color}>{option.label}</Tag>
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="sort_order"
        label="Порядок сортировки"
        tooltip="Статусы с меньшим числом показываются первыми"
      >
        <InputNumber
          min={0}
          max={1000}
          style={{ width: '100%' }}
          placeholder="100"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit">
            {isEditing ? 'Обновить' : 'Создать'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}