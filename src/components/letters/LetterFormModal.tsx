import { Modal, Form, Input, DatePicker, Select, Radio, Upload, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import type { UploadFile } from 'antd'
import dayjs from 'dayjs'
import type { Letter, LetterStatus, Project, UserProfile } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const { TextArea } = Input
const { Option } = Select

interface LetterFormModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: any, files: File[], originalFiles: string[]) => Promise<void>
  editingLetter: Letter | null
  letterStatuses: LetterStatus[]
  projects: Project[]
  users: UserProfile[]
}

export const LetterFormModal: React.FC<LetterFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingLetter,
  letterStatuses,
  projects,
  users
}) => {
  const [form] = Form.useForm()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Populate form when editing
  useEffect(() => {
    if (visible && editingLetter) {
      console.log('[LetterFormModal] Populating form with:', editingLetter)

      form.setFieldsValue({
        project_id: editingLetter.project_id,
        number: editingLetter.number,
        status_id: editingLetter.status_id,
        letter_date: editingLetter.letter_date ? dayjs(editingLetter.letter_date) : null,
        subject: editingLetter.subject,
        content: editingLetter.content,
        responsible_user_id: editingLetter.responsible_user_id,
        sender: editingLetter.sender,
        recipient: editingLetter.recipient,
        direction: editingLetter.direction,
        reg_number: editingLetter.reg_number,
        reg_date: editingLetter.reg_date ? dayjs(editingLetter.reg_date) : null,
        sent_via: editingLetter.sent_via
      })

      // Populate file list
      if (editingLetter.attachments && editingLetter.attachments.length > 0) {
        const files = editingLetter.attachments.map((att: any, index: number) => ({
          uid: `${index}`,
          name: att.attachments?.file_name || `Файл ${index + 1}`,
          status: 'done' as const,
          url: att.attachments?.file_path
        }))
        setFileList(files)
      }
    } else if (visible && !editingLetter) {
      // Reset form for new letter
      form.resetFields()
      setFileList([])

      // Set defaults
      form.setFieldsValue({
        direction: 'incoming',
        status_id: 1, // Default to "Новое"
        letter_date: dayjs(),
        created_by: user?.id
      })
    }
  }, [visible, editingLetter, form, user])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      console.log('[LetterFormModal.handleSubmit] Values:', values)

      setLoading(true)

      // Convert dates to strings
      const formData = {
        ...values,
        letter_date: values.letter_date ? values.letter_date.format('YYYY-MM-DD') : null,
        reg_date: values.reg_date ? values.reg_date.format('YYYY-MM-DD') : null,
        created_by: editingLetter ? editingLetter.created_by : user?.id
      }

      // Get new files (not from server)
      const newFiles = fileList
        .filter(f => f.originFileObj)
        .map(f => f.originFileObj as File)

      // Get original file names (from server)
      const originalFiles = fileList
        .filter(f => !f.originFileObj && f.status === 'done')
        .map(f => f.name)

      await onSubmit(formData, newFiles, originalFiles)

      form.resetFields()
      setFileList([])
    } catch (error) {
      console.error('[LetterFormModal.handleSubmit] Validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    onCancel()
  }

  return (
    <Modal
      title={editingLetter ? 'Редактировать письмо' : 'Добавить письмо'}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={800}
      okText={editingLetter ? 'Сохранить' : 'Создать'}
      cancelText="Отмена"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          direction: 'incoming',
          status_id: 1
        }}
      >
        <Form.Item
          label="Направление"
          name="direction"
          rules={[{ required: true, message: 'Выберите направление' }]}
        >
          <Radio.Group>
            <Radio value="incoming">Входящее</Radio>
            <Radio value="outgoing">Исходящее</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Номер письма"
          name="number"
          rules={[{ required: true, message: 'Введите номер письма' }]}
        >
          <Input placeholder="Например: №123/ИСХ-2025" />
        </Form.Item>

        <Form.Item
          label="Регистрационный номер"
          name="reg_number"
        >
          <Input placeholder="Внутренний номер" />
        </Form.Item>

        <Form.Item
          label="Дата письма"
          name="letter_date"
          rules={[{ required: true, message: 'Выберите дату письма' }]}
        >
          <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Дата регистрации"
          name="reg_date"
        >
          <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Тема"
          name="subject"
        >
          <Input placeholder="Краткая тема письма" />
        </Form.Item>

        <Form.Item
          label="Содержание"
          name="content"
        >
          <TextArea rows={4} placeholder="Краткое изложение содержания письма" />
        </Form.Item>

        <Form.Item
          label="Отправитель"
          name="sender"
        >
          <Input placeholder="ФИО или наименование отправителя" />
        </Form.Item>

        <Form.Item
          label="Получатель"
          name="recipient"
        >
          <Input placeholder="ФИО или наименование получателя" />
        </Form.Item>

        <Form.Item
          label="Проект"
          name="project_id"
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

        <Form.Item
          label="Ответственный"
          name="responsible_user_id"
        >
          <Select
            placeholder="Выберите ответственного"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {users.map(user => (
              <Option key={user.id} value={user.id}>
                {user.full_name}
              </Option>
            ))}
          </Select>
        </Form.Item>

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

        <Form.Item
          label="Способ отправки"
          name="sent_via"
        >
          <Select placeholder="Выберите способ отправки" allowClear>
            <Option value="почта">Почта</Option>
            <Option value="email">Email</Option>
            <Option value="курьер">Курьер</Option>
            <Option value="ЭДО">ЭДО</Option>
            <Option value="факс">Факс</Option>
            <Option value="другое">Другое</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Файлы">
          <Upload
            fileList={fileList}
            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            beforeUpload={() => false}
            multiple
          >
            <Button icon={<UploadOutlined />}>Прикрепить файлы</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  )
}
