import React from 'react'
import { Row, Col, Form, Input, DatePicker, Select } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { InvoiceType } from '../../../lib/supabase'

interface InvoiceBasicFieldsProps {
  invoiceTypes: InvoiceType[]
  onInvoiceDateChange: (date: Dayjs) => void
}

export const InvoiceBasicFields: React.FC<InvoiceBasicFieldsProps> = ({
  invoiceTypes,
  onInvoiceDateChange
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="invoice_number"
            label="Номер счёта"
          >
            <Input placeholder="б/н (если номер отсутствует)" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="invoice_date"
            label="Дата счёта"
            rules={[{ required: true, message: 'Укажите дату счёта' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              onChange={(date) => onInvoiceDateChange(date || dayjs())}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="invoice_type_id"
            label="Тип счёта"
            rules={[{ required: true, message: 'Выберите тип счёта' }]}
          >
            <Select
              placeholder="Выберите тип счёта"
              showSearch
              optionFilterProp="label"
              options={invoiceTypes.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}