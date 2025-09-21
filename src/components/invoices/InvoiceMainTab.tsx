import { Form, Input, InputNumber, Select, DatePicker, Radio, Row, Col, Divider } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'

interface InvoiceMainTabProps {
  form: any
  isEditing: boolean
  handleFormChange: () => void
  invoiceStatuses: InvoiceStatus[]
  invoiceTypes: InvoiceType[]
  payers: Contractor[]
  suppliers: Contractor[]
  projects: Project[]
  amountWithVat: number
  setAmountWithVat: (value: number) => void
  vatRate: number
  setVatRate: (value: number) => void
  vatAmount: number
  amountWithoutVat: number
  deliveryDays: number | undefined
  setDeliveryDays: (value: number | undefined) => void
  deliveryDaysType: 'working' | 'calendar'
  setDeliveryDaysType: (value: 'working' | 'calendar') => void
  setInvoiceDate: (date: Dayjs) => void
  preliminaryDeliveryDate: Dayjs | null
}

export const InvoiceMainTab: React.FC<InvoiceMainTabProps> = ({
  form,
  isEditing,
  handleFormChange,
  invoiceStatuses,
  invoiceTypes,
  payers,
  suppliers,
  projects,
  amountWithVat,
  setAmountWithVat,
  vatRate,
  setVatRate,
  vatAmount,
  amountWithoutVat,
  deliveryDays,
  setDeliveryDays,
  deliveryDaysType,
  setDeliveryDaysType,
  setInvoiceDate,
  preliminaryDeliveryDate
}) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleFormChange}
      disabled={!isEditing}
    >
      <Row gutter={24}>
        <Col span={6}>
          <Form.Item
            name="invoice_number"
            label="Номер счета"
          >
            <Input placeholder="б/н" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="invoice_date"
            label="Дата счета"
            rules={[{ required: true, message: 'Выберите дату счета' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              onChange={(date) => setInvoiceDate(date || dayjs())}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="status_id"
            label="Статус"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select
              placeholder="Выберите статус"
              options={invoiceStatuses.map(s => ({
                value: s.id,
                label: s.name
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="invoice_type_id"
            label="Тип счета"
            rules={[{ required: true, message: 'Выберите тип счета' }]}
          >
            <Select
              placeholder="Выберите тип"
              options={invoiceTypes.map(t => ({
                value: t.id,
                label: t.name
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Контрагенты</Divider>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="payer_id"
            label="Плательщик"
            rules={[{ required: true, message: 'Выберите плательщика' }]}
          >
            <Select
              placeholder="Выберите плательщика"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={payers.map(p => ({
                value: p.id,
                label: p.name
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="supplier_id"
            label="Поставщик материалов"
            rules={[{ required: true, message: 'Выберите поставщика' }]}
          >
            <Select
              placeholder="Выберите поставщика"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={suppliers.map(s => ({
                value: s.id,
                label: s.name
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="project_id"
            label="Проект"
            rules={[{ required: true, message: 'Выберите проект' }]}
          >
            <Select
              placeholder="Выберите проект"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={projects.map(p => ({
                value: p.id,
                label: p.name
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Суммы и НДС</Divider>

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item label="Сумма счета с НДС" required>
            <InputNumber
              style={{ width: '100%' }}
              value={amountWithVat}
              onChange={(value) => setAmountWithVat(value || 0)}
              disabled={!isEditing}
              min={0}
              max={999999999.99}
              precision={2}
              decimalSeparator=","
              formatter={(value) => {
                if (!value) return ''
                return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',')
              }}
              parser={(value) => {
                if (!value) return 0
                return parseFloat(value.replace(/\s/g, '').replace(',', '.')) || 0
              }}
              addonAfter="₽"
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="vat_rate"
            label="НДС"
            rules={[{ required: true, message: 'Выберите НДС' }]}
          >
            <Select onChange={setVatRate} disabled={!isEditing}>
              <Select.Option value={0}>0%</Select.Option>
              <Select.Option value={3}>3%</Select.Option>
              <Select.Option value={5}>5%</Select.Option>
              <Select.Option value={7}>7%</Select.Option>
              <Select.Option value={20}>20%</Select.Option>
              <Select.Option value={22}>22%</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Сумма НДС">
            <Input
              value={formatAmount(vatAmount)}
              disabled
              suffix="₽"
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Сумма без НДС">
            <Input
              value={formatAmount(amountWithoutVat)}
              disabled
              suffix="₽"
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Сроки поставки</Divider>

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item
            name="delivery_days"
            label="Срок поставки (дней)"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              onChange={(value) => setDeliveryDays(value || undefined)}
              disabled={!isEditing}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="delivery_days_type"
            label="Тип дней"
          >
            <Radio.Group
              onChange={(e) => setDeliveryDaysType(e.target.value)}
              disabled={!isEditing}
            >
              <Radio value="working">Рабочие</Radio>
              <Radio value="calendar">Календарные</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Предварительная дата поставки">
            <Input
              value={preliminaryDeliveryDate
                ? `${preliminaryDeliveryDate.format('DD.MM.YYYY')} (${preliminaryDeliveryDate.format('dddd')})`
                : 'Укажите срок поставки'}
              disabled
              style={{
                backgroundColor: '#f5f5f5',
                fontWeight: preliminaryDeliveryDate ? 'bold' : 'normal'
              }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={24}>
          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              disabled={!isEditing}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}