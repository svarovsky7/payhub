import React from 'react'
import { Row, Col, Form, InputNumber, Typography, Divider } from 'antd'

const { Text, Title } = Typography

interface InvoiceAmountFieldsProps {
  vatRate: number
  amountWithoutVat: number
  onAmountChange: (value: number | null) => void
  onVatRateChange: (value: number | null) => void
  form?: any
}

export const InvoiceAmountFields: React.FC<InvoiceAmountFieldsProps> = ({
  vatRate,
  amountWithoutVat,
  onAmountChange,
  onVatRateChange,
  form
}) => {
  console.log('[InvoiceAmountFields] Props:', { vatRate, amountWithoutVat })
  const vatAmount = amountWithoutVat * (vatRate / (100 + vatRate))
  const amountWithoutVatDisplay = amountWithoutVat - vatAmount
  const deliveryCost = Form.useWatch('delivery_cost', form) || 0
  const totalAmount = amountWithoutVat + deliveryCost

  return (
    <>
      <Row gutter={24}>
        <Col span={16}>
          <Row gutter={16}>
            <Col span={12}>
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
                  precision={2}
                  decimalSeparator=","
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                  }
                  parser={(value) => {
                    // Заменяем запятую на точку и убираем пробелы
                    const parsed = value?.replace(/\s/g, '').replace(',', '.')
                    return parsed as any
                  }}
                  addonAfter="₽"
                  onChange={onAmountChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vat_rate"
                label="Ставка НДС (%)"
                initialValue={20}
                rules={[
                  { required: true, message: 'Укажите ставку НДС' },
                  { type: 'number', min: 0, max: 100, message: 'Ставка НДС должна быть от 0 до 100%' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  precision={2}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                  onChange={onVatRateChange}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="delivery_cost"
                label="Стоимость доставки"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  decimalSeparator=","
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                  }
                  parser={(value) => {
                    // Заменяем запятую на точку и убираем пробелы
                    const parsed = value?.replace(/\s/g, '').replace(',', '.')
                    return parsed as any
                  }}
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
          </Row>
        </Col>

        <Col span={8}>
          <div style={{
            background: '#f8f8f8',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e8e8e8'
          }}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>Сумма без НДС:</Text>
              <Text strong style={{ fontSize: '14px' }}>
                {amountWithoutVatDisplay.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </Text>
            </div>

            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>НДС {vatRate}%:</Text>
              <Text strong style={{ fontSize: '14px' }}>
                {vatAmount.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </Text>
            </div>

            <div style={{ marginBottom: deliveryCost > 0 ? '8px' : '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>Сумма с НДС:</Text>
              <Text strong style={{ fontSize: '14px' }}>
                {amountWithoutVat.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </Text>
            </div>

            {deliveryCost > 0 && (
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>Доставка:</Text>
                <Text strong style={{ fontSize: '14px' }}>
                  {deliveryCost.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ₽
                </Text>
              </div>
            )}

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Text strong style={{ fontSize: '13px' }}>
                Общая сумма с НДС:
              </Text>
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{
                  fontSize: totalAmount > 999999999 ? '16px' : '18px',
                  color: '#1890ff',
                  whiteSpace: 'nowrap',
                  display: 'block'
                }}>
                  {totalAmount.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ₽
                </Text>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </>
  )
}