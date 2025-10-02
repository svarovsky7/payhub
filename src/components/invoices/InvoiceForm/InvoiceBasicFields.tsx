import React from 'react'
import { Row, Col, Form, Input, DatePicker, Select, Space, Tag } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { InvoiceType } from '../../../lib/supabase'

interface InvoiceBasicFieldsProps {
  invoiceTypes: InvoiceType[]
  onInvoiceDateChange: (date: Dayjs) => void
  form?: any
}

export const InvoiceBasicFields: React.FC<InvoiceBasicFieldsProps> = ({
  invoiceTypes,
  onInvoiceDateChange,
  form
}) => {
  const invoiceDate = Form.useWatch('invoice_date', form)

  const handleAddDays = (days: number) => {
    if (form && invoiceDate) {
      const newDate = dayjs(invoiceDate).add(days, 'day')
      form.setFieldsValue({ payment_deadline_date: newDate })
    }
  }
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="invoice_number"
            label="Номер счёта"
          >
            <Input placeholder="б/н (если номер отсутствует)" autoComplete="off" />
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
        <Col span={12}>
          <Form.Item
            name="payment_deadline_date"
            label="Конечная дата актуальности счёта"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
            />
          </Form.Item>
          <div style={{ marginTop: '-20px', marginBottom: '20px' }}>
            <Space size="small">
              <Tag
                color="blue"
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => handleAddDays(7)}
              >
                +7 дней
              </Tag>
              <Tag
                color="blue"
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => handleAddDays(30)}
              >
                +30 дней
              </Tag>
            </Space>
          </div>
        </Col>
      </Row>
    </>
  )
}