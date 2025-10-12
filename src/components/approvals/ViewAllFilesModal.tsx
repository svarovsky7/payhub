import { Modal, message } from 'antd'
import { InvoiceAttachmentsTab } from '../invoices/InvoiceAttachmentsTab'
import { useState, useEffect } from 'react'
import type { PaymentApproval } from '../../services/approvalOperations'
import { loadApprovalAttachments, type AttachmentData } from '../invoices/AttachmentOperations'
import { handlePreviewFile, handleDownloadFile, formatFileSize } from '../invoices/InvoiceHelpers'

interface ViewAllFilesModalProps {
  visible: boolean
  onClose: () => void
  approval: PaymentApproval | null
}

export const ViewAllFilesModal = ({
  visible,
  onClose,
  approval
}: ViewAllFilesModalProps) => {
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)

  // Load attachments when modal opens
  useEffect(() => {
    if (visible && approval?.payment?.invoice_id && approval?.payment_id) {
      loadAttachments()
    } else {
      // Reset state when modal is closed
      setAttachments([])
    }
  }, [visible, approval])

  const loadAttachments = async () => {
    if (!approval?.payment?.invoice_id || !approval?.payment_id) {
      console.error('[ViewAllFilesModal] Missing invoice or payment ID')
      return
    }

    setLoadingAttachments(true)

    try {
      const files = await loadApprovalAttachments(approval.payment.invoice_id, approval.payment_id)
      setAttachments(files)
    } catch (error) {
      console.error('[ViewAllFilesModal.loadAttachments] Error:', error)
      message.error('Ошибка при загрузке файлов')
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handlePreview = async (file: AttachmentData) => {
    try {
      const previewData = await handlePreviewFile(file)
      if (previewData) {
        setPreviewFile(previewData)
      }
    } catch (error) {
      console.error('[ViewAllFilesModal.handlePreview] Error:', error)
      message.error('Ошибка при открытии файла')
    }
  }

  const handleDownload = async (file: AttachmentData) => {
    try {
      await handleDownloadFile(file)
    } catch (error) {
      console.error('[ViewAllFilesModal.handleDownload] Error:', error)
      message.error('Ошибка при загрузке файла')
    }
  }

  const handleDelete = async () => {
    // Files are read-only in approval view
    message.info('Удаление файлов недоступно в режиме просмотра согласований')
  }

  if (!approval) return null

  return (
    <>
      <Modal
        title={`Счёт № ${approval.payment?.invoice?.invoice_number} - Прикрепленные файлы`}
        open={visible}
        onCancel={onClose}
        width={900}
        footer={null}
        destroyOnClose
      >
        <InvoiceAttachmentsTab
          attachments={attachments}
          loadingAttachments={loadingAttachments}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={handleDelete}
          formatFileSize={formatFileSize}
        />
      </Modal>

      {/* Preview Modal */}
      {previewFile && (
        <Modal
          open={!!previewFile}
          onCancel={() => setPreviewFile(null)}
          footer={null}
          width="90%"
          style={{ top: 20 }}
          title={previewFile.name}
        >
          {previewFile.type.startsWith('image/') ? (
            <img src={previewFile.url} alt={previewFile.name} style={{ width: '100%' }} />
          ) : previewFile.type === 'application/pdf' ? (
            <iframe
              src={previewFile.url}
              style={{ width: '100%', height: '80vh', border: 'none' }}
              title={previewFile.name}
            />
          ) : (
            <div>Предварительный просмотр недоступен для этого типа файла</div>
          )}
        </Modal>
      )}
    </>
  )
}
