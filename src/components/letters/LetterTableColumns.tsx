import { Tag, Space, Button, Popconfirm, Tooltip, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusCircleOutlined, CloseCircleOutlined, DownOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Letter, LetterStatus, Project, UserProfile } from '../../lib/supabase'

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
  handleStatusChange
}: GetLetterTableColumnsProps): ColumnsType<Letter> => {
  return [
    {
      title: 'Направление',
      dataIndex: 'direction',
      key: 'direction',
      width: 90,
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
      width: 150,
      sorter: (a, b) => (a.number || '').localeCompare(b.number || ''),
      render: (text: string, record: Letter) => (
        <Button type="link" onClick={() => handleViewLetter(record)}>
          {text || '—'}
        </Button>
      )
    },
    {
      title: 'Рег. номер',
      dataIndex: 'reg_number',
      key: 'reg_number',
      width: 130,
      sorter: (a, b) => (a.reg_number || '').localeCompare(b.reg_number || ''),
      render: (text: string) => text || '—'
    },
    {
      title: 'Дата письма',
      dataIndex: 'letter_date',
      key: 'letter_date',
      width: 120,
      sorter: (a, b) => dayjs(a.letter_date).unix() - dayjs(b.letter_date).unix(),
      render: (date: string) => dayjs(date).format('DD.MM.YYYY')
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'reg_date',
      key: 'reg_date',
      width: 130,
      sorter: (a, b) => {
        if (!a.reg_date && !b.reg_date) return 0
        if (!a.reg_date) return 1
        if (!b.reg_date) return -1
        return dayjs(a.reg_date).unix() - dayjs(b.reg_date).unix()
      },
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY') : '—'
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: {
        showTitle: false
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text || '—'}
        </Tooltip>
      )
    },
    {
      title: 'Отправитель',
      dataIndex: 'sender',
      key: 'sender',
      width: 180,
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
            {displayValue}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Получатель',
      dataIndex: 'recipient',
      key: 'recipient',
      width: 180,
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
            {displayValue}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 200,
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
            {projectName}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Ответственный',
      dataIndex: ['responsible_user', 'full_name'],
      key: 'responsible_user',
      width: 180,
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
            {responsibleName}
          </Tooltip>
        ) : '—'
      }
    },
    {
      title: 'Статус',
      dataIndex: ['status', 'name'],
      key: 'status',
      width: 150,
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
              {status.name} <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
            </Tag>
          </Dropdown>
        ) : '—'
      }
    },
    {
      title: 'Способ доставки',
      dataIndex: 'delivery_method',
      key: 'delivery_method',
      width: 150,
      filters: [
        { text: 'Почта', value: 'почта' },
        { text: 'Email', value: 'email' },
        { text: 'Курьер', value: 'курьер' },
        { text: 'ЭДО', value: 'ЭДО' },
        { text: 'Факс', value: 'факс' }
      ],
      onFilter: (value, record) => record.delivery_method === value
    },
    {
      title: 'Просрочено на ответ',
      dataIndex: 'response_deadline',
      key: 'response_overdue',
      width: 150,
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
          // Просрочено - красный цвет с минусом
          return (
            <Tag color="red" style={{ margin: 0, fontWeight: 'bold' }}>
              {diff} дн.
            </Tag>
          )
        } else {
          // Еще есть время - зеленый цвет с плюсом
          return (
            <Tag color="green" style={{ margin: 0, fontWeight: 'bold' }}>
              +{diff} дн.
            </Tag>
          )
        }
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 210,
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
          <Tooltip title="Просмотр">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewLetter(record)}
            />
          </Tooltip>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditLetter(record)}
            />
          </Tooltip>
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
        </Space>
      )
    }
  ]
}
