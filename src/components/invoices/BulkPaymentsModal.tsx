import { Modal, Form, Button, DatePicker, Select, Input, Table, message, Spin, InputNumber } from 'antd'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import type { Invoice, PaymentType } from '../../lib/supabase'
import { formatAmount } from '../../utils/invoiceHelpers'

interface BulkPaymentsModalProps {
  visible: boolean
  onClose: () => void
  invoices: Invoice[]
  selectedInvoiceIds: string[]
  paymentTypes: PaymentType[]
  onSubmit: (invoiceIds: string[], values: any) => Promise<void>
}

export const BulkPaymentsModal: React.FC<BulkPaymentsModalProps> = ({
  visible,
  onClose,
  invoices,
  selectedInvoiceIds,
  paymentTypes,
  onSubmit
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([])
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (visible) {
      const filtered = invoices.filter(inv => selectedInvoiceIds.includes(inv.id))
      setSelectedInvoices(filtered)

      // Initialize payment amounts with remaining balance
      const amounts: Record<string, number> = {}
      filtered.forEach(inv => {
        const totalAmount = (inv.amount_with_vat || 0) + (inv.delivery_cost || 0)
        amounts[inv.id] = totalAmount
      })
      setPaymentAmounts(amounts)

      // Set defaults
      const defaultValues: any = {
        payment_date: dayjs(),
      }

      if (paymentTypes.length > 0) {
        const bankTransferType = paymentTypes.find(t => t.code === 'bank_transfer')
        defaultValues.payment_type_id = bankTransferType?.id || paymentTypes[0].id
      }

      form.setFieldsValue(defaultValues)
    } else {
      form.resetFields()
      setPaymentAmounts({})
    }
  }, [visible, invoices, selectedInvoiceIds, form, paymentTypes])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Pass payment amounts to submit handler
      await onSubmit(selectedInvoiceIds, {
        ...values,
        paymentAmounts
      })

      message.success(`Платежи созданы для ${selectedInvoiceIds.length} счёт(ов)`)
      form.resetFields()
      setPaymentAmounts({})
      onClose()
    } catch (error: any) {
      console.error('[BulkPaymentsModal.handleSubmit] Error:', error)
      if (error.errorFields) {
        message.error('Заполните все обязательные поля')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount = Object.values(paymentAmounts).reduce((sum, amount) => sum + amount, 0)

  const tableColumns = [
    {
      title: 'Номер счёта',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 120,
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
      width: 100,
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Сумма счёта',
      key: 'invoice_amount',
      align: 'right' as const,
      width: 130,
      render: (_: any, record: Invoice) => {
        const total = (record.amount_with_vat || 0) + (record.delivery_cost || 0)
        return formatAmount(total) + ' ₽'
      },
    },
    {
      title: 'Сумма платежа',
      key: 'payment_amount',
      align: 'right' as const,
      width: 150,
      render: (_: any, record: Invoice) => (
        <InputNumber
          min={0}
          step={0.01}
          value={paymentAmounts[record.id] || 0}
          onChange={(val) => {
            setPaymentAmounts(prev => ({
              ...prev,
              [record.id]: val || 0
            }))
          }}
          formatter={(value) => formatAmount(value || 0)}
          parser={(value) => {
            const num = parseFloat(value?.replace(/\s/g, '') || '0')
            return isNaN(num) ? 0 : num
          }}
          style={{ width: '100%' }}
        />
      ),
    },
  ]

  return (
    <Modal
      title={`Создание платежей (${selectedInvoices.length} счёт)`}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Отмена
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
        >
          Создать платежи
        </Button>,
      ]}
    >
      <Spin spinning={submitting}>
        <div style={{ marginBottom: 24 }}>
          <h3>Параметры платежей</h3>
          <Form form={form} layout="vertical">
            <Form.Item
              label="Дата платежа"
              name="payment_date"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item
              label="Тип платежа"
              name="payment_type_id"
              rules={[{ required: true, message: 'Выберите тип платежа' }]}
            >
              <Select placeholder="Выберите тип платежа">
                {paymentTypes.map(type => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Описание (опционально)"
              name="description"
            >
              <Input.TextArea rows={2} placeholder="Описание для всех платежей" />
            </Form.Item>
          </Form>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3>Выбранные счёта ({selectedInvoices.length})</h3>
          <Table
            columns={tableColumns}
            dataSource={selectedInvoices}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ marginBottom: 16 }}
          />
          <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 'bold' }}>
            Итого платежей: {formatAmount(totalAmount)} ₽
          </div>
        </div>
      </Spin>
    </Modal>
  )
}
