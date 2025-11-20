import { useState, useEffect } from 'react'
import { Timeline, Spin, Empty, Tag, Typography, Tooltip } from 'antd'
import {
  FileAddOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  SwapOutlined,
  MinusCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'
import type { AuditLogView, AuditAction } from '../../types/audit'
import { supabase } from '../../lib/supabase'
import { renderActionDetails } from './AuditActionRenderers'

dayjs.extend(relativeTime)
dayjs.locale('ru')

const { Text } = Typography

interface AuditLogTimelineProps {
  auditLog: AuditLogView[]
  loading?: boolean
}

const actionConfig: Record<
  AuditAction,
  { label: string; color: string; icon: React.ReactNode }
> = {
  create: {
    label: 'Создание',
    color: 'success',
    icon: <PlusCircleOutlined />,
  },
  update: {
    label: 'Изменение',
    color: 'processing',
    icon: <EditOutlined />,
  },
  delete: {
    label: 'Удаление',
    color: 'error',
    icon: <DeleteOutlined />,
  },
  file_add: {
    label: 'Добавление файла',
    color: 'cyan',
    icon: <FileAddOutlined />,
  },
  file_delete: {
    label: 'Удаление файла',
    color: 'orange',
    icon: <MinusCircleOutlined />,
  },
  status_change: {
    label: 'Изменение статуса',
    color: 'purple',
    icon: <SwapOutlined />,
  },
  approval_action: {
    label: 'Действие согласования',
    color: 'blue',
    icon: <CheckCircleOutlined />,
  },
  view: {
    label: 'Просмотр',
    color: 'default',
    icon: <EyeOutlined />,
  },
}

export default function AuditLogTimeline({
  auditLog,
  loading = false,
}: AuditLogTimelineProps) {
  const [letterStatuses, setLetterStatuses] = useState<Record<number, string>>({})
  const [statusesLoaded, setStatusesLoaded] = useState(false)

  useEffect(() => {
    const hasLetterEntries = auditLog.some(entry => entry.entity_type === 'letter')
    const statusesAlreadyLoaded = Object.keys(letterStatuses).length > 0
    
    if (hasLetterEntries && !statusesAlreadyLoaded && !statusesLoaded) {
      setStatusesLoaded(true)
      supabase
        .from('letter_statuses')
        .select('id, name')
        .then(({ data }) => {
          if (data) {
            const statusMap = Object.fromEntries(
              data.map(status => [status.id, status.name])
            )
            setLetterStatuses(statusMap)
          }
        })
    }
  }, [auditLog.length, letterStatuses, statusesLoaded])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
      </div>
    )
  }

  if (!auditLog || auditLog.length === 0) {
    return (
      <Empty
        description="История изменений пуста"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  const hasLetterEntries = auditLog.some(entry => entry.entity_type === 'letter')
  if (hasLetterEntries && !statusesLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin tip="Загрузка статусов..." />
      </div>
    )
  }

  const timelineItems = auditLog.map((entry) => {
    const config = actionConfig[entry.action]

    return {
      key: entry.id,
      color: config.color as any,
      dot: config.icon,
      children: (
        <div style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Tag color={config.color} style={{ margin: 0, fontSize: 12 }}>
              {config.label}
            </Tag>
            <Tooltip title={dayjs(entry.created_at).format('DD.MM.YYYY HH:mm:ss')}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(entry.created_at).fromNow()}
              </Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
              {entry.user_name || entry.user_email}
            </Text>
          </div>

          <div style={{ fontSize: 13 }}>
            {renderActionDetails(entry, letterStatuses)}
          </div>
        </div>
      ),
    }
  })

  return <Timeline items={timelineItems} style={{ marginTop: 8 }} />
}
