import { Form, Input, DatePicker, Select, Radio, Button, Row, Col, message, Space } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import type { Project } from '../../lib/supabase'

const { Option } = Select

interface LetterBasicFieldsProps {
  form: FormInstance
  projects: Project[]
  generatingRegNumber: boolean
  onDirectionChange: (e: any) => void
  onProjectChange: (projectId: number) => void
  onGenerateRegNumber: () => Promise<void>
  onRegNumberChange: () => void
}

export const LetterBasicFields: React.FC<LetterBasicFieldsProps> = ({
  form,
  projects,
  generatingRegNumber,
  onDirectionChange,
  onProjectChange,
  onGenerateRegNumber,
  onRegNumberChange
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Направление"
            name="direction"
            rules={[{ required: true, message: 'Выберите направление' }]}
          >
            <Radio.Group onChange={onDirectionChange}>
              <Radio value="incoming">Входящее</Radio>
              <Radio value="outgoing">Исходящее</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Проект" name="project_id">
            <Select
              placeholder="Выберите проект"
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={onProjectChange}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Номер письма" name="number">
            <Input placeholder="Например: №123/ИСХ-2025" autoComplete="off" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Регистрационный номер" name="reg_number">
            <Input
              placeholder="Внутренний номер (необязательно)"
              onChange={onRegNumberChange}
              autoComplete="off"
            />
          </Form.Item>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={generatingRegNumber}
            onClick={onGenerateRegNumber}
            style={{
              backgroundColor: '#52c41a',
              borderColor: '#52c41a',
              marginTop: -8,
              width: '100%'
            }}
          >
            Сгенерировать
          </Button>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Дата письма"
            name="letter_date"
            rules={[{ required: true, message: 'Выберите дату письма' }]}
          >
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Дата регистрации" name="reg_date">
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Регламентный срок ответа</span>
                <Space size={4}>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => {
                      const regDate = form.getFieldValue('reg_date')
                      if (regDate) {
                        form.setFieldsValue({ response_deadline: regDate.add(3, 'day') })
                      } else {
                        message.warning('Сначала заполните дату регистрации')
                      }
                    }}
                    style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                  >
                    +3 дня
                  </Button>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => {
                      const regDate = form.getFieldValue('reg_date')
                      if (regDate) {
                        form.setFieldsValue({ response_deadline: regDate.add(5, 'day') })
                      } else {
                        message.warning('Сначала заполните дату регистрации')
                      }
                    }}
                    style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                  >
                    +5 дней
                  </Button>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => {
                      const regDate = form.getFieldValue('reg_date')
                      if (regDate) {
                        form.setFieldsValue({ response_deadline: regDate.add(10, 'day') })
                      } else {
                        message.warning('Сначала заполните дату регистрации')
                      }
                    }}
                    style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                  >
                    +10 дней
                  </Button>
                </Space>
              </div>
            }
            name="response_deadline"
          >
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} placeholder="Выберите срок ответа" />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}
