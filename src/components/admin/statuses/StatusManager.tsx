import React, { useState, useEffect } from 'react'
import { Button, Modal, Form, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { supabase } from '../../../lib/supabase'
import { StatusTable } from './StatusTable'
import { StatusForm } from './StatusForm'

interface StatusManagerProps {
  type: 'invoice' | 'payment' | 'contract'
  tableName: string
  title: string
}

export const StatusManager: React.FC<StatusManagerProps> = ({
  type,
  tableName,
  title
}) => {
  const { message: messageApi, modal } = App.useApp()
  const [form] = Form.useForm()
  const [statuses, setStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStatus, setEditingStatus] = useState<any | null>(null)

  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name')

      if (error) throw error

      setStatuses(data || [])
    } catch (error) {
      console.error(`[StatusManager.loadStatuses] Error loading ${type} statuses:`, error)
      messageApi.error(`Ошибка загрузки статусов ${title}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingStatus(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 100 })
    setIsModalVisible(true)
  }

  const handleEdit = (record: any) => {
    setEditingStatus(record)

    // Special handling for contract statuses color mapping
    if (type === 'contract' && record.color) {
      const hexToTag: { [key: string]: string } = {
        '#d9d9d9': 'default',
        '#52c41a': 'success',
        '#1890ff': 'processing',
        '#faad14': 'warning',
        '#f5222d': 'error',
        '#13c2c2': 'cyan',
        '#722ed1': 'purple',
        '#eb2f96': 'magenta',
        '#a0d911': 'lime'
      }

      const colorValue = record.color
        ? (hexToTag[record.color.toLowerCase()] || 'default')
        : 'default'

      form.setFieldsValue({
        ...record,
        color: colorValue
      })
    } else {
      form.setFieldsValue(record)
    }

    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      // Special handling for contract statuses color mapping
      let submitData = values
      if (type === 'contract') {
        const colorMapping: { [key: string]: string } = {
          'default': '#d9d9d9',
          'success': '#52c41a',
          'processing': '#1890ff',
          'warning': '#faad14',
          'error': '#f5222d',
          'cyan': '#13c2c2',
          'purple': '#722ed1',
          'magenta': '#eb2f96',
          'gold': '#faad14',
          'lime': '#a0d911'
        }

        submitData = {
          ...values,
          color: colorMapping[values.color] || values.color || '#1890ff'
        }
      }

      if (editingStatus) {
        const { error } = await supabase
          .from(tableName)
          .update(submitData)
          .eq('id', editingStatus.id)

        if (error) throw error
        messageApi.success(`Статус ${title} обновлён`)
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([submitData])

        if (error) throw error
        messageApi.success(`Статус ${title} создан`)
      }

      setIsModalVisible(false)
      loadStatuses()
    } catch (error: any) {
      console.error(`[StatusManager.handleSubmit] Error saving ${type} status:`, error)
      if (error.code === '23505') {
        messageApi.error('Статус с таким кодом уже существует')
      } else {
        messageApi.error(error.message || `Ошибка сохранения статуса ${title}`)
      }
    }
  }

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: `Удалить статус ${title}?`,
      content: type === 'contract'
        ? 'Это действие нельзя отменить.'
        : `Это действие нельзя отменить. Все ${type === 'invoice' ? 'счета' : 'платежи'} с этим статусом останутся без статуса.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          // Special check for contract statuses
          if (type === 'contract') {
            const { data: contracts, error: checkError } = await supabase
              .from('contracts')
              .select('id')
              .eq('status_id', id)
              .limit(1)

            if (checkError) throw checkError

            if (contracts && contracts.length > 0) {
              messageApi.error('Невозможно удалить статус, который используется в договорах')
              return
            }
          }

          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

          if (error) throw error
          messageApi.success(`Статус ${title} удалён`)
          loadStatuses()
        } catch (error: any) {
          console.error(`[StatusManager.handleDelete] Error deleting ${type} status:`, error)
          if (error.code === '23503') {
            const entityName = type === 'invoice' ? 'счетах' : type === 'payment' ? 'платежах' : 'договорах'
            messageApi.error(`Невозможно удалить статус, так как он используется в ${entityName}`)
          } else {
            messageApi.error(`Ошибка удаления статуса ${title}`)
          }
        }
      }
    })
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить статус {title}
        </Button>
      </div>

      <StatusTable
        dataSource={statuses}
        loading={loading}
        type={type}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        title={editingStatus ? `Редактировать статус ${title}` : `Создать статус ${title}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <StatusForm
          form={form}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalVisible(false)}
          isEditing={!!editingStatus}
        />
      </Modal>
    </>
  )
}