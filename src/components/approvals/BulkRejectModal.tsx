import { Modal, Form, Input, Typography, Alert, Progress } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import type { BulkApprovalResult } from '../../services/approval/approvalBulk'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface BulkRejectModalProps {
  visible: boolean
  selectedCount: number
  comment: string
  setComment: (comment: string) => void
  onReject: () => void
  onCancel: () => void
  processing: boolean
  processingProgress?: number
  result?: BulkApprovalResult | null
}

export const BulkRejectModal = ({
  visible,
  selectedCount,
  comment,
  setComment,
  onReject,
  onCancel,
  processing,
  processingProgress = 0,
  result
}: BulkRejectModalProps) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloseOutlined style={{ color: '#ff4d4f' }} />
          <span>Отклонить выбранные платежи</span>
        </div>
      }
      open={visible}
      onOk={onReject}
      onCancel={onCancel}
      okText={processing ? 'Отклонение...' : 'Отклонить'}
      cancelText="Отмена"
      confirmLoading={processing}
      okButtonProps={{
        danger: true,
        disabled: !comment.trim() || processing
      }}
      width={600}
      maskClosable={!processing}
      closable={!processing}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message={`Будет отклонено ${selectedCount} ${selectedCount === 1 ? 'платёж' : selectedCount < 5 ? 'платежа' : 'платежей'}`}
          type="warning"
          showIcon
        />
      </div>

      {processing && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Выполняется отклонение...</Text>
          <Progress
            percent={processingProgress}
            status="active"
            strokeColor="#ff4d4f"
          />
        </div>
      )}

      {result && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Результаты отклонения"
            description={
              <div>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong>Всего: </Text>
                  <Text>{result.total}</Text>
                </Paragraph>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong style={{ color: '#52c41a' }}>Отклонено: </Text>
                  <Text>{result.successful}</Text>
                </Paragraph>
                {result.failed > 0 && (
                  <Paragraph style={{ marginBottom: 8 }}>
                    <Text strong style={{ color: '#ff4d4f' }}>Ошибок: </Text>
                    <Text>{result.failed}</Text>
                  </Paragraph>
                )}
                {result.errors.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Text strong>Ошибки:</Text>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                      {result.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>
                          <Text type="secondary">
                            Платёж №{error.paymentNumber}: {error.error}
                          </Text>
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>
                          <Text type="secondary">
                            и ещё {result.errors.length - 5}...
                          </Text>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            }
            type={result.failed > 0 ? 'warning' : 'success'}
            showIcon
          />
        </div>
      )}

      <Form layout="vertical">
        <Form.Item
          label={<Text strong>Причина отклонения (обязательно)</Text>}
          required
          validateStatus={!comment.trim() ? 'error' : 'success'}
          help={!comment.trim() ? 'Укажите причину отклонения' : undefined}
        >
          <TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Укажите причину отклонения платежей..."
            rows={4}
            disabled={processing}
            maxLength={500}
            showCount
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
