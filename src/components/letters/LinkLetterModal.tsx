import { Modal, Select, Form, message } from 'antd'
import { useState } from 'react'
import type { Letter } from '../../lib/supabase'
import dayjs from 'dayjs'

const { Option } = Select

interface LinkLetterModalProps {
  visible: boolean
  onCancel: () => void
  onLink: (parentId: string, childId: string) => Promise<void>
  currentLetter: Letter | null
  availableLetters: Letter[]
}

export const LinkLetterModal: React.FC<LinkLetterModalProps> = ({
  visible,
  onCancel,
  onLink,
  currentLetter,
  availableLetters
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      console.log('[LinkLetterModal.handleSubmit] Linking:', {
        parent: values.parent_id,
        child: currentLetter?.id
      })

      if (!currentLetter?.id) {
        message.error('Текущее письмо не определено')
        return
      }

      setLoading(true)
      await onLink(values.parent_id, currentLetter.id)
      form.resetFields()
      message.success('Письмо успешно связано')
      onCancel()
    } catch (error) {
      console.error('[LinkLetterModal.handleSubmit] Error:', error)
      if (error instanceof Error) {
        message.error('Ошибка связывания: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  // Filter out current letter and child letters (those already linked as children)
  const filteredLetters = availableLetters.filter(l => {
    if (l.id === currentLetter?.id) return false
    // Don't show letters that are already children of other letters
    // (they are filtered out by loadLetters, but just in case)
    return true
  })

  return (
    <Modal
      title="Связать письмо"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Связать"
      cancelText="Отмена"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Родительское письмо"
          name="parent_id"
          rules={[{ required: true, message: 'Выберите родительское письмо' }]}
        >
          <Select
            placeholder="Выберите письмо"
            showSearch
            optionFilterProp="children"
          >
            {filteredLetters.map(letter => (
              <Option key={letter.id} value={letter.id}>
                {letter.number}
                {letter.reg_number ? ` (Рег. ${letter.reg_number})` : ''}
                {' - '}
                {dayjs(letter.letter_date).format('DD.MM.YYYY')}
                {letter.subject ? ` - ${letter.subject}` : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {currentLetter && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div><strong>Связываемое письмо:</strong></div>
            <div style={{ marginTop: 8 }}>
              <div>Номер: {currentLetter.number}</div>
              {currentLetter.reg_number && <div>Рег. номер: {currentLetter.reg_number}</div>}
              <div>Дата: {dayjs(currentLetter.letter_date).format('DD.MM.YYYY')}</div>
              {currentLetter.subject && <div>Тема: {currentLetter.subject}</div>}
            </div>
          </div>
        )}
      </Form>
    </Modal>
  )
}
