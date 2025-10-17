import { Form, Input, Select, Radio, Space, Tag, Tooltip, Row, Col } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import type { Contractor } from '../../lib/supabase'

interface LetterParticipantsSectionProps {
  form: FormInstance
  contractors: Contractor[]
  topSenders: Contractor[]
  topRecipients: Contractor[]
  senderType: 'individual' | 'contractor'
  recipientType: 'individual' | 'contractor'
  setSenderType: (type: 'individual' | 'contractor') => void
  setRecipientType: (type: 'individual' | 'contractor') => void
  onAddContractorClick: () => void
}

export const LetterParticipantsSection: React.FC<LetterParticipantsSectionProps> = ({
  form,
  contractors,
  topSenders,
  topRecipients,
  senderType,
  recipientType,
  setSenderType,
  setRecipientType,
  onAddContractorClick
}) => {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Отправитель">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="sender_type" noStyle>
              <Radio.Group
                value={senderType}
                onChange={(e) => {
                  setSenderType(e.target.value)
                  form.setFieldValue('sender_type', e.target.value)
                  if (e.target.value === 'individual') {
                    form.setFieldValue('sender_contractor_id', null)
                  } else {
                    form.setFieldValue('sender', null)
                  }
                }}
                size="small"
              >
                <Radio value="contractor">Контрагент</Radio>
                <Radio value="individual">Физ. лицо</Radio>
              </Radio.Group>
            </Form.Item>

            {senderType === 'individual' ? (
              <Form.Item name="sender" noStyle>
                <Input placeholder="Введите ФИО" allowClear />
              </Form.Item>
            ) : (
              <Form.Item name="sender_contractor_id" noStyle>
                <Select
                  placeholder="Выберите контрагента"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={contractors.map(contractor => ({
                    value: contractor.id,
                    label: contractor.name
                  }))}
                />
              </Form.Item>
            )}

            {topSenders.length > 0 && (
              <Space wrap style={{ marginTop: 4 }}>
                {topSenders.map((contractor, index) => (
                  <Tag
                    key={contractor.id}
                    color={index === 0 ? 'green' : 'cyan'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSenderType('contractor')
                      form.setFieldsValue({
                        sender_type: 'contractor',
                        sender_contractor_id: contractor.id,
                        sender: null
                      })
                    }}
                  >
                    {contractor.name}
                  </Tag>
                ))}
              </Space>
            )}
          </Space>
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item
          label={
            <Space>
              <span>Получатель</span>
              <Tooltip title="Добавить контрагента">
                <UserAddOutlined
                  style={{
                    fontSize: 14,
                    color: '#1890ff',
                    cursor: 'pointer'
                  }}
                  onClick={onAddContractorClick}
                />
              </Tooltip>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="recipient_type" noStyle>
              <Radio.Group
                value={recipientType}
                onChange={(e) => {
                  setRecipientType(e.target.value)
                  form.setFieldValue('recipient_type', e.target.value)
                  if (e.target.value === 'individual') {
                    form.setFieldValue('recipient_contractor_id', null)
                  } else {
                    form.setFieldValue('recipient', null)
                  }
                }}
                size="small"
              >
                <Radio value="contractor">Контрагент</Radio>
                <Radio value="individual">Физ. лицо</Radio>
              </Radio.Group>
            </Form.Item>

            {recipientType === 'individual' ? (
              <Form.Item name="recipient" noStyle>
                <Input placeholder="Введите ФИО" allowClear />
              </Form.Item>
            ) : (
              <Form.Item name="recipient_contractor_id" noStyle>
                <Select
                  placeholder="Выберите контрагента"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={contractors.map(contractor => ({
                    value: contractor.id,
                    label: contractor.name
                  }))}
                />
              </Form.Item>
            )}

            {topRecipients.length > 0 && (
              <Space wrap style={{ marginTop: 4 }}>
                {topRecipients.map((contractor, index) => (
                  <Tag
                    key={contractor.id}
                    color={index === 0 ? 'green' : 'cyan'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setRecipientType('contractor')
                      form.setFieldsValue({
                        recipient_type: 'contractor',
                        recipient_contractor_id: contractor.id,
                        recipient: null
                      })
                    }}
                  >
                    {contractor.name}
                  </Tag>
                ))}
              </Space>
            )}
          </Space>
        </Form.Item>
      </Col>
    </Row>
  )
}
