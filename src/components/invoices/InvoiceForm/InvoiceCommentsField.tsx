import React from 'react'
import { Form, Input } from 'antd'

const { TextArea } = Input

export const InvoiceCommentsField: React.FC = () => {
  return (
    <Form.Item
      name="comments"
      label="Комментарии"
    >
      <TextArea
        rows={3}
        placeholder="Дополнительные комментарии к счету"
        maxLength={500}
        showCount
      />
    </Form.Item>
  )
}