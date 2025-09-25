import { Table, Typography, Tag, Space } from 'antd'
import type { MaterialRequestItem } from '../../services/materialRequestOperations'

const { Text } = Typography

interface MaterialRequestItemsTableProps {
  items: MaterialRequestItem[]
  loading?: boolean
}

export const MaterialRequestItemsTable: React.FC<MaterialRequestItemsTableProps> = ({
  items,
  loading = false
}) => {
  const columns = [
    {
      title: '№',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: 'Наименование материала',
      dataIndex: 'material_name',
      key: 'material_name',
      ellipsis: true
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit: string) => (
        <Tag color="blue">{unit}</Tag>
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'right' as const,
      render: (quantity: number) => (
        <Text strong>{quantity.toLocaleString('ru-RU')}</Text>
      )
    }
  ]

  return (
    <div style={{ padding: '16px 48px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">
          Всего позиций: <Text strong>{items.length}</Text>
        </Text>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          pagination={false}
          loading={loading}
          size="small"
          locale={{
            emptyText: 'Нет позиций'
          }}
        />
      </Space>
    </div>
  )
}