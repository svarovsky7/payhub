import React, { useState, useEffect } from 'react'
import { Button, Modal, Form, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { supabase } from '../../../lib/supabase'
import { TypeTable } from './TypeTable'
import { TypeForm } from './TypeForm'

interface TypeRecord {
  id: number
  name: string
  code?: string
  is_active?: boolean
  created_at: string
  updated_at?: string
}

interface TypeManagerProps {
  typeCategory: 'invoice' | 'payment'
}

export const TypeManager: React.FC<TypeManagerProps> = ({ typeCategory }) => {
  const [types, setTypes] = useState<TypeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TypeRecord | null>(null)
  const [form] = Form.useForm()

  const tableName = typeCategory === 'invoice' ? 'invoice_types' : 'payment_types'
  const typeName = typeCategory === 'invoice' ? 'счёта' : 'платежа'
  const entityName = typeCategory === 'invoice' ? 'тип счёта' : 'тип платежа'

  useEffect(() => {
    loadTypes()
  }, [typeCategory])

  const loadTypes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      setTypes(data || [])
    } catch (error) {
      console.error(`[TypeManager.loadTypes] Error loading ${typeCategory} types:`, error)
      message.error(`Ошибка загрузки типов ${typeName}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    form.resetFields()

    const maxId = types.reduce((max, item) => Math.max(max, item.id), 0)
    form.setFieldsValue({ id: maxId + 1 })

    setIsModalVisible(true)
  }

  const handleEdit = (record: TypeRecord) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[TypeManager.handleSubmit] Start with values:', values)

    const formValues: any = {
      ...values,
      id: parseInt(values.id, 10)
    }

    if (typeCategory === 'payment') {
      delete formValues.is_active
    }

    try {
      // Check code uniqueness
      if (!editingRecord || editingRecord.code !== formValues.code) {
        const { data: existingWithCode } = await supabase
          .from(tableName)
          .select('id, code')
          .eq('code', formValues.code)
          .maybeSingle()

        if (existingWithCode && (!editingRecord || existingWithCode.id !== editingRecord.id)) {
          message.error(`Код "${formValues.code}" уже используется. Пожалуйста, выберите другой код.`)
          return
        }
      }

      if (editingRecord) {
        await handleUpdate(formValues)
      } else {
        await handleInsert(formValues)
      }

      setIsModalVisible(false)
      loadTypes()
    } catch (error: any) {
      handleSubmitError(error, formValues)
    }
  }

  const handleUpdate = async (formValues: any) => {
    if (!editingRecord) return

    if (formValues.id !== editingRecord.id) {
      await handleIdChange(formValues)
    } else {
      const { id, ...dataWithoutId } = formValues
      const { error } = await supabase
        .from(tableName)
        .update(dataWithoutId)
        .eq('id', editingRecord.id)

      if (error) throw error
      message.success(`Тип ${typeName} обновлен`)
    }
  }

  const handleIdChange = async (formValues: any) => {
    if (!editingRecord) return

    console.log('[TypeManager.handleIdChange] ID changed from', editingRecord.id, 'to', formValues.id)

    // Check if new ID exists
    const { data: existingRecord } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', formValues.id)
      .maybeSingle()

    if (existingRecord) {
      message.error(`ID ${formValues.id} уже существует`)
      return
    }

    const relatedTable = typeCategory === 'invoice' ? 'invoices' : 'payments'
    const relatedField = typeCategory === 'invoice' ? 'invoice_type_id' : 'payment_type_id'

    // Check related records
    const { data: relatedRecords, error: relatedError } = await supabase
      .from(relatedTable)
      .select('id')
      .eq(relatedField, editingRecord.id)

    if (relatedError) throw relatedError

    // Create new record
    const { error: insertError } = await supabase
      .from(tableName)
      .insert([formValues])

    if (insertError) throw insertError

    // Update related records
    if (relatedRecords && relatedRecords.length > 0) {
      const { error: updateRelatedError } = await supabase
        .from(relatedTable)
        .update({ [relatedField]: formValues.id })
        .eq(relatedField, editingRecord.id)

      if (updateRelatedError) {
        // Rollback
        await supabase.from(tableName).delete().eq('id', formValues.id)
        throw updateRelatedError
      }
    }

    // Delete old record
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', editingRecord.id)

    if (deleteError) {
      // Rollback all changes
      await supabase.from(tableName).delete().eq('id', formValues.id)
      if (relatedRecords && relatedRecords.length > 0) {
        await supabase
          .from(relatedTable)
          .update({ [relatedField]: editingRecord.id })
          .eq(relatedField, formValues.id)
      }
      throw deleteError
    }

    message.success(`Тип ${typeName} обновлен с новым ID. ${relatedRecords?.length || 0} связанных записей обновлено.`)
  }

  const handleInsert = async (formValues: any) => {
    const { error } = await supabase
      .from(tableName)
      .insert([formValues])

    if (error) throw error
    message.success(`Тип ${typeName} создан`)
  }

  const handleSubmitError = (error: any, formValues: any) => {
    console.error('[TypeManager.handleSubmit] Error:', error)

    if (error.code === '23503') {
      const match = error.details?.match(/table "(\w+)"/)
      const relatedTable = match ? match[1] : 'связанных записей'
      message.error(`Невозможно изменить ID: тип используется в таблице ${relatedTable}`)
    } else if (error.code === '23505') {
      if (error.details?.includes('code')) {
        message.error(`Код "${formValues.code}" уже существует`)
      } else if (error.details?.includes('id')) {
        message.error(`ID ${formValues.id} уже существует`)
      } else {
        message.error('Запись с такими данными уже существует')
      }
    } else {
      message.error(error.message || `Ошибка сохранения типа ${typeName}`)
    }
  }

  const handleDelete = async (id: number) => {
    const relatedTable = typeCategory === 'invoice' ? 'invoices' : 'payments'
    const relatedField = typeCategory === 'invoice' ? 'invoice_type_id' : 'payment_type_id'

    Modal.confirm({
      title: `Удалить ${entityName}?`,
      content: `Это действие нельзя отменить. Для удаления типа не должно быть связанных записей.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          // Check related records
          const { data: relatedData } = await supabase
            .from(relatedTable)
            .select('id')
            .eq(relatedField, id)
            .limit(1)

          if (relatedData && relatedData.length > 0) {
            message.warning(`Невозможно удалить ${entityName}, так как есть связанные записи`)
            return
          }

          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

          if (error) throw error
          message.success(`Тип ${typeName} удален`)
          loadTypes()
        } catch (error: any) {
          console.error('[TypeManager.handleDelete] Error:', error)
          message.error(error.message || `Ошибка удаления типа ${typeName}`)
        }
      }
    })
  }

  const getModalTitle = () => {
    return editingRecord
      ? `Редактирование типа ${typeName}`
      : `Создание типа ${typeName}`
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить {entityName}
        </Button>
      </div>

      <TypeTable
        dataSource={types}
        loading={loading}
        typeCategory={typeCategory}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        title={getModalTitle()}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <TypeForm
          form={form}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalVisible(false)}
          isEditing={!!editingRecord}
          typeCategory={typeCategory}
        />
      </Modal>
    </div>
  )
}