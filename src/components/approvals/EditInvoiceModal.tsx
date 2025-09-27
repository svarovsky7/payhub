import { useState } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, Row, Col, Radio, Typography } from 'antd'
import { formatAmount } from '../../utils/invoiceHelpers'
import dayjs from 'dayjs'
import type { PaymentApproval } from '../../services/approvalOperations'

const { Text } = Typography

interface EditInvoiceModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: () => void
  processing: boolean
  loadingReferenceData: boolean
  form: any
  contractors: any[]
  projects: any[]
  invoiceTypes: any[]
  vatRate: number
  setVatRate: (rate: number) => void
  amountWithVat: number
  setAmountWithVat: (amount: number) => void
  deliveryDaysType: 'working' | 'calendar'
  setDeliveryDaysType: (type: 'working' | 'calendar') => void
  calculateVatAmounts: (amountWithVat: number, vatRate: number) => { vatAmount: number; amountWithoutVat: number }
}

export const EditInvoiceModal = ({
  visible,
  onCancel,
  onSubmit,
  processing,
  loadingReferenceData,
  form,
  contractors,
  projects,
  invoiceTypes,
  vatRate,
  setVatRate,
  amountWithVat,
  setAmountWithVat,
  deliveryDaysType,
  setDeliveryDaysType,
  calculateVatAmounts
}: EditInvoiceModalProps) => {
  return (
    <Modal
      title="Редактирование счёта"
      open={visible}
      onOk={onSubmit}
      onCancel={onCancel}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={processing || loadingReferenceData}
      width={900}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="invoice_number"
              label="Номер счёта"
              rules={[{ required: true, message: 'Введите номер счёта' }]}
            >
              <Input placeholder="Введите номер" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="invoice_date"
              label="Дата счёта"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                placeholder="Выберите дату"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="invoice_type_id"
              label="Тип счёта"
              rules={[{ required: true, message: 'Выберите тип' }]}
            >
              <Select
                placeholder="Выберите тип"
                loading={loadingReferenceData}
                options={invoiceTypes.map(type => ({
                  value: type.id,
                  label: type.name
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="payer_id"
              label="Плательщик"
              rules={[{ required: true, message: 'Выберите плательщика' }]}
            >
              <Select
                placeholder="Выберите плательщика"
                showSearch
                optionFilterProp="children"
                loading={loadingReferenceData}
                options={contractors.map(c => ({
                  value: c.id,
                  label: `${c.name}${c.inn ? ` (ИНН: ${c.inn})` : ''}`
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplier_id"
              label="Поставщик"
              rules={[{ required: true, message: 'Выберите поставщика' }]}
            >
              <Select
                placeholder="Выберите поставщика"
                showSearch
                optionFilterProp="children"
                loading={loadingReferenceData}
                options={contractors.map(c => ({
                  value: c.id,
                  label: `${c.name}${c.inn ? ` (ИНН: ${c.inn})` : ''}`
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="project_id"
              label="Проект"
              rules={[{ required: true, message: 'Выберите проект' }]}
            >
              <Select
                placeholder="Выберите проект"
                showSearch
                optionFilterProp="children"
                loading={loadingReferenceData}
                options={projects.map(p => ({
                  value: p.id,
                  label: p.name
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="due_date"
              label="Срок оплаты"
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                placeholder="Выберите дату"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="amount_with_vat"
              label="Сумма с НДС"
              rules={[
                { required: true, message: 'Введите сумму' },
                { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={value => value!.replace(/₽\s?|\s/g, '')}
                precision={2}
                onChange={(value) => {
                  if (value) {
                    setAmountWithVat(value)
                    const { vatAmount, amountWithoutVat } = calculateVatAmounts(value, vatRate)
                    // Show calculated values in UI
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="vat_rate"
              label="Ставка НДС, %"
            >
              <Select
                onChange={(value) => {
                  setVatRate(value)
                  const { vatAmount, amountWithoutVat } = calculateVatAmounts(amountWithVat, value)
                  // Show calculated values in UI
                }}
              >
                <Select.Option value={0}>Без НДС</Select.Option>
                <Select.Option value={10}>10%</Select.Option>
                <Select.Option value={20}>20%</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <div style={{ marginTop: 30 }}>
              <Text type="secondary">НДС: </Text>
              <Text strong>
                {formatAmount(calculateVatAmounts(amountWithVat, vatRate).vatAmount)} ₽
              </Text>
              <br />
              <Text type="secondary">Без НДС: </Text>
              <Text strong>
                {formatAmount(calculateVatAmounts(amountWithVat, vatRate).amountWithoutVat)} ₽
              </Text>
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="delivery_days"
              label="Срок поставки (дней)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="Количество дней"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="delivery_days_type"
              label="Тип дней"
            >
              <Radio.Group>
                <Radio value="working">Рабочие</Radio>
                <Radio value="calendar">Календарные</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="preliminary_delivery_date"
              label="Дата поставки"
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                placeholder="Выберите дату"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Описание"
            >
              <Input.TextArea
                rows={3}
                placeholder="Введите описание счёта"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}