import { Modal, message } from 'antd'
import { InvoiceAttachmentsTab } from './InvoiceAttachmentsTab'
import { useState, useEffect } from 'react'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'
import { loadInvoiceAttachments, type AttachmentData } from './AttachmentOperations'
import { handlePreviewFile, handleDownloadFile, formatFileSize } from './InvoiceHelpers'

interface InvoiceViewModalProps {
  isVisible: boolean
  invoice: Invoice | null
  payers: Contractor[]
  suppliers: Contractor[]
  projects: Project[]
  invoiceTypes: InvoiceType[]
  invoiceStatuses: InvoiceStatus[]
  onClose: () => void
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isVisible,
  invoice,
  onClose
}) => {
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)

  // Load attachments when invoice changes
  useEffect(() => {
    if (invoice?.id) {
      loadAttachments()
    }
  }, [invoice])

  const loadAttachments = async () => {
    if (!invoice?.id) return

    setLoadingAttachments(true)

    try {
      const files = await loadInvoiceAttachments(invoice.id)
      setAttachments(files)
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
      console.error('[InvoiceViewModal.handlePreview] Error:', error)
      message.error('Ошибка при открытии файла')
    }
  }

  const handleDownload = async (file: AttachmentData) => {
    try {
      await handleDownloadFile(file)
    } catch (error) {
      console.error('[InvoiceViewModal.handleDownload] Error:', error)
      message.error('Ошибка при загрузке файла')
    }
  }

  if (!invoice) return null

  return (
    <>
      <Modal
        title={`Счёт № ${invoice.invoice_number} - Прикрепленные файлы`}
        open={isVisible}
        onCancel={onClose}
        width={900}
        footer={null}
      >
        <InvoiceAttachmentsTab
          attachments={attachments}
          loadingAttachments={loadingAttachments}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={async () => {}}
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