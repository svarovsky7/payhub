import React from 'react'
import { Table, Button, Space, Tooltip, Popconfirm, Tag, Typography } from 'antd'
import { DeleteOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Contract } from '../../lib/supabase'
import { ContractInvoices } from './ContractInvoices'

const { Text } = Typography

interface ContractsTableProps {
  contracts: Contract[]
  loading: boolean
  onDelete: (id: string) => void
  onEdit: (contract: Contract) => void
  onAddInvoice: (contract: Contract) => void
  expandedRowKeys: string[]
  onExpandedRowsChange: (keys: string[]) => void
  onDataChange?: () => void
}

export const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  loading,
  onDelete,
  onEdit,
  onAddInvoice,
  expandedRowKeys,
  onExpandedRowsChange,
  onDataChange
}) => {
  const columns: ColumnsType<Contract> = [
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
      render: (_, record) => record.payer?.name || '—'
    },
    {
      title: 'Поставщик',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      render: (_, record) => record.supplier?.name || '—'
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      render: (_, record) => record.project?.name || '—'
    },
    {
      title: 'Ставка НДС',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      render: (rate) => rate ? `${rate}%` : '—',
      align: 'center'
    },
    {
      title: 'Гарантийный срок',
      dataIndex: 'warranty_period_days',
      key: 'warranty_period_days',
      render: (days) => days ? `${days} дн.` : '—',
      align: 'center'
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
      align: 'center'
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
      align: 'center'
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

  return (
    <Table
      dataSource={contracts}
      columns={columns}
      loading={loading}
      rowKey="id"
      expandable={{
        expandedRowRender: (record) => (
          <ContractInvoices contract={record} onDataChange={onDataChange} />
        ),
        expandedRowKeys,
        onExpandedRowsChange: (keys) => onExpandedRowsChange(keys as string[]),
        rowExpandable: (record) => ((record.contract_invoices as any[] | undefined)?.length || 0) > 0
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Всего: ${total}`
      }}
    />
  )
}