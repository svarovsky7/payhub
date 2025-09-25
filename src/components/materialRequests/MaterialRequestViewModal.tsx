import { Modal, Descriptions, Tag, Table, Typography, Space } from 'antd'
import dayjs from 'dayjs'
import type { MaterialRequest } from '../../services/materialRequestOperations'
import type { Project } from '../../lib/supabase'
import type { Employee } from '../../services/employeeOperations'

const { Text } = Typography

interface MaterialRequestViewModalProps {
  isVisible: boolean
  request: MaterialRequest | null
  projects: Project[]
  employees: Employee[]
  onClose: () => void
}

export const MaterialRequestViewModal: React.FC<MaterialRequestViewModalProps> = ({
  isVisible,
  request,
  projects,
  employees,
  onClose
}) => {
  if (!request) return null

  const project = projects.find(p => p.id === request.project_id)
  const employee = employees.find(e => e.id === request.employee_id)

  const itemColumns = [
    {
      title: '№',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: 'Наименование материала',
      dataIndex: 'material_name',
      key: 'material_name'
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit: string) => <Tag color="blue">{unit}</Tag>
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
    <Modal
      title={`Заявка на материалы ${request.request_number}`}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Номер заявки">
            <Text strong>{request.request_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Дата заявки">
            {dayjs(request.request_date).format('DD.MM.YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Проект">
            {project?.name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Ответственный">
            {employee?.full_name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Позиций">
            <Tag color="blue">{request.total_items || 0}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Создана">
            {dayjs(request.created_at).format('DD.MM.YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Обновлена" span={2}>
            {dayjs(request.updated_at).format('DD.MM.YYYY HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        <div>
          <h4>Перечень материалов</h4>
          <Table
            columns={itemColumns}
            dataSource={request.items || []}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{
              emptyText: 'Нет позиций'
            }}
          />
        </div>
      </Space>
    </Modal>
  )
}