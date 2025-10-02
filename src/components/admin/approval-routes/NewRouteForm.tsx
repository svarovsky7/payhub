import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography
} from 'antd'
import {
  PlusOutlined,
  SaveOutlined,
  CloseOutlined
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
      }}>
        <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
          Маршруты согласования
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddingRoute(true)}
          size="large"
          style={{
            height: '40px',
            background: '#fff',
            color: '#667eea',
            border: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          Новый маршрут
        </Button>
      </div>
    )
  }

  return (
    <Card
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e8e8f0',
        marginBottom: 24
      }}
      styles={{
        header: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px 12px 0 0',
          padding: '16px 24px'
        }
      }}
      title={
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>
          Создание нового маршрута
        </span>
      }
      extra={
        <Button
          onClick={handleCancel}
          icon={<CloseOutlined />}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            border: 'none',
            fontWeight: 500
          }}
        >
          Отмена
        </Button>
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
              label={<span style={{ fontWeight: 600, color: '#262626' }}>Название маршрута</span>}
              rules={[
                { required: true, message: 'Введите название маршрута' },
                { min: 3, message: 'Минимум 3 символа' }
              ]}
            >
              <Input
                placeholder="Введите название маршрута"
                size="large"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="invoice_type_id"
              label={<span style={{ fontWeight: 600, color: '#262626' }}>Тип счета</span>}
              rules={[{ required: true, message: 'Выберите тип счета' }]}
            >
              <Select
                placeholder="Выберите тип счета"
                showSearch
                optionFilterProp="children"
                size="large"
                style={{ borderRadius: '8px' }}
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

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={loading}
            size="large"
            style={{
              height: '40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
            }}
          >
            Создать маршрут
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}