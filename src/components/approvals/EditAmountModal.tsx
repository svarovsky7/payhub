import { Modal, Form, InputNumber, Space, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { formatAmount } from '../../utils/invoiceHelpers'
import type { PaymentApproval } from '../../services/approvalOperations'

const { Text } = Typography

interface EditAmountModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: () => void
  processing: boolean
  form: any
  selectedApproval: PaymentApproval | null
}

export const EditAmountModal = ({
  visible,
  onCancel,
  onSubmit,
  processing,
  form,
  selectedApproval
}: EditAmountModalProps) => {
  return (
    <Modal
      title="Изменение суммы платежа"
      open={visible}
      onOk={onSubmit}
      onCancel={onCancel}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={processing}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>
            Платеж № {selectedApproval?.payment?.payment_number}
          </Text>
          <br />
          <Text>
            По счёту № {selectedApproval?.payment?.invoice?.invoice_number}
          </Text>
          <br />
          <Text type="secondary">
            Сумма счёта: {formatAmount(selectedApproval?.payment?.invoice?.amount_with_vat || 0)} ₽
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="amount"
            label="Новая сумма платежа"
            rules={[
              { required: true, message: 'Введите сумму' },
              { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Введите сумму"
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => value!.replace(/₽\s?|\s/g, '')}
              precision={2}
            />
          </Form.Item>
        </Form>

        <div style={{ padding: '15px', background: '#fff7e6', borderRadius: '4px' }}>
          <Text type="warning">
            <InfoCircleOutlined /> Изменение суммы платежа может потребовать повторного согласования.
            Убедитесь, что новая сумма соответствует фактическим обязательствам.
          </Text>
        </div>
      </Space>
    </Modal>
  )
}