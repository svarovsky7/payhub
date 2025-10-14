import { Tag, Space, Button, Popconfirm, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
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
}

export const getLetterTableColumns = ({
  letterStatuses,
  projects,
  users,
  handleViewLetter,
  handleEditLetter,
  handleDeleteLetter,
  handleLinkLetter,
  handleUnlinkLetter
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
      title: 'Получатель',
      dataIndex: 'recipient',
      key: 'recipient',
      width: 180,
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
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 200,
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
      filters: letterStatuses.map(s => ({ text: s.name, value: s.id })),
      onFilter: (value, record) => record.status_id === value,
      render: (_: any, record: Letter) => {
        const status = record.status
        return status ? (
          <Tag color={status.color || 'default'}>
            {status.name}
          </Tag>
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
