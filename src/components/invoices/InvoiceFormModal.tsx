import { Form, Modal, Input, InputNumber, Select, DatePicker, Radio, Row, Col, Space, Button, Upload, message } from 'antd'
import { useState, useEffect } from 'react'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'

// Принудительно активируем русскую локаль для dayjs
dayjs.locale('ru')

interface InvoiceFormModalProps {
  isVisible: boolean
  onClose: () => void
  onSubmit: (values: any, files: UploadFile[]) => void
  form: any
  payers: Contractor[]
  suppliers: Contractor[]
  projects: Project[]
  invoiceTypes: InvoiceType[]
  invoiceStatuses: InvoiceStatus[]
  amountWithVat: number
  onAmountWithVatChange: (value: number) => void
  vatRate: number
  onVatRateChange: (value: number) => void
  vatAmount: number
  amountWithoutVat: number
  deliveryDays: number | undefined
  onDeliveryDaysChange: (value: number | undefined) => void
  deliveryDaysType: 'working' | 'calendar'
  onDeliveryDaysTypeChange: (value: 'working' | 'calendar') => void
  invoiceDate: Dayjs
  onInvoiceDateChange: (date: Dayjs) => void
  preliminaryDeliveryDate: Dayjs | null
  formatAmount: (value: number | string | undefined) => string
  parseAmount: (value: string | undefined) => number
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  form,
  payers,
  suppliers,
  projects,
  invoiceTypes,
  invoiceStatuses,
  amountWithVat,
  onAmountWithVatChange,
  vatRate: currentVatRate,
  onVatRateChange,
  vatAmount,
  amountWithoutVat,
  deliveryDays: currentDeliveryDays,
  onDeliveryDaysChange,
  deliveryDaysType: currentDeliveryDaysType,
  onDeliveryDaysTypeChange,
  invoiceDate: currentInvoiceDate,
  onInvoiceDateChange,
  preliminaryDeliveryDate,
  formatAmount,
  parseAmount,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    if (!isVisible) {
      setFileList([])
    }
  }, [isVisible])

  useEffect(() => {
    if (isVisible) {
      form.setFieldsValue({
        invoice_date: currentInvoiceDate,
        vat_rate: currentVatRate,
        delivery_days: currentDeliveryDays,
        delivery_days_type: currentDeliveryDaysType,
      })
    }
  }, [isVisible, currentInvoiceDate, currentVatRate, currentDeliveryDays, currentDeliveryDaysType, form])

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const isLt10Mb = file.size / 1024 / 1024 < 10
      if (!isLt10Mb) {
        message.error(`${file.name} не должен превышать 10 МБ`)
        return Upload.LIST_IGNORE
      }

      // Создаем объект UploadFile с правильной структурой
      const uploadFile: UploadFile = {
        uid: file.uid || `-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file as any,
        status: 'done',
      }

      setFileList((prev) => [...prev, uploadFile])
      return false
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid))
    },
  }

  const handleSubmit = (values: any) => {
    onSubmit(values, fileList)
  }

  return (
    <Modal
      title="Создать счёт"
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
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
              name="payer_id"
              label="Плательщик"
              rules={[{ required: true, message: 'Выберите плательщика' }]}
            >
              <Select
                placeholder="Выберите плательщика"
                showSearch
                optionFilterProp="label"
                options={payers.map((payer) => ({
                  value: payer.id,
                  label: payer.name,
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
                optionFilterProp="label"
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
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
                optionFilterProp="label"
                options={projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
              />
            </Form.Item>
          </Col>
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

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Сумма счёта с НДС" required>
              <InputNumber
                style={{ width: '100%' }}
                value={amountWithVat}
                onChange={(value) => onAmountWithVatChange(Number(value) || 0)}
                placeholder="0,00"
                min={0}
                precision={2}
                decimalSeparator="," 
                formatter={(value) => {
                  if (value === undefined || value === null || value === '') {
                    return '0,00'
                  }
                  const numeric = typeof value === 'number' ? value : Number(value.toString().replace(/\s/g, '').replace(',', '.'))
                  if (Number.isNaN(numeric)) {
                    return '0,00'
                  }
                  return numeric
                    .toFixed(2)
                    .replace('.', ',')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                }}
                parser={(value) => parseAmount(value || '0')}
                addonAfter="₽"
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="vat_rate"
              label="НДС"
              rules={[{ required: true, message: 'Выберите ставку НДС' }]}
            >
              <Select onChange={onVatRateChange}>
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

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="delivery_days"
              label="Срок поставки (дней)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => onDeliveryDaysChange(value === null ? undefined : Number(value))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="delivery_days_type"
              label="Тип дней"
            >
              <Radio.Group onChange={(event) => onDeliveryDaysTypeChange(event.target.value)}>
                <Radio value="working">Рабочие</Radio>
                <Radio value="calendar">Календарные</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Расчётная дата поставки">
              <Input
                value={preliminaryDeliveryDate
                  ? `${preliminaryDeliveryDate.format('DD.MM.YYYY')} (${preliminaryDeliveryDate.format('dddd')})`
                  : 'Дата поставки ещё не рассчитана'}
                disabled
                style={{
                  backgroundColor: '#f5f5f5',
                  fontWeight: preliminaryDeliveryDate ? 'bold' : 'normal',
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Описание"
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item
          name="status_id"
          label="Статус"
          rules={[{ required: true, message: 'Выберите статус счёта' }]}
        >
          <Select
            placeholder="Выберите статус"
            options={invoiceStatuses.map((status) => ({
              value: status.id,
              label: status.name,
            }))}
          />
        </Form.Item>

        <Form.Item label="Прикреплённые файлы">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
          </Upload>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Создать
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}