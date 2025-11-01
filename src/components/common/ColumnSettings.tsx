import React, { useState } from 'react'
import { Modal, Checkbox, Button, List, Typography, Input } from 'antd'
import { SettingOutlined, MenuOutlined } from '@ant-design/icons'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ColumnConfig } from '../../hooks/useColumnSettings'

const { Text } = Typography

interface ColumnSettingsProps {
  columns: ColumnConfig[]
  onChange: (columns: ColumnConfig[]) => void
  defaultColumns?: ColumnConfig[]
}

interface SortableItemProps {
  column: ColumnConfig
  onToggle: (key: string) => void
  onWidthChange: (key: string, width: number | undefined) => void
}

const SortableItem: React.FC<SortableItemProps> = ({ column, onToggle, onWidthChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <List.Item
        style={{
          padding: '8px 12px',
          border: '1px solid #f0f0f0',
          marginBottom: 4,
          borderRadius: 4,
          backgroundColor: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
          <div {...listeners} style={{ cursor: 'grab', marginRight: 8 }}>
            <MenuOutlined />
          </div>
          <Checkbox
            checked={column.visible}
            onChange={() => onToggle(column.key)}
          >
            <Text>{column.title}</Text>
          </Checkbox>
          <Input
            type="number"
            placeholder="Ширина"
            value={column.width || ''}
            onChange={(e) => {
              const val = e.target.value
              onWidthChange(column.key, val ? parseInt(val) : undefined)
            }}
            min="30"
            max="500"
            style={{ width: 80, marginLeft: 'auto' }}
            size="small"
          />
        </div>
      </List.Item>
    </div>
  )
}

export const ColumnSettings: React.FC<ColumnSettingsProps> = ({ columns, onChange, defaultColumns }) => {
  const [visible, setVisible] = useState(false)
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalColumns((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id)
        const newIndex = items.findIndex((item) => item.key === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleToggle = (key: string) => {
    setLocalColumns((items) =>
      items.map((item) =>
        item.key === key ? { ...item, visible: !item.visible } : item
      )
    )
  }

  const handleWidthChange = (key: string, width: number | undefined) => {
    setLocalColumns((items) =>
      items.map((item) =>
        item.key === key ? { ...item, width } : item
      )
    )
  }

  const handleOk = () => {
    onChange(localColumns)
    setVisible(false)
  }

  const handleCancel = () => {
    setLocalColumns(columns)
    setVisible(false)
  }

  const handleOpen = () => {
    setLocalColumns(columns)
    setVisible(true)
  }

  const handleReset = () => {
    // Сбрасываем к исходному состоянию
    const resetColumns = defaultColumns || columns.map((col) => ({ ...col, visible: true, width: undefined }))
    onChange(resetColumns)
    setVisible(false)
  }

  return (
    <>
      <Button
        icon={<SettingOutlined />}
        onClick={handleOpen}
        title="Настройка столбцов"
      />
      <Modal
        title="Настройка столбцов"
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={550}
        footer={[
          <Button key="reset" onClick={handleReset}>
            Сбросить
          </Button>,
          <Button key="cancel" onClick={handleCancel}>
            Отмена
          </Button>,
          <Button key="ok" type="primary" onClick={handleOk}>
            Применить
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Перетаскивайте столбцы для изменения порядка, снимите галочку чтобы скрыть, укажите ширину в пикселях
          </Text>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localColumns.map((col) => col.key)}
            strategy={verticalListSortingStrategy}
          >
            <List
              dataSource={localColumns}
              renderItem={(column) => (
                <SortableItem
                  key={column.key}
                  column={column}
                  onToggle={handleToggle}
                  onWidthChange={handleWidthChange}
                />
              )}
            />
          </SortableContext>
        </DndContext>
      </Modal>
    </>
  )
}
