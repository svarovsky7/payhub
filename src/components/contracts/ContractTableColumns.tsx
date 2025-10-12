import { Button, Space, Tooltip, Popconfirm, Tag, Typography } from 'antd'
import { DeleteOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Contract, ContractProject } from '../../lib/supabase'

const { Text } = Typography

interface GetContractTableColumnsProps {
  contracts: Contract[]
  onDelete: (id: string) => void
  onEdit: (contract: Contract) => void
  onAddInvoice: (contract: Contract) => void
}

export const getContractTableColumns = ({
  contracts,
  onDelete,
  onEdit,
  onAddInvoice
}: GetContractTableColumnsProps): ColumnsType<Contract> => {
  // Генерируем уникальные значения для фильтров
  const payerFilters = Array.from(
    new Set(contracts.map(c => c.payer?.name).filter(Boolean))
  )
    .sort()
    .map(name => ({ text: name as string, value: name as string }))

  const supplierFilters = Array.from(
    new Set(contracts.map(c => c.supplier?.name).filter(Boolean))
  )
    .sort()
    .map(name => ({ text: name as string, value: name as string }))

  const projectFilters = (() => {
    const uniqueProjects = new Set<string>()
    contracts.forEach(c => {
      const contractProjects = c.contract_projects as ContractProject[] | undefined
      if (contractProjects && contractProjects.length > 0) {
        contractProjects.forEach(cp => {
          if (cp.projects?.name) {
            uniqueProjects.add(cp.projects.name)
          }
        })
      }
    })
    return Array.from(uniqueProjects)
      .sort()
      .map(name => ({ text: name, value: name }))
  })()

  const statusFilters = Array.from(
    new Set(contracts.map(c => c.status?.name).filter(Boolean))
  )
    .sort()
    .map(name => ({ text: name as string, value: name as string }))

  return [
    {
      title: 'Номер договора',
      dataIndex: 'contract_number',
      key: 'contract_number',
      render: (number) => <Text strong>{number}</Text>,
      sorter: (a, b) => a.contract_number.localeCompare(b.contract_number)
    },
    {
      title: 'Дата договора',
      dataIndex: 'contract_date',
      key: 'contract_date',
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—',
      sorter: (a, b) => {
        const dateA = a.contract_date ? dayjs(a.contract_date).valueOf() : 0
        const dateB = b.contract_date ? dayjs(b.contract_date).valueOf() : 0
        return dateA - dateB
      }
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      render: (_, record) => record.payer?.name || '—',
      sorter: (a, b) => (a.payer?.name || '').localeCompare(b.payer?.name || ''),
      filters: payerFilters,
      onFilter: (value, record) => record.payer?.name === value,
      filterSearch: true
    },
    {
      title: 'Поставщик',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      render: (_, record) => record.supplier?.name || '—',
      sorter: (a, b) => (a.supplier?.name || '').localeCompare(b.supplier?.name || ''),
      filters: supplierFilters,
      onFilter: (value, record) => record.supplier?.name === value,
      filterSearch: true
    },
    {
      title: 'Проекты',
      key: 'projects',
      render: (_, record) => {
        const contractProjects = record.contract_projects as ContractProject[] | undefined

        if (!contractProjects || contractProjects.length === 0) {
          return '—'
        }

        const projectNames = contractProjects
          .map(cp => cp.projects?.name)
          .filter(Boolean)

        if (projectNames.length === 0) return '—'

        // Показываем первые 2 проекта и добавляем "..." если их больше
        const displayProjects = projectNames.slice(0, 2)
        const hasMore = projectNames.length > 2

        return (
          <Space size={4} wrap>
            {displayProjects.map((name, idx) => (
              <Tag key={idx} color="blue">
                {name}
              </Tag>
            ))}
            {hasMore && (
              <Tooltip title={projectNames.slice(2).join(', ')}>
                <Tag>+{projectNames.length - 2}</Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
      sorter: (a, b) => {
        const aProjects = a.contract_projects as ContractProject[] | undefined
        const bProjects = b.contract_projects as ContractProject[] | undefined
        const aName = aProjects?.[0]?.projects?.name || ''
        const bName = bProjects?.[0]?.projects?.name || ''
        return aName.localeCompare(bName)
      },
      filters: projectFilters,
      onFilter: (value, record) => {
        const contractProjects = record.contract_projects as ContractProject[] | undefined
        if (!contractProjects) return false
        return contractProjects.some(cp => cp.projects?.name === value)
      },
      filterSearch: true
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, record) => {
        if (!record.status) return '—'
        return (
          <Tag color={record.status.color || 'default'}>
            {record.status.name}
          </Tag>
        )
      },
      sorter: (a, b) => (a.status?.name || '').localeCompare(b.status?.name || ''),
      filters: statusFilters,
      onFilter: (value, record) => record.status?.name === value,
      filterSearch: true
    },
    {
      title: 'Ставка НДС',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      render: (rate) => rate ? `${rate}%` : '—',
      align: 'center',
      sorter: (a, b) => (a.vat_rate || 0) - (b.vat_rate || 0)
    },
    {
      title: 'Гарантийный срок',
      dataIndex: 'warranty_period_days',
      key: 'warranty_period_days',
      render: (days) => days ? `${days} дн.` : '—',
      align: 'center',
      sorter: (a, b) => (a.warranty_period_days || 0) - (b.warranty_period_days || 0)
    },
    {
      title: 'Счетов',
      key: 'invoices_count',
      render: (_, record) => {
        const count = (record.contract_invoices as any[] | undefined)?.length || 0
        return (
          <Tag color={count > 0 ? 'blue' : 'default'}>
            {count}
          </Tag>
        )
      },
      align: 'center',
      sorter: (a, b) => {
        const aCount = (a.contract_invoices as any[] | undefined)?.length || 0
        const bCount = (b.contract_invoices as any[] | undefined)?.length || 0
        return aCount - bCount
      }
    },
    {
      title: 'Файлов',
      key: 'attachments_count',
      render: (_, record) => {
        const count = (record.contract_attachments as any[] | undefined)?.length || 0
        return (
          <Tag color={count > 0 ? 'green' : 'default'}>
            {count}
          </Tag>
        )
      },
      align: 'center',
      sorter: (a, b) => {
        const aCount = (a.contract_attachments as any[] | undefined)?.length || 0
        const bCount = (b.contract_attachments as any[] | undefined)?.length || 0
        return aCount - bCount
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Счета">
            <Button
              icon={<LinkOutlined />}
              onClick={() => onAddInvoice(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Удалить договор?"
            description="Это действие нельзя отменить"
            onConfirm={() => onDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ]
}
