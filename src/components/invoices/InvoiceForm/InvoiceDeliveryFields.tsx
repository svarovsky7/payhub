import React from 'react'
import { Row, Col, Form, InputNumber, Radio, Typography, Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

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
  // Расчет для подсказки
  const today = dayjs()
  let nextWorkingDay = today.add(1, 'day')
  while (nextWorkingDay.day() === 0 || nextWorkingDay.day() === 6) {
    nextWorkingDay = nextWorkingDay.add(1, 'day')
  }

  const tooltipContent = deliveryDays && deliveryDays > 0 ? (
    <div>
      <strong>Текущий расчет:</strong>
      <br />
      • Сегодня: {today.format('DD.MM.YYYY')} ({['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][today.day()]})
      <br />
      • Следующий рабочий день: {nextWorkingDay.format('DD.MM.YYYY')}
      <br />
      • Срок поставки: {deliveryDays} {deliveryDaysType === 'working' ? 'рабочих' : 'календарных'} {deliveryDays === 1 ? 'день' : deliveryDays < 5 ? 'дня' : 'дней'}
      <br />
      • Предполагаемая дата: {preliminaryDeliveryDate?.format('DD.MM.YYYY') || 'не рассчитана'}
      <br /><br />
      <strong>Формула:</strong>
      <br />
      Сегодня + 1 рабочий день + Срок поставки
    </div>
  ) : (
    <div>
      <strong>Формула расчета:</strong>
      <br />
      Сегодня + 1 рабочий день + Срок поставки
      <br /><br />
      <em>Укажите срок поставки для расчета даты</em>
    </div>
  )

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
              onChange={(value) => onDeliveryDaysChange(value ?? undefined)}
              addonAfter="дней"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="delivery_days_type"
            label="Тип дней"
            initialValue="calendar"
          >
            <Radio.Group onChange={(e) => onDeliveryDaysTypeChange(e.target.value)}>
              <Radio value="working">Рабочие</Radio>
              <Radio value="calendar">Календарные</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={
              <span>
                Предполагаемая дата поставки{' '}
                <Tooltip
                  title={tooltipContent}
                  placement="topLeft"
                  overlayStyle={{ maxWidth: '400px' }}
                >
                  <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                </Tooltip>
              </span>
            }
          >
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

    </>
  )
}