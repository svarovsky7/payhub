import { List, Card, Tag, Button, Space, Empty, Checkbox, Typography } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FileAddOutlined,
  DollarOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { Text } = Typography

interface Role {
  id: number
  code: string
  name: string
}

interface StagePermissions {
  can_edit_invoice?: boolean
  can_add_files?: boolean
  can_edit_amount?: boolean
}

interface WorkflowStage {
  id?: number
  route_id?: number
  order_index: number
  role_id: number
  name: string
  payment_status_id?: number
  role?: Role
  payment_status?: any
  permissions?: StagePermissions
}

interface StagesListProps {
  stages: WorkflowStage[]
  editing: boolean
  onStagesChange: (stages: WorkflowStage[]) => void
  onEditStage: (index: number) => void
  onDeleteStage: (index: number) => void
}

const SortableStageItem: React.FC<{
  stage: WorkflowStage
  index: number
  editing: boolean
  onEdit: () => void
  onDelete: () => void
}> = ({ stage, index, editing, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `stage-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: editing ? 'move' : 'default'
  }

  const getPermissionIcon = (permission: keyof StagePermissions) => {
    switch (permission) {
      case 'can_edit_invoice':
        return <FileTextOutlined />
      case 'can_add_files':
        return <FileAddOutlined />
      case 'can_edit_amount':
        return <DollarOutlined />
      default:
        return null
    }
  }

  const getPermissionLabel = (permission: keyof StagePermissions) => {
    switch (permission) {
      case 'can_edit_invoice':
        return 'Редактирование счёта'
      case 'can_add_files':
        return 'Добавление файлов'
      case 'can_edit_amount':
        return 'Изменение суммы'
      default:
        return permission
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(editing ? listeners : {})}>
      <List.Item
        actions={editing ? [
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={onEdit}
          />,
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
          />
        ] : []}
      >
        <List.Item.Meta
          title={
            <Space>
              <Tag color="blue">Этап {index + 1}</Tag>
              <Text strong>{stage.name}</Text>
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <Text>Роль: {stage.role?.name || 'Не выбрана'}</Text>
              {stage.payment_status && (
                <Text>Статус платежа: {stage.payment_status.name}</Text>
              )}
              {stage.permissions && Object.entries(stage.permissions).some(([_, value]) => value) && (
                <Space wrap size={4}>
                  <Text type="secondary">Разрешения:</Text>
                  {Object.entries(stage.permissions).map(([key, value]) =>
                    value && (
                      <Tag key={key} icon={getPermissionIcon(key as keyof StagePermissions)} color="green">
                        {getPermissionLabel(key as keyof StagePermissions)}
                      </Tag>
                    )
                  )}
                </Space>
              )}
            </Space>
          }
        />
      </List.Item>
    </div>
  )
}

export const StagesList: React.FC<StagesListProps> = ({
  stages,
  editing,
  onStagesChange,
  onEditStage,
  onDeleteStage
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('stage-', ''))
      const newIndex = parseInt(over.id.toString().replace('stage-', ''))

      const newStages = arrayMove(stages, oldIndex, newIndex).map((stage, index) => ({
        ...stage,
        order_index: index
      }))

      onStagesChange(newStages)
    }
  }

  if (stages.length === 0) {
    return (
      <Card>
        <Empty description="Этапы не настроены" />
      </Card>
    )
  }

  const sortableItems = stages.map((_, index) => `stage-${index}`)

  return (
    <Card title="Этапы согласования">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          <List
            dataSource={stages}
            renderItem={(stage, index) => (
              <SortableStageItem
                key={`stage-${index}`}
                stage={stage}
                index={index}
                editing={editing}
                onEdit={() => onEditStage(index)}
                onDelete={() => onDeleteStage(index)}
              />
            )}
          />
        </SortableContext>
      </DndContext>
    </Card>
  )
}