import { Form, Input, Select, Card, Button, Space } from 'antd'
import { SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons'
import type { InvoiceType } from '../../../lib/supabase'

interface RouteFormProps {
  form: any
  invoiceTypes: InvoiceType[]
  onSave: (values: any) => void
  onCancel: () => void
  isAdding?: boolean
}

export const RouteForm: React.FC<RouteFormProps> = ({
  form,
  invoiceTypes,
  onSave,
  onCancel,
  isAdding = false
}) => {
  return (
    <Card
      title={isAdding ? "Новый маршрут согласования" : "Редактирование маршрута"}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
          >
            Сохранить
          </Button>
          <Button
            icon={<CloseOutlined />}
            onClick={onCancel}
          >
            Отмена
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSave}
      >
        <Form.Item
          name="name"
          label="Название маршрута"
          rules={[{ required: true, message: 'Укажите название маршрута' }]}
        >
          <Input placeholder="Например: Основной маршрут согласования" />
        </Form.Item>

        <Form.Item
          name="invoice_type_id"
          label="Тип счёта"
          rules={[{ required: true, message: 'Выберите тип счёта' }]}
        >
          <Select
            placeholder="Выберите тип счёта"
            showSearch
            optionFilterProp="children"
            disabled={!isAdding}
          >
            {invoiceTypes.map(type => (
              <Select.Option key={type.id} value={type.id}>
                {type.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Card>
  )
}