import { Tag, Space, Button, Popconfirm, Tooltip, Dropdown, Badge } from 'antd'
import type { MenuProps } from 'antd'
import { DeleteOutlined, EyeOutlined, PlusCircleOutlined, CloseCircleOutlined, DownOutlined, EditOutlined, ScanOutlined, LoadingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Letter, LetterStatus, Project, UserProfile } from '../../lib/supabase'
import type { RecognitionTask } from '../../services/recognitionTaskService'

interface GetLetterTableColumnsProps {
  letterStatuses: LetterStatus[]
  projects: Project[]
  users: UserProfile[]
  handleViewLetter: (letter: Letter) => void
  handleEditLetter: (letter: Letter) => void
  handleDeleteLetter: (letterId: string) => void
  handleLinkLetter: (letter: Letter) => void
  handleUnlinkLetter: (parentId: string, childId: string) => void
  handleStatusChange: (letterId: string, newStatusId: number) => void
  handleRecognizeAttachments?: (letter: Letter) => void
  currentUserId: string | null
  recognitionTasks?: RecognitionTask[]
}

const truncateText = (text: string, maxLength: number = 25) => {
  if (!text) return '—'
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }
  return text
}

export const getLetterTableColumns = ({
  letterStatuses,
  projects,
  users,
  handleViewLetter,
  handleEditLetter,
  handleDeleteLetter,
  handleLinkLetter,
  handleUnlinkLetter,
  handleStatusChange,
  handleRecognizeAttachments,
  currentUserId,
  recognitionTasks = []
}: GetLetterTableColumnsProps): ColumnsType<Letter> => {
  return [
    {
      title: 'Направление',
      dataIndex: 'direction',
      key: 'direction',
      width: 70,
      filters: [
        { text: 'Входящие', value: 'incoming' },
        { text: 'Исходящие', value: 'outgoing' }
      ],
      onFilter: (value, record) => record.direction === value,
      render: (direction: 'incoming' | 'outgoing') => (
        <Tag color={direction === 'incoming' ? 'blue' : 'green'}>
          {direction === 'incoming' ? 'Вхд' : 'Исх'}
        </Tag>
      )
    },
    {
      title: 'Номер письма',
      dataIndex: 'number',
      key: 'number',
      width: 100,
      sorter: (a, b) => (a.number || '').localeCompare(b.number || ''),
      ellipsis: {
        showTitle: false
      },
      render: (text: string, record: Letter) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          <Button type="link" onClick={() => handleViewLetter(record)} style={{ padding: 0 }}>
            {truncateText(text, 15)}
          </Button>
        </Tooltip>
      )
    },
    {
      title: 'Рег. номер',
      dataIndex: 'reg_number',
      key: 'reg_number',
      width: 90,
      sorter: (a, b) => (a.reg_number || '').localeCompare(b.reg_number || ''),
      render: (text: string) => (
        <Tooltip title={text || '—'}>
          {text || '—'}
        </Tooltip>
      )
    },
    {
      title: 'Дата письма',
      dataIndex: 'letter_date',
      key: 'letter_date',
      width: 95,
      sorter: (a, b) => dayjs(a.letter_date).unix() - dayjs(b.letter_date).unix(),
      render: (date: string) => dayjs(date).format('DD.MM.YY')
    },
    {
      title: 'Дата рег.',
      dataIndex: 'reg_date',
      key: 'reg_date',
      width: 95,
      sorter: (a, b) => {
        if (!a.reg_date && !b.reg_date) return 0
        if (!a.reg_date) return 1
        if (!b.reg_date) return -1
        return dayjs(a.reg_date).unix() - dayjs(b.reg_date).unix()
      },
      render: (date: string) => date ? dayjs(date).format('DD.MM.YY') : '—'
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      width: 150,
      ellipsis: {
        showTitle: false
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          {truncateText(text, 25)}
        </Tooltip>
      )
    },
    {
      title: 'Отправитель',
      dataIndex: 'sender',
      key: 'sender',
      width: 120,
      sorter: (a, b) => {
        const aValue = a.sender_type === 'contractor' ? (a.sender_contractor?.name || '') : (a.sender || '')
        const bValue = b.sender_type === 'contractor' ? (b.sender_contractor?.name || '') : (b.sender || '')
        return aValue.localeCompare(bValue)
      },
      ellipsis: {
        showTitle: false
      },
      render: (_: any, record: Letter) => {
        const displayValue = record.sender_type === 'contractor'
          ? record.sender_contractor?.name
          : record.sender
        return displayValue ? (
          <Tooltip placement="topLeft" title={displayValue}>
            {truncateText(displayValue, 20)}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Получатель',
      dataIndex: 'recipient',
      key: 'recipient',
      width: 120,
      sorter: (a, b) => {
        const aValue = a.recipient_type === 'contractor' ? (a.recipient_contractor?.name || '') : (a.recipient || '')
        const bValue = b.recipient_type === 'contractor' ? (b.recipient_contractor?.name || '') : (b.recipient || '')
        return aValue.localeCompare(bValue)
      },
      ellipsis: {
        showTitle: false
      },
      render: (_: any, record: Letter) => {
        const displayValue = record.recipient_type === 'contractor'
          ? record.recipient_contractor?.name
          : record.recipient
        return displayValue ? (
          <Tooltip placement="topLeft" title={displayValue}>
            {truncateText(displayValue, 20)}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 120,
      sorter: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || ''),
      filters: projects.map(p => ({ text: p.name, value: p.id })),
      onFilter: (value, record) => record.project_id === value,
      ellipsis: {
        showTitle: false
      },
      render: (_: any, record: Letter) => {
        const projectName = record.project?.name
        return projectName ? (
          <Tooltip placement="topLeft" title={projectName}>
            {truncateText(projectName, 20)}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Ответственный',
      dataIndex: ['responsible_user', 'full_name'],
      key: 'responsible_user',
      width: 120,
      sorter: (a, b) => {
        const aName = a.responsible_user?.full_name || a.responsible_person_name || ''
        const bName = b.responsible_user?.full_name || b.responsible_person_name || ''
        return aName.localeCompare(bName)
      },
      filters: users.map(u => ({ text: u.full_name, value: u.id })),
      onFilter: (value, record) => record.responsible_user_id === value,
      ellipsis: {
        showTitle: false
      },
      render: (_: any, record: Letter) => {
        const responsibleName = record.responsible_user?.full_name || record.responsible_person_name
        return responsibleName ? (
          <Tooltip placement="topLeft" title={responsibleName}>
            {truncateText(responsibleName, 20)}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Создатель',
      dataIndex: ['creator', 'full_name'],
      key: 'creator',
      width: 120,
      sorter: (a, b) => (a.creator?.full_name || '').localeCompare(b.creator?.full_name || ''),
      filters: users.map(u => ({ text: u.full_name, value: u.full_name })),
      onFilter: (value, record) => record.creator?.full_name === value,
      ellipsis: {
        showTitle: false
      },
      render: (_: any, record: Letter) => {
        const creatorName = record.creator?.full_name
        return creatorName ? (
          <Tooltip placement="topLeft" title={creatorName}>
            {truncateText(creatorName, 20)}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Статус',
      dataIndex: ['status', 'name'],
      key: 'status',
      width: 110,
      sorter: (a, b) => (a.status?.name || '').localeCompare(b.status?.name || ''),
      filters: letterStatuses.map(s => ({ text: s.name, value: s.id })),
      onFilter: (value, record) => record.status_id === value,
      render: (_: any, record: Letter) => {
        const status = record.status

        const menuItems: MenuProps['items'] = letterStatuses.map(s => ({
          key: s.id.toString(),
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={s.color || 'default'} style={{ margin: 0 }}>
                {s.name}
              </Tag>
            </div>
          ),
          onClick: () => handleStatusChange(record.id, s.id)
        }))

        return status ? (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Tag
              color={status.color || 'default'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {truncateText(status.name, 15)} <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
            </Tag>
          </Dropdown>
        ) : '—'
      }
    },
    {
      title: 'Доставка',
      dataIndex: 'delivery_method',
      key: 'delivery_method',
      width: 85,
      filters: [
        { text: 'Почта', value: 'почта' },
        { text: 'Email', value: 'email' },
        { text: 'Курьер', value: 'курьер' },
        { text: 'ЭДО', value: 'ЭДО' },
        { text: 'Факс', value: 'факс' }
      ],
      onFilter: (value, record) => record.delivery_method === value,
      render: (text: string) => (
        <Tooltip title={text || '—'}>
          {truncateText(text, 12)}
        </Tooltip>
      )
    },
    {
      title: 'Файлы',
      dataIndex: 'attachments',
      key: 'attachments_count',
      width: 70,
      align: 'center',
      sorter: (a, b) => {
        const aFiles = (a.attachments || []).filter(att => !att.attachment?.original_name?.toLowerCase().endsWith('.md')).length
        const bFiles = (b.attachments || []).filter(att => !att.attachment?.original_name?.toLowerCase().endsWith('.md')).length
        return aFiles - bFiles
      },
      render: (_: any, record: Letter) => {
        const attachments = record.attachments || []
        const regularFiles = attachments.filter(att => !att.attachment?.original_name?.toLowerCase().endsWith('.md')).length
        const mdFiles = attachments.filter(att => att.attachment?.original_name?.toLowerCase().endsWith('.md')).length
        
        if (regularFiles === 0 && mdFiles === 0) return '—'
        
        return (
          <Tag color="blue">{regularFiles}/{mdFiles}</Tag>
        )
      }
    },
    {
      title: 'Просрочено',
      dataIndex: 'response_deadline',
      key: 'response_overdue',
      width: 85,
      align: 'center',
      sorter: (a, b) => {
        if (!a.response_deadline && !b.response_deadline) return 0
        if (!a.response_deadline) return 1
        if (!b.response_deadline) return -1
        const aDiff = dayjs(a.response_deadline).diff(dayjs(), 'day')
        const bDiff = dayjs(b.response_deadline).diff(dayjs(), 'day')
        return aDiff - bDiff
      },
      render: (_: any, record: Letter) => {
        if (!record.response_deadline) return '—'

        const today = dayjs().startOf('day')
        const deadline = dayjs(record.response_deadline).startOf('day')
        const diff = deadline.diff(today, 'day')

        if (diff < 0) {
          return (
            <Tooltip title={`Просрочено на ${Math.abs(diff)} дней`}>
              <Tag color="red" style={{ margin: 0, fontWeight: 'bold' }}>
                {diff} дн.
              </Tag>
            </Tooltip>
          )
        } else {
          return (
            <Tooltip title={`Осталось ${diff} дней`}>
              <Tag color="green" style={{ margin: 0, fontWeight: 'bold' }}>
                +{diff} дн.
              </Tag>
            </Tooltip>
          )
        }
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_: any, record: Letter) => (
        <Space size="small">
          {!record.parent_id && (
            <Tooltip title="Связать письмо">
              <Button
                type="text"
                icon={<PlusCircleOutlined />}
                onClick={() => handleLinkLetter(record)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          {record.parent_id && (
            <Tooltip title="Отвязать от родительского письма">
              <Button
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleUnlinkLetter(record.parent_id!, record.id)}
              />
            </Tooltip>
          )}
          {(() => {
            const letterTasks = recognitionTasks.filter(t => t.letterId === record.id)
            const hasActiveTasks = letterTasks.length > 0
            const avgProgress = hasActiveTasks 
              ? Math.floor(letterTasks.reduce((sum, t) => sum + t.progress, 0) / letterTasks.length)
              : 0

            if (hasActiveTasks) {
              console.log(`[LetterTableColumns] Active tasks for letter ${record.number}:`, letterTasks)
              return (
                <Tooltip title={`Распознавание: ${avgProgress}% (${letterTasks.length} файл${letterTasks.length > 1 ? 'ов' : ''})`}>
                  <Badge count={letterTasks.length} size="small" offset={[-5, 5]}>
                    <Button
                      type="text"
                      icon={<LoadingOutlined spin />}
                      onClick={() => handleRecognizeAttachments?.(record)}
                      style={{ color: '#1890ff' }}
                    />
                  </Badge>
                </Tooltip>
              )
            }

            return (
              <Tooltip title="Распознать вложения">
                <Button
                  type="text"
                  icon={<ScanOutlined />}
                  onClick={() => handleRecognizeAttachments?.(record)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>
            )
          })()}
          <Tooltip title="Просмотр">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewLetter(record)}
            />
          </Tooltip>
          {record.created_by === currentUserId && (
            <Tooltip title="Редактировать">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEditLetter(record)}
              />
            </Tooltip>
          )}
          {record.created_by === currentUserId && (
            <Popconfirm
              title="Удалить письмо?"
              description="Это действие нельзя отменить"
              onConfirm={() => handleDeleteLetter(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Tooltip title="Удалить">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]
}
