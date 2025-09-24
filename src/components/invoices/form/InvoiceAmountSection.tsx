import { Row, Col, Form, InputNumber, Select, Input } from 'antd'

interface InvoiceAmountSectionProps {
  amountWithVat: number
  vatRate: number
  vatAmount: number
  amountWithoutVat: number
  onAmountWithVatChange: (value: number) => void
  onVatRateChange: (value: number) => void
  formatAmount: (value: number | string | undefined) => string
  parseAmount: (value: string | undefined) => number
}

export const InvoiceAmountSection: React.FC<InvoiceAmountSectionProps> = ({
  amountWithVat,
  vatRate,
  vatAmount,
  amountWithoutVat,
  onAmountWithVatChange,
  onVatRateChange,
  formatAmount,
  parseAmount
}) => {
  return (
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
            <Select.Option value={0}>Без НДС</Select.Option>
            <Select.Option value={10}>10%</Select.Option>
            <Select.Option value={20}>20%</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Сумма НДС">
          <Input
            value={formatAmount(vatAmount)}
            disabled
            style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
            addonAfter="₽"
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Сумма без НДС">
          <Input
            value={formatAmount(amountWithoutVat)}
            disabled
            style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
            addonAfter="₽"
          />
        </Form.Item>
      </Col>
    </Row>
  )
}