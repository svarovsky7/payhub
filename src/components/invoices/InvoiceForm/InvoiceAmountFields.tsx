import React from 'react'
import { Row, Col, Form, InputNumber, Typography } from 'antd'

const { Text } = Typography

interface InvoiceAmountFieldsProps {
  vatRate: number
  amountWithoutVat: number
  onAmountChange: (value: number | null) => void
  onVatRateChange: (value: number | null) => void
}

export const InvoiceAmountFields: React.FC<InvoiceAmountFieldsProps> = ({
  vatRate,
  amountWithoutVat,
  onAmountChange,
  onVatRateChange
}) => {
  const vatAmount = amountWithoutVat * (vatRate / (100 + vatRate))
  const amountWithoutVatDisplay = amountWithoutVat - vatAmount

  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="amount_with_vat"
            label="Сумма с НДС"
            rules={[
              { required: true, message: 'Укажите сумму' },
              { type: 'number', min: 0, message: 'Сумма должна быть положительной' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
              }
              parser={(value) => value?.replace(/\s?/g, '') as any}
              addonAfter="₽"
              onChange={onAmountChange}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="vat_rate"
            label="Ставка НДС (%)"
            initialValue={20}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              addonAfter="%"
              onChange={onVatRateChange}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="НДС">
            <Text strong style={{ fontSize: '16px' }}>
              {vatAmount.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ₽
            </Text>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Сумма без НДС">
            <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
              {amountWithoutVatDisplay.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ₽
            </Text>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="delivery_cost"
            label="Стоимость доставки"
            initialValue={0}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
              }
              parser={(value) => value?.replace(/\s?/g, '') as any}
              addonAfter="₽"
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}