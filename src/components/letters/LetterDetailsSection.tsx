import { Form, Input, Select, AutoComplete, Row, Col, Tag, Space } from 'antd'
import type { FormInstance } from 'antd'
import type { LetterStatus, UserProfile, Letter } from '../../lib/supabase'

const { TextArea } = Input
const { Option } = Select

interface LetterDetailsSectionProps {
  letterStatuses: LetterStatus[]
  users: UserProfile[]
  direction: 'incoming' | 'outgoing'
  selectedProjectId?: number
  letters?: Letter[]
  form?: FormInstance
}

export const LetterDetailsSection: React.FC<LetterDetailsSectionProps> = ({
  letterStatuses,
  users,
  direction,
  selectedProjectId,
  letters = [],
  form
}) => {
  // Get top 3 most frequent responsible persons for the selected project
  const getTopResponsiblePersons = () => {
    if (!selectedProjectId || !letters.length) return []

    const projectLetters = letters.filter(l => l.project_id === selectedProjectId)
    const frequencyMap: Record<string, number> = {}

    projectLetters.forEach(letter => {
      const responsibleName = letter.responsible_user?.full_name || letter.responsible_person_name
      if (responsibleName) {
        frequencyMap[responsibleName] = (frequencyMap[responsibleName] || 0) + 1
      }
    })

    return Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
  }

  const topResponsible = getTopResponsiblePersons()

  const handleResponsibleTagClick = (name: string) => {
    console.log('[LetterDetailsSection] Tag clicked:', name)
    console.log('[LetterDetailsSection] Form instance:', form)
    if (form) {
      console.log('[LetterDetailsSection] Setting field responsible_person_name to:', name)
      form.setFieldValue('responsible_person_name', name)
      console.log('[LetterDetailsSection] Field value after set:', form.getFieldValue('responsible_person_name'))
    } else {
      console.error('[LetterDetailsSection] Form is undefined!')
    }
  }

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
            key: `user-${user.id}`,
            value: user.full_name,
            label: user.full_name
          }))}
          filterOption={(inputValue, option) =>
            option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
          }
        />
      </Form.Item>

      {topResponsible.length > 0 && (
        <div style={{ marginTop: -16, marginBottom: 16 }}>
          <Space wrap size={4}>
            {topResponsible.map((name, index) => (
              <Tag
                key={name}
                color={index === 0 ? 'green' : 'cyan'}
                style={{ cursor: 'pointer' }}
                onClick={() => handleResponsibleTagClick(name)}
              >
                {name}
              </Tag>
            ))}
          </Space>
        </div>
      )}

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
