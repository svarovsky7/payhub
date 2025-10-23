import React, { useCallback } from 'react'
import { Row, Col, Form, InputNumber, Typography, Divider, Select } from 'antd'

const { Text } = Typography

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

  // Получаем значения из формы
  const amountWithVat = Form.useWatch('amount_with_vat', form) || 0
  const deliveryCost = Form.useWatch('delivery_cost', form) || 0

  // Рассчитываем НДС
  const vatAmount = amountWithVat - amountWithoutVat

  const handleAmountWithVatChange = useCallback((value: number | null) => {
    if (value !== null) {
      // Когда пользователь устанавливает Сумму с НДС
      form.setFieldValue('delivery_cost', 0)
      form.setFieldValue('total_with_vat', value)
      onAmountChange(value)
    }
  }, [form, onAmountChange])

  const handleDeliveryCostChange = useCallback((value: number | null) => {
    if (value !== null) {
      // Когда пользователь устанавливает Стоимость доставки
      // Пересчитываем Общую сумму с НДС
      const newTotal = amountWithVat + value
      form.setFieldValue('total_with_vat', newTotal)
    }
  }, [form, amountWithVat])

  const handleTotalWithVatChange = useCallback((value: number | null) => {
    if (value !== null) {
      // Когда пользователь устанавливает Общую сумму с НДС
      if (deliveryCost > 0) {
        // Если уже указана доставка, пересчитываем сумму с НДС
        const newAmountWithVat = value - deliveryCost
        form.setFieldValue('amount_with_vat', newAmountWithVat)
        onAmountChange(newAmountWithVat)
      } else {
        // Если доставки нет, то общая = сумме с НДС
        form.setFieldValue('amount_with_vat', value)
        form.setFieldValue('delivery_cost', 0)
        onAmountChange(value)
      }
    }
  }, [form, onAmountChange, deliveryCost])

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
                  onChange={handleAmountWithVatChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vat_rate"
                label="Ставка НДС (%)"
                initialValue={20}
                rules={[
                  { required: true, message: 'Укажите ставку НДС' }
                ]}
              >
                <Select
                  options={[
                    { label: '0%', value: 0 },
                    { label: '10%', value: 10 },
                    { label: '20%', value: 20 },
                    { label: '22%', value: 22 }
                  ]}
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
                  onChange={handleDeliveryCostChange}
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
                {amountWithoutVat.toLocaleString('ru-RU', {
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
                {amountWithVat.toLocaleString('ru-RU', {
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
                <Form.Item
                  name="total_with_vat"
                  initialValue={0}
                  style={{ margin: 0 }}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    decimalSeparator=","
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    }
                    parser={(value) => {
                      const parsed = value?.replace(/\s/g, '').replace(',', '.')
                      return parsed as any
                    }}
                    addonAfter="₽"
                    onChange={handleTotalWithVatChange}
                    bordered={false}
                    style={{
                      width: '100%',
                      textAlign: 'right',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#1890ff'
                    }}
                  />
                </Form.Item>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </>
  )
}