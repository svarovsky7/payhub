import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Space,
  message,
  Popconfirm,
  ColorPicker,
  Typography
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../../lib/supabase'
import {
  createContractStatus,
  updateContractStatus,
  deleteContractStatus,
  type ContractStatus
} from '../../services/contractOperations'

const { TextArea } = Input
const { Text } = Typography

export const ContractStatusesTab: React.FC = () => {
  const [statuses, setStatuses] = useState<ContractStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingStatus, setEditingStatus] = useState<ContractStatus | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contract_statuses')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      setStatuses(data || [])
    } catch (error) {
      console.error('[ContractStatusesTab.loadData] Error:', error)
      message.error('Ошибка загрузки статусов договоров')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingStatus(null)
    form.resetFields()
    form.setFieldsValue({
      color: '#1890ff'
    })
    setModalVisible(true)
  }

  const handleEdit = (record: ContractStatus) => {
    setEditingStatus(record)
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      color: record.color || '#1890ff',
      description: record.description
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteContractStatus(id)
      await loadData()
    } catch (error) {
      console.error('[ContractStatusesTab.handleDelete] Error:', error)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()

      // Преобразуем цвет из объекта ColorPicker в строку
      const colorString = typeof values.color === 'string'
        ? values.color
        : values.color?.toHexString?.() || '#1890ff'

      const statusData = {
        ...values,
        color: colorString
      }

      if (editingStatus) {
        await updateContractStatus(editingStatus.id, statusData)
      } else {
        await createContractStatus(statusData)
      }

      setModalVisible(false)
      form.resetFields()
      await loadData()
    } catch (error) {
      console.error('[ContractStatusesTab.handleModalOk] Error:', error)
    }
  }


  const columns: ColumnsType<ContractStatus> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Tag color={record.color || 'default'}>{text}</Tag>
        </Space>
      )
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить статус?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              disabled={['draft', 'active', 'expired', 'terminated'].includes(record.code)}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить статус
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={statuses}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`
        }}
      />

      <Modal
        title={editingStatus ? 'Редактировать статус' : 'Создать статус'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="code"
            label="Код статуса"
            rules={[
              { required: true, message: 'Введите код статуса' },
              { pattern: /^[a-z_]+$/, message: 'Только латинские буквы в нижнем регистре и подчёркивания' }
            ]}
            extra="Уникальный код для внутреннего использования (например: in_progress)"
          >
            <Input
              placeholder="in_progress"
              disabled={editingStatus && ['draft', 'active', 'expired', 'terminated'].includes(editingStatus.code)}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название статуса"
            rules={[{ required: true, message: 'Введите название статуса' }]}
          >
            <Input placeholder="В процессе" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет статуса"
            rules={[{ required: true, message: 'Выберите цвет' }]}
          >
            <ColorPicker
              showText
              format="hex"
              defaultValue="#1890ff"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea
              rows={3}
              placeholder="Описание статуса и когда он применяется"
            />
          </Form.Item>

        </Form>
      </Modal>
    </>
  )
}