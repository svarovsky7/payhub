import { Modal, Form, Input, Button, Space, App } from 'antd'
import { useState } from 'react'
import { supabase, type Contractor } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface AddContractorModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: (contractor: Contractor) => void
}

export const AddContractorModal: React.FC<AddContractorModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { name: string; inn?: string }) => {
    setLoading(true)
    try {
      // Проверяем, существует ли контрагент с таким ИНН
      if (values.inn) {
        const { data: existingContractors, error: checkError } = await supabase
          .from('contractors')
          .select('id, name')
          .eq('inn', values.inn)

        if (!checkError && existingContractors && existingContractors.length > 0) {
          const existingContractor = existingContractors[0]
          messageApi.error(`Контрагент с ИНН ${values.inn} уже существует: ${existingContractor.name}`, 5)

          // Также показываем ошибку под полем ИНН
          form.setFields([
            {
              name: 'inn',
              errors: [`ИНН уже используется компанией "${existingContractor.name}"`],
            },
          ])
          return
        }
      }

      const { data, error } = await supabase
        .from('contractors')
        .insert([{ ...values, created_by: user?.id }])
        .select()
        .single()

      if (error) throw error

      messageApi.success('Контрагент создан')
      form.resetFields()
      onSuccess(data)
    } catch (error: unknown) {
      console.error('[AddContractorModal.handleSubmit] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания контрагента'
      messageApi.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePrefixClick = (prefix: string) => {
    const currentName = (form.getFieldValue('name') as string | undefined) || ''
    // Удаляем существующий префикс и кавычки
    const withoutExistingPrefix = currentName
      .replace(/^(ООО|ИП|АО)\s+/i, '')
      .replace(/[«»"]/g, '')
      .trim()

    let nextValue: string
    if (prefix === 'ООО' || prefix === 'АО') {
      // Для ООО и АО добавляем кавычки-ёлочки
      nextValue = withoutExistingPrefix ? `${prefix} «${withoutExistingPrefix}»` : prefix
    } else {
      // Для ИП не добавляем кавычки
      nextValue = withoutExistingPrefix ? `${prefix} ${withoutExistingPrefix}` : prefix
    }

    form.setFieldsValue({ name: nextValue })

    // Триггерим обновление значения формы для валидации
    form.validateFields(['name'])
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="Создать контрагента"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Название компании"
          rules={[{ required: true, message: 'Укажите название компании' }]}
        >
          <div>
            <Form.Item
              name="name"
              noStyle
            >
              <Input placeholder="Введите название компании" />
            </Form.Item>
            <div style={{ marginTop: 8 }}>
              <Space size={8} wrap>
                {['ООО', 'ИП', 'АО'].map((prefix) => (
                  <Button
                    key={prefix}
                    size="small"
                    onClick={() => handlePrefixClick(prefix)}
                    style={{ cursor: 'pointer' }}
                  >
                    {prefix}
                  </Button>
                ))}
              </Space>
            </div>
          </div>
        </Form.Item>

        <Form.Item
          name="inn"
          label="ИНН"
          rules={[
            { required: true, message: 'Укажите ИНН' },
            { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' }
          ]}
          validateTrigger="onBlur"
        >
          <Input
            placeholder="10 или 12 цифр"
            maxLength={12}
            onChange={() => {
              // Очищаем ошибку при изменении значения
              form.setFields([
                {
                  name: 'inn',
                  errors: [],
                },
              ])
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Создать
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
