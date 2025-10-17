import { Form, Input, Select, AutoComplete, Row, Col } from 'antd'
import type { LetterStatus, UserProfile } from '../../lib/supabase'

const { TextArea } = Input
const { Option } = Select

interface LetterDetailsSectionProps {
  letterStatuses: LetterStatus[]
  users: UserProfile[]
  direction: 'incoming' | 'outgoing'
}

export const LetterDetailsSection: React.FC<LetterDetailsSectionProps> = ({
  letterStatuses,
  users,
  direction
}) => {
  return (
    <>
      <Form.Item label="Тема" name="subject">
        <Input placeholder="Краткая тема письма" autoComplete="off" />
      </Form.Item>

      <Form.Item label="Содержание" name="content">
        <TextArea rows={3} placeholder="Краткое изложение содержания письма" />
      </Form.Item>

      <Form.Item label="Ответственный" name="responsible_person_name">
        <AutoComplete
          placeholder="Выберите из списка или введите имя"
          allowClear
          options={users.map(user => ({
            value: user.full_name,
            label: user.full_name
          }))}
          filterOption={(inputValue, option) =>
            option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
          }
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Статус"
            name="status_id"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select placeholder="Выберите статус">
              {letterStatuses.map(status => (
                <Option key={status.id} value={status.id}>
                  {status.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={direction === 'incoming' ? 'Способ доставки' : 'Способ отправки'}
            name="delivery_method"
          >
            <Select
              placeholder={direction === 'incoming' ? 'Выберите способ доставки' : 'Выберите способ отправки'}
              allowClear
            >
              <Option value="почта">Почта</Option>
              <Option value="email">Email</Option>
              <Option value="курьер">Курьер</Option>
              <Option value="ЭДО">ЭДО</Option>
              <Option value="факс">Факс</Option>
              <Option value="другое">Другое</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}
