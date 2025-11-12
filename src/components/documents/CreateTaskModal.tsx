import { Modal, Form, Input, message } from 'antd'
import { documentTaskService } from '../../services/documentTaskService'

interface CreateTaskModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
}

export const CreateTaskModal = ({ visible, onCancel, onSuccess }: CreateTaskModalProps) => {
  const [form] = Form.useForm()

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await documentTaskService.createTask(values.title, values.description)
      message.success('Задание создано')
      form.resetFields()
      onSuccess()
    } catch (error: any) {
      console.error('Create task error:', error)
      message.error('Ошибка создания задания')
    }
  }

  return (
    <Modal
      title="Создать задание"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Создать"
      cancelText="Отмена"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Название"
          rules={[{ required: true, message: 'Введите название' }]}
        >
          <Input placeholder="Название задания" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Описание задания" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

