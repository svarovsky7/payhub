import { Card, Form, Input, Select, DatePicker, Button, Row, Col } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import type { Project, LetterStatus } from '../../lib/supabase'

const { RangePicker } = DatePicker
const { Option } = Select

export interface LetterFilterValues {
  sender?: string
  number?: string
  reg_number?: string
  project_id?: number
  status_id?: number
  responsible?: string
  dateRange?: [Dayjs, Dayjs]
  searchText?: string
}

interface LetterFiltersProps {
  senders: string[]
  projects: Project[]
  letterStatuses: LetterStatus[]
  responsiblePersons: string[]
  onFilter: (values: LetterFilterValues) => void
  onReset: () => void
}

export const LetterFilters: React.FC<LetterFiltersProps> = ({
  senders,
  projects,
  letterStatuses,
  responsiblePersons,
  onFilter,
  onReset
}) => {
  const [form] = Form.useForm()

  const handleFilter = () => {
    const values = form.getFieldsValue()
    console.log('[LetterFilters.handleFilter] Filter values:', values)
    onFilter(values)
  }

  const handleReset = () => {
    console.log('[LetterFilters.handleReset] Resetting filters')
    form.resetFields()
    onReset()
  }

  return (
    <Card
      style={{ marginBottom: 16 }}
      bodyStyle={{ paddingBottom: 8 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFilter}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Проект"
              name="project_id"
              style={{ marginBottom: 8 }}
            >
              <Select
                placeholder="Выберите проект"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {projects.map(project => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Рег. номер"
              name="reg_number"
              style={{ marginBottom: 8 }}
            >
              <Input
                placeholder="Введите рег. номер"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Ответственный"
              name="responsible"
              style={{ marginBottom: 8 }}
            >
              <Select
                placeholder="Выберите ответственного"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {responsiblePersons.map(person => (
                  <Option key={person} value={person}>
                    {person}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Статус"
              name="status_id"
              style={{ marginBottom: 8 }}
            >
              <Select
                placeholder="Выберите статус"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {letterStatuses.map(status => (
                  <Option key={status.id} value={status.id}>
                    {status.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Отправитель"
              name="sender"
              style={{ marginBottom: 8 }}
            >
              <Select
                placeholder="Выберите отправителя"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {senders.map(sender => (
                  <Option key={sender} value={sender}>
                    {sender}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Номер письма"
              name="number"
              style={{ marginBottom: 8 }}
            >
              <Input
                placeholder="Введите номер"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Период даты письма"
              name="dateRange"
              style={{ marginBottom: 8 }}
            >
              <RangePicker
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
                placeholder={['От', 'До']}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Поиск по теме/содержимому"
              name="searchText"
              style={{ marginBottom: 8 }}
            >
              <Input
                placeholder="Введите текст для поиска"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Button
              icon={<ClearOutlined />}
              onClick={handleReset}
              style={{ marginRight: 8 }}
            >
              Сбросить
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              htmlType="submit"
            >
              Применить
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  )
}
