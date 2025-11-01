import { Modal, Button, Space, Typography, Upload, Input, message, DatePicker } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { PaymentApproval } from '../../services/approvalOperations'
import type { UploadFile } from 'antd/es/upload/interface'
import { useState } from 'react'
import { processPaymentFiles } from '../../services/paymentOperations'
import { useAuth } from '../../contexts/AuthContext'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { supabase } from '../../lib/supabase'

const { Text } = Typography
const { TextArea } = Input

interface PaymentCompletionModalProps {
  visible: boolean
  onClose: () => void
  selectedApproval: PaymentApproval | null
  onComplete: () => Promise<void>
}

export const PaymentCompletionModal = ({
  visible,
  onClose,
  selectedApproval,
  onComplete
}: PaymentCompletionModalProps) => {
  const { user } = useAuth()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [notes, setNotes] = useState('')
  const [paymentDate, setPaymentDate] = useState<Dayjs | null>(
    selectedApproval?.payment?.payment_date 
      ? dayjs(selectedApproval.payment.payment_date)
      : dayjs()
  )
  const [processing, setProcessing] = useState(false)

  const requiresPaymentOrder = selectedApproval?.payment?.requires_payment_order ?? false

  const uploadProps = {
    beforeUpload: (file: File) => {
      const uploadFile: UploadFile = {
        uid: (file as any).uid || `rc-upload-${Date.now()}-${Math.random()}`,
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
        originFileObj: file as any
      }
      setFileList(prev => [...prev, uploadFile])
      return false
    },
    onRemove: (file: UploadFile) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid))
    },
    fileList,
    multiple: true,
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true
    }
  }

  const handleComplete = async () => {
    if (!selectedApproval?.payment_id || !user?.id) {
      message.error('Ошибка: не найден ID платежа или пользователя')
      return
    }

    // Проверяем файл если требуется платёжное поручение
    if (requiresPaymentOrder && fileList.length === 0) {
      message.error('Обязательно прикрепите платёжное поручение')
      return
    }

    setProcessing(true)
    try {
      // Обновляем paid_date (дата фактической оплаты) и accountant_notes в таблице payments
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          paid_date: paymentDate?.format('YYYY-MM-DD'),
          accountant_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApproval.payment_id)

      if (updateError) throw updateError

      // Загружаем файлы если они есть
      if (fileList.length > 0) {
        await processPaymentFiles(selectedApproval.payment_id, fileList as any, user.id)
      }

      message.success('Платёж помечен как оплачено')
      
      // Вызываем onComplete для завершения процесса согласования
      await onComplete()

      // Очищаем форму
      setFileList([])
      setNotes('')
      setPaymentDate(dayjs())
      onClose()
    } catch (error) {
      console.error('[PaymentCompletionModal] Error:', error)
      message.error('Ошибка при сохранении платежа')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    setFileList([])
    setNotes('')
    setPaymentDate(dayjs())
    onClose()
  }

  return (
    <Modal
      title="Отметить платёж как оплачено"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="close" onClick={handleCancel} disabled={processing}>
          Отмена
        </Button>,
        <Button
          key="complete"
          type="primary"
          onClick={handleComplete}
          loading={processing}
        >
          Оплачено
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>
            Платёж № {selectedApproval?.payment?.payment_number} от{' '}
            {selectedApproval?.payment?.payment_date
              ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
              : '-'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Дата создания платежа
          </Text>
          <br />
          <Text>Сумма: {selectedApproval?.payment?.amount ? `${selectedApproval.payment.amount.toLocaleString('ru-RU')} ₽` : '-'}</Text>
        </div>

        <div>
          <Text strong>Дата фактической оплаты:</Text>
          <DatePicker
            value={paymentDate}
            onChange={setPaymentDate}
            format="DD.MM.YYYY"
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>

        <div>
          <Text strong>Примечание (опционально):</Text>
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Введите примечание к платежу..."
            style={{ marginTop: 8 }}
          />
        </div>

        <div
          style={requiresPaymentOrder && fileList.length === 0 ? {
            border: '2px solid #ff4d4f',
            borderRadius: '4px',
            padding: '12px',
            backgroundColor: '#fff2f0'
          } : {}}
        >
          <Text strong style={requiresPaymentOrder && fileList.length === 0 ? { color: '#ff4d4f' } : {}}>
            Файлы {requiresPaymentOrder ? '(обязательно - платёжное поручение):' : '(опционально):'}
          </Text>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} style={{ marginTop: 8 }}>
              Выбрать файлы
            </Button>
          </Upload>
          {fileList.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              Выбрано файлов: {fileList.length}
            </Text>
          )}
          {requiresPaymentOrder && fileList.length === 0 && (
            <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              ⚠️ Требуется прикрепить платёжное поручение
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  )
}
