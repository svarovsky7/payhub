import { supabase } from '../lib/supabase'
import { message } from 'antd'

export interface MaterialClass {
  id: number
  name: string
  parent_id?: number | null
  level?: number
  parent_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Load all material classes with hierarchy
export const loadMaterialClasses = async () => {

  try {
    const { data, error } = await supabase
      .from('material_classes')
      .select(`
        *,
        parent:parent_id (
          id,
          name
        )
      `)
      .order('level')
      .order('name')

    if (error) throw error

    // Transform data to include parent_name
    const transformedData = (data || []).map(item => ({
      ...item,
      parent_name: item.parent?.name || null,
      parent: undefined // Remove nested parent object
    }))

    return transformedData
  } catch (error) {
    console.error('[MaterialClassOperations.loadMaterialClasses] Error:', error)
    message.error('Ошибка загрузки классификатора материалов')
    return []
  }
}

// Create material class
export const createMaterialClass = async (materialClass: Partial<MaterialClass>) => {

  try {
    const { data, error } = await supabase
      .from('material_classes')
      .insert({
        name: materialClass.name,
        parent_id: materialClass.parent_id || null,
        is_active: materialClass.is_active ?? true
      })
      .select()
      .single()

    if (error) throw error

    message.success('Класс материалов успешно создан')
    return data
  } catch (error: any) {
    console.error('[MaterialClassOperations.createMaterialClass] Error:', error)
    if (error.code === '23505') {
      if (error.message.includes('name')) {
        message.error('Класс материалов с таким названием уже существует')
      } else {
        message.error('Такой класс материалов уже существует')
      }
    } else {
      message.error('Ошибка создания класса материалов')
    }
    throw error
  }
}

// Update material class
export const updateMaterialClass = async (id: number, materialClass: Partial<MaterialClass>) => {

  try {
    const { data, error } = await supabase
      .from('material_classes')
      .update({
        name: materialClass.name,
        parent_id: materialClass.parent_id,
        is_active: materialClass.is_active
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    message.success('Класс материалов успешно обновлен')
    return data
  } catch (error: any) {
    console.error('[MaterialClassOperations.updateMaterialClass] Error:', error)
    if (error.code === '23505') {
      if (error.message.includes('name')) {
        message.error('Класс материалов с таким названием уже существует')
      } else {
        message.error('Такой класс материалов уже существует')
      }
    } else {
      message.error('Ошибка обновления класса материалов')
    }
    throw error
  }
}

// Delete material class
export const deleteMaterialClass = async (id: number) => {

  try {
    const { error } = await supabase
      .from('material_classes')
      .delete()
      .eq('id', id)

    if (error) throw error

    message.success('Класс материалов успешно удален')
  } catch (error) {
    console.error('[MaterialClassOperations.deleteMaterialClass] Error:', error)
    message.error('Ошибка удаления класса материалов')
    throw error
  }
}

// Toggle material class active status
export const toggleMaterialClassActive = async (id: number, is_active: boolean) => {

  try {
    const { data, error } = await supabase
      .from('material_classes')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    message.success(is_active ? 'Класс материалов активирован' : 'Класс материалов деактивирован')
    return data
  } catch (error) {
    console.error('[MaterialClassOperations.toggleMaterialClassActive] Error:', error)
    message.error('Ошибка изменения статуса класса материалов')
    throw error
  }
}

// Load subclasses of a specific class
export const loadSubclasses = async (parentId: number) => {
  try {
    const { data, error } = await supabase
      .from('material_classes')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[MaterialClassOperations.loadSubclasses] Error:', error)
    return []
  }
}