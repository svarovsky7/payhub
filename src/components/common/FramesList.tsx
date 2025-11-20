import { Card, Typography, Space, Button } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined } from '@ant-design/icons'

const { Text } = Typography

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

interface FramesListProps {
  frames: Frame[]
  selectedFrameIndex: number | null
  draggedFrameIndex: number | null
  dragOverIndex: number | null
  onSelectFrame: (index: number, page: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (index: number) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}

export const FramesList = ({
  frames,
  selectedFrameIndex,
  draggedFrameIndex,
  dragOverIndex,
  onSelectFrame,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: FramesListProps) => {
  return (
    <Card 
      size="small" 
      title="Порядок блоков" 
      extra={
        <Space size={4}>
          <Text type="secondary">{frames.length} блоков</Text>
          {frames.length > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({new Set(frames.map(f => f.page)).size} стр.)
            </Text>
          )}
        </Space>
      }
    >
      <div style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
        {frames.length === 0 ? (
          <div>
            <Text type="secondary">Нарисуйте области на документе</Text>
            <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
              ▪ Зажмите и тяните для создания области<br/>
              ▪ Перетащите для изменения положения<br/>
              ▪ Тяните за углы для изменения размера<br/>
              ▪ Delete для удаления выбранной области<br/>
              ▪ Колесико мыши для зума<br/>
              ▪ Space + ЛКМ для перемещения изображения
            </div>
          </div>
        ) : (
          frames.map((frame, index) => (
            <Card
              key={index}
              size="small"
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
              onDragEnd={onDragEnd}
              style={{
                marginBottom: 8,
                cursor: draggedFrameIndex === index ? 'grabbing' : 'grab',
                border: selectedFrameIndex === index ? '2px solid #52c41a' : 
                        dragOverIndex === index ? '2px dashed #1890ff' : 
                        '1px solid #d9d9d9',
                background: selectedFrameIndex === index ? '#f6ffed' : 
                            draggedFrameIndex === index ? '#fafafa' :
                            dragOverIndex === index ? '#e6f7ff' :
                            '#fff',
                opacity: draggedFrameIndex === index ? 0.5 : 1,
                transform: dragOverIndex === index ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onSelectFrame(index, frame.page + 1)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text strong>Блок {index + 1}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Стр. {frame.page + 1} | {Math.round(frame.width)}×{Math.round(frame.height)}px
                  </Text>
                </div>
                <Space direction="vertical" size={0}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveUp(index)
                    }}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={index === frames.length - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveDown(index)
                    }}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(index)
                    }}
                  />
                </Space>
              </div>
            </Card>
          ))
        )}
      </div>
    </Card>
  )
}

