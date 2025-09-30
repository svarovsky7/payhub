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
      ellipsis: true,
      render: (material_name: string, record: MaterialRequestItem) => {
        const materialClass = record.nomenclature?.material_class
        let classPath = ''

        if (materialClass) {
          if (materialClass.parent_id && materialClass.parent) {
            // Это подкласс
            classPath = `${materialClass.parent.name} / ${materialClass.name}`
          } else {
            // Это основной класс
            classPath = materialClass.name
          }
        }

        return (
          <div>
            <Text>{material_name}</Text>
            {classPath && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {classPath} / {record.nomenclature?.name || 'Номенклатура'}
                </Text>
              </div>
            )}
          </div>
        )
      }
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