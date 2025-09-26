import React from 'react'
import { Form, Select } from 'antd'
import type { InvoiceStatus } from '../../../lib/supabase'

interface InvoiceStatusFieldProps {
  invoiceStatuses: InvoiceStatus[]
}

export const InvoiceStatusField: React.FC<InvoiceStatusFieldProps> = ({
  invoiceStatuses
}) => {
  return (
    <Form.Item
      name="status_id"
      label="Статус счета"
    >
      <Select
        placeholder="Выберите статус"
        options={invoiceStatuses.map((status) => ({
          value: status.id,
          label: status.name,
        }))}
      />
    </Form.Item>
  )
}