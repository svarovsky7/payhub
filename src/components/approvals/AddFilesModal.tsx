import { Modal, Button, Space, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import type { PaymentApproval } from '../../services/approvalOperations'

const { Text } = Typography

interface AddFilesModalProps {
  visible: boolean
  onClose: () => void
  selectedApproval: PaymentApproval | null
}

export const AddFilesModal = ({
  visible,
  onClose,
  selectedApproval
}: AddFilesModalProps) => {
  return (
    <Modal
      title="Добавление файлов к счёту"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>
            Счёт № {selectedApproval?.payment?.invoice?.invoice_number}
          </Text>
          <br />
          <Text type="secondary">
            Функция добавления файлов будет доступна в следующей версии.
          </Text>
        </div>
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px' }}>
          <Text type="secondary">
            <InfoCircleOutlined /> На данном этапе согласования вы можете добавлять дополнительные документы к счёту,
            но не можете удалять или изменять существующие файлы.
          </Text>
        </div>
      </Space>
    </Modal>
  )
}