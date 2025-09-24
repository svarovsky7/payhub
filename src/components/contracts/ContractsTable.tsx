import { Table, Button, Space, Tag, Popconfirm, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, FileTextOutlined, EyeOutlined, PaperClipOutlined } from '@ant-design/icons'
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import type { Contract } from '../../services/contractOperations'

interface ContractsTableProps {
  contracts: Contract[]
  loading: boolean
  selectedRows: string[]
  onSelectionChange: (keys: string[]) => void
  onEdit: (contract: Contract) => void
  onDelete: (id: string) => void
  onViewInvoices: (contract: Contract) => void
  onViewFiles: (contract: Contract) => void
}

export const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  loading,
  selectedRows,
  onSelectionChange,
  onEdit,
  onDelete,
  onViewInvoices,
  onViewFiles
}) => {
  const rowSelection: TableRowSelection<Contract> = {
    selectedRowKeys: selectedRows,
    onChange: (selectedRowKeys) => {
      onSelectionChange(selectedRowKeys as string[])
    }
  }

  const columns: ColumnsType<Contract> = [
    {
      title: 'Номер',
      dataIndex: 'contract_number',
      key: 'contract_number',
      width: 150,
      sorter: (a, b) => a.contract_number.localeCompare(b.contract_number),
    },
    {
      title: 'Дата',
      dataIndex: 'contract_date',
      key: 'contract_date',
      width: 110,
      sorter: (a, b) => a.contract_date.localeCompare(b.contract_date),
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Плательщик',
      key: 'payer',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.payer?.name || '-'}>
          {record.payer?.name || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'Поставщик',
      key: 'supplier',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.supplier?.name || '-'}>
          {record.supplier?.name || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'НДС',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      width: 80,
      align: 'center',
      render: (rate: number) => rate !== null ? `${rate}%` : '-',
    },
    {
      title: 'Гарантия',
      dataIndex: 'warranty_period_days',
      key: 'warranty_period_days',
      width: 100,
      align: 'center',
      render: (days: number) => days ? `${days} дн.` : '-',
    },
    {
      title: 'Связи',
      key: 'links',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.invoices && record.invoices.length > 0 && (
            <Tag color="blue">{record.invoices.length} счёт(ов)</Tag>
          )}
          {record.attachments && record.attachments.length > 0 && (
            <Tag color="green">{record.attachments.length} файл(ов)</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Счета">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => onViewInvoices(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Файлы">
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              onClick={() => onViewFiles(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Удалить договор?"
            description="Это действие нельзя отменить"
            onConfirm={() => onDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Tooltip title="Удалить">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={contracts}
      rowKey="id"
      loading={loading}
      rowSelection={rowSelection}
      pagination={{
        showSizeChanger: true,
        showTotal: (total) => `Всего: ${total}`,
      }}
      scroll={{ x: 1200 }}
    />
  )
}