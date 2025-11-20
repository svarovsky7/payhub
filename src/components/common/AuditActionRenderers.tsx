import { Tag, Typography } from 'antd'
import type { AuditLogView, StatusChangeMetadata, FileAuditMetadata, ApprovalActionMetadata } from '../../types/audit'
import { fieldNameMap, formatFieldValue } from '../../utils/auditFormatters'

const { Text, Paragraph } = Typography

export function renderActionDetails(entry: AuditLogView, letterStatuses: Record<number, string>): React.ReactNode {
  const { action, field_name, old_value, new_value, metadata, entity_type } = entry

  switch (action) {
    case 'create': {
      if (metadata) {
        const createMeta = metadata as any
        const parts = []

        if (createMeta.invoice_number) {
          parts.push(`Номер: ${createMeta.invoice_number}`)
        }
        if (createMeta.payment_number !== undefined) {
          parts.push(`Номер: ${createMeta.payment_number}`)
        }
        if (createMeta.amount) {
          parts.push(`Сумма: ${new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Number(createMeta.amount))}`)
        }

        return parts.length > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{parts.join(' • ')}</Text>
        ) : null
      }
      return null
    }

    case 'update': {
      if (field_name === 'status_id') {
        const statusMeta = metadata as StatusChangeMetadata | undefined
        let oldStatusName = statusMeta?.old_status_name || old_value
        let newStatusName = statusMeta?.new_status_name || new_value
        
        if (entity_type === 'letter' && !statusMeta?.old_status_name) {
          const oldId = old_value ? parseInt(old_value) : null
          const newId = new_value ? parseInt(new_value) : null
          
          if (oldId && letterStatuses[oldId]) {
            oldStatusName = letterStatuses[oldId]
          }
          if (newId && letterStatuses[newId]) {
            newStatusName = letterStatuses[newId]
          }
        }
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
              {oldStatusName}
            </Tag>
            <Text style={{ fontSize: 12 }}>→</Text>
            <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
              {newStatusName}
            </Tag>
          </div>
        )
      }
      
      const metaData = metadata as any
      let oldDisplay = old_value
      let newDisplay = new_value

      if (field_name === 'payer_id' && metaData) {
        oldDisplay = metaData.old_payer_name || old_value
        newDisplay = metaData.new_payer_name || new_value
      } else if (field_name === 'supplier_id' && metaData) {
        oldDisplay = metaData.old_supplier_name || old_value
        newDisplay = metaData.new_supplier_name || new_value
      } else if (field_name === 'project_id' && metaData) {
        oldDisplay = metaData.old_project_name || old_value
        newDisplay = metaData.new_project_name || new_value
      } else if (field_name === 'contract_id' && metaData) {
        oldDisplay = metaData.old_contract_number || old_value
        newDisplay = metaData.new_contract_number || new_value
      } else if (field_name === 'responsible_id' && metaData) {
        oldDisplay = metaData.old_responsible_name || old_value
        newDisplay = metaData.new_responsible_name || new_value
      } else if (field_name === 'material_request_id' && metaData) {
        oldDisplay = metaData.old_request_number || old_value
        newDisplay = metaData.new_request_number || new_value
      } else if (field_name === 'delivery_days' && metaData) {
        const oldType = metaData.old_delivery_days_type === 'working' ? 'раб.' : 'кал.'
        const newType = metaData.new_delivery_days_type === 'working' ? 'раб.' : 'кал.'
        oldDisplay = old_value ? `${old_value} ${oldType} дн.` : '—'
        newDisplay = new_value ? `${new_value} ${newType} дн.` : '—'
      } else if (field_name === 'sender_contractor_id' && metaData) {
        oldDisplay = metaData.old_sender_name || old_value
        newDisplay = metaData.new_sender_name || new_value
      } else if (field_name === 'recipient_contractor_id' && metaData) {
        oldDisplay = metaData.old_recipient_name || old_value
        newDisplay = metaData.new_recipient_name || new_value
      } else {
        oldDisplay = formatFieldValue(old_value, field_name)
        newDisplay = formatFieldValue(new_value, field_name)
      }

      return (
        <div>
          <Text strong style={{ fontSize: 12 }}>{fieldNameMap[field_name || ''] || field_name}: </Text>
          <Text delete type="secondary" style={{ fontSize: 12 }}>
            {oldDisplay}
          </Text>
          <Text style={{ margin: '0 4px' }}>→</Text>
          <Text strong>{newDisplay}</Text>
        </div>
      )
    }

    case 'status_change': {
      const statusMeta = metadata as StatusChangeMetadata | undefined
      let oldStatusName = statusMeta?.old_status_name || old_value
      let newStatusName = statusMeta?.new_status_name || new_value
      
      if (entity_type === 'letter' && !statusMeta?.old_status_name) {
        const oldId = old_value ? parseInt(old_value) : null
        const newId = new_value ? parseInt(new_value) : null
        
        if (oldId && letterStatuses[oldId]) {
          oldStatusName = letterStatuses[oldId]
        }
        if (newId && letterStatuses[newId]) {
          newStatusName = letterStatuses[newId]
        }
      }
      
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
            {oldStatusName}
          </Tag>
          <Text style={{ fontSize: 12 }}>→</Text>
          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
            {newStatusName}
          </Tag>
        </div>
      )
    }

    case 'file_add': {
      const addFileMeta = metadata as FileAuditMetadata | undefined
      const addFileName = addFileMeta?.file_name || 'Файл'
      const addFileSize = addFileMeta?.file_size
        ? ` (${(addFileMeta.file_size / 1024).toFixed(1)} KB)`
        : ''

      return (
        <div>
          <Text strong style={{ fontSize: 12 }}>
            {addFileName}{addFileSize}
          </Text>
          {addFileMeta?.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {addFileMeta.description}
              </Text>
            </div>
          )}
        </div>
      )
    }

    case 'file_delete': {
      const delFileMeta = metadata as FileAuditMetadata | undefined
      const delFileName = delFileMeta?.file_name || 'Файл'

      return (
        <Text type="secondary" style={{ fontSize: 12 }} delete>
          {delFileName}
        </Text>
      )
    }

    case 'approval_action': {
      const approvalMeta = metadata as ApprovalActionMetadata | undefined
      const isApproved = approvalMeta?.approval_action === 'approved'
      const isRejected = approvalMeta?.approval_action === 'rejected'

      return (
        <div>
          <div style={{ marginBottom: approvalMeta?.comment ? 4 : 0 }}>
            {isApproved && <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Согласовано</Tag>}
            {isRejected && <Tag color="error" style={{ margin: 0, fontSize: 11 }}>Отклонено</Tag>}
            {!isApproved && !isRejected && (
              <Tag style={{ margin: 0, fontSize: 11 }}>{approvalMeta?.approval_action}</Tag>
            )}
          </div>
          {approvalMeta?.comment && (
            <Paragraph
              style={{ margin: 0, fontSize: 12 }}
              type="secondary"
              ellipsis={{ rows: 1, expandable: true, symbol: 'еще' }}
            >
              {approvalMeta.comment}
            </Paragraph>
          )}
        </div>
      )
    }

    case 'delete': {
      if (metadata) {
        const deleteMeta = metadata as any
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {deleteMeta.invoice_number || deleteMeta.payment_number || deleteMeta.letter_number}
          </Text>
        )
      }
      return null
    }

    case 'view':
      return null

    default:
      return null
  }
}

