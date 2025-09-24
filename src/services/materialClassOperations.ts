import { supabase } from '../lib/supabase'
import { message } from 'antd'

export interface MaterialClass {
  id: number
  code: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Load all material classes
export const loadMaterialClasses = async () => {

  try {
    const { data, error } = await supabase
      .from('material_classes')
      .select('*')
      .order('code')

    if (error) throw error

    return data || []
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
        code: materialClass.code,
        name: materialClass.name,
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
      if (error.message.includes('code')) {
        message.error('Класс материалов с таким кодом уже существует')
      } else if (error.message.includes('name')) {
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
        code: materialClass.code,
        name: materialClass.name,
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
      if (error.message.includes('code')) {
        message.error('Класс материалов с таким кодом уже существует')
      } else if (error.message.includes('name')) {
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