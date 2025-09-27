import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Typography
} from 'antd'
import {
  PlusOutlined,
  SaveOutlined
} from '@ant-design/icons'
import type { InvoiceType } from '../../../lib/supabase'

const { Title } = Typography

interface NewRouteFormProps {
  form: any
  invoiceTypes: InvoiceType[]
  loading: boolean
  isAddingRoute: boolean
  setIsAddingRoute: (adding: boolean) => void
  onCreateRoute: (values: any) => void
}

export const NewRouteForm = ({
  form,
  invoiceTypes,
  loading,
  isAddingRoute,
  setIsAddingRoute,
  onCreateRoute
}: NewRouteFormProps) => {
  const handleSubmit = async (values: any) => {
    await onCreateRoute(values)
  }

  const handleCancel = () => {
    setIsAddingRoute(false)
    form.resetFields()
  }

  if (!isAddingRoute) {
    return (
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              Маршруты согласования
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddingRoute(true)}
            >
              Новый маршрут
            </Button>
          </div>
        }
      >
        <div style={{ minHeight: '200px' }} />
      </Card>
    )
  }

  return (
    <Card
      title="Создание нового маршрута"
      extra={
        <Space>
          <Button onClick={handleCancel}>
            Отмена
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Название маршрута"
              rules={[
                { required: true, message: 'Введите название маршрута' },
                { min: 3, message: 'Минимум 3 символа' }
              ]}
            >
              <Input placeholder="Введите название маршрута" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="invoice_type_id"
              label="Тип счета"
              rules={[{ required: true, message: 'Выберите тип счета' }]}
            >
              <Select
                placeholder="Выберите тип счета"
                showSearch
                optionFilterProp="children"
              >
                {invoiceTypes.map(type => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={loading}
          >
            Создать маршрут
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}