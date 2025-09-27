import React from 'react'
import { Row, Col, Form, InputNumber, Radio, DatePicker, Typography } from 'antd'
import type { Dayjs } from 'dayjs'

const { Text } = Typography

interface InvoiceDeliveryFieldsProps {
  deliveryDays: number | undefined
  deliveryDaysType: 'working' | 'calendar'
  preliminaryDeliveryDate: Dayjs | null
  onDeliveryDaysChange: (value: number | undefined) => void
  onDeliveryDaysTypeChange: (value: 'working' | 'calendar') => void
}

export const InvoiceDeliveryFields: React.FC<InvoiceDeliveryFieldsProps> = ({
  deliveryDays,
  deliveryDaysType,
  preliminaryDeliveryDate,
  onDeliveryDaysChange,
  onDeliveryDaysTypeChange
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="delivery_days"
            label="Срок поставки"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="Количество дней"
              onChange={onDeliveryDaysChange}
              addonAfter="дней"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="delivery_days_type"
            label="Тип дней"
            initialValue="working"
          >
            <Radio.Group onChange={(e) => onDeliveryDaysTypeChange(e.target.value)}>
              <Radio value="working">Рабочие</Radio>
              <Radio value="calendar">Календарные</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Предполагаемая дата поставки">
            {preliminaryDeliveryDate ? (
              <Text strong style={{ fontSize: '16px' }}>
                {preliminaryDeliveryDate.format('DD.MM.YYYY')}
              </Text>
            ) : (
              <Text type="secondary">Не указан срок поставки</Text>
            )}
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="payment_deadline_date"
            label="Конечная дата актуальности счета"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}