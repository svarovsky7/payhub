import { supabase } from '../lib/supabase'
import { message } from 'antd'
import { isErrorWithCode } from '../types/common'

export interface Department {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Position {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: number
  last_name: string
  first_name: string
  middle_name?: string
  full_name?: string
  department_id?: number
  position_id?: number
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
  department?: Department
  position?: Position
}

// Departments CRUD
export const loadDepartments = async () => {

  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[EmployeeOperations.loadDepartments] Error:', error)
    message.error('Ошибка загрузки отделов')
    return []
  }
}

export const createDepartment = async (name: string, description?: string) => {

  try {
    const { data, error } = await supabase
      .from('departments')
      .insert({ name, description })
      .select()
      .single()

    if (error) throw error

    message.success('Отдел успешно создан')
    return data
  } catch (error: unknown) {
    console.error('[EmployeeOperations.createDepartment] Error:', error)
    if (isErrorWithCode(error) && error.code === '23505') {
      message.error('Отдел с таким названием уже существует')
    } else {
      message.error('Ошибка создания отдела')
    }
    throw error
  }
}

export const updateDepartment = async (id: number, name: string, description?: string) => {

  try {
    const { data, error } = await supabase
      .from('departments')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    message.success('Отдел успешно обновлен')
    return data
  } catch (error: unknown) {
    console.error('[EmployeeOperations.updateDepartment] Error:', error)
    if (isErrorWithCode(error) && error.code === '23505') {
      message.error('Отдел с таким названием уже существует')
    } else {
      message.error('Ошибка обновления отдела')
    }
    throw error
  }
}

export const deleteDepartment = async (id: number) => {

  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)

    if (error) throw error

    message.success('Отдел успешно удален')
  } catch (error) {
    console.error('[EmployeeOperations.deleteDepartment] Error:', error)
    message.error('Ошибка удаления отдела')
    throw error
  }
}

// Positions CRUD
export const loadPositions = async () => {

  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('name')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[EmployeeOperations.loadPositions] Error:', error)
    message.error('Ошибка загрузки должностей')
    return []
  }
}

export const createPosition = async (name: string, description?: string) => {

  try {
    const { data, error } = await supabase
      .from('positions')
      .insert({ name, description })
      .select()
      .single()

    if (error) throw error

    message.success('Должность успешно создана')
    return data
  } catch (error: unknown) {
    console.error('[EmployeeOperations.createPosition] Error:', error)
    if (isErrorWithCode(error) && error.code === '23505') {
      message.error('Должность с таким названием уже существует')
    } else {
      message.error('Ошибка создания должности')
    }
    throw error
  }
}

export const updatePosition = async (id: number, name: string, description?: string) => {

  try {
    const { data, error } = await supabase
      .from('positions')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    message.success('Должность успешно обновлена')
    return data
  } catch (error: unknown) {
    console.error('[EmployeeOperations.updatePosition] Error:', error)
    if (isErrorWithCode(error) && error.code === '23505') {
      message.error('Должность с таким названием уже существует')
    } else {
      message.error('Ошибка обновления должности')
    }
    throw error
  }
}

export const deletePosition = async (id: number) => {

  try {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id)

    if (error) throw error

    message.success('Должность успешно удалена')
  } catch (error) {
    console.error('[EmployeeOperations.deletePosition] Error:', error)
    message.error('Ошибка удаления должности')
    throw error
  }
}

// Employees CRUD
export const loadEmployees = async () => {

  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .order('full_name')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[EmployeeOperations.loadEmployees] Error:', error)
    message.error('Ошибка загрузки сотрудников')
    return []
  }
}

export const createEmployee = async (employee: Partial<Employee>, userId: string) => {

  try {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...employee,
        created_by: userId
      })
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .single()

    if (error) throw error

    message.success('Сотрудник успешно добавлен')
    return data
  } catch (error: unknown) {
    console.error('[EmployeeOperations.createEmployee] Error:', error)
    if (isErrorWithCode(error) && error.code === '23505') {
      message.error('Сотрудник с таким email уже существует')
    } else {
      message.error('Ошибка добавления сотрудника')
    }
    throw error
  }
}

export const updateEmployee = async (id: number, employee: Partial<Employee>) => {

  try {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .single()

    if (error) throw error

    message.success('Данные сотрудника успешно обновлены')
    return data
  } catch (error: unknown) {
    console.error('[EmployeeOperations.updateEmployee] Error:', error)
    if (isErrorWithCode(error) && error.code === '23505') {
      message.error('Сотрудник с таким email уже существует')
    } else {
      message.error('Ошибка обновления данных сотрудника')
    }
    throw error
  }
}

export const deleteEmployee = async (id: number) => {

  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)

    if (error) throw error

    message.success('Сотрудник успешно удален')
  } catch (error) {
    console.error('[EmployeeOperations.deleteEmployee] Error:', error)
    message.error('Ошибка удаления сотрудника')
    throw error
  }
}

// Helper function to toggle employee active status
export const toggleEmployeeStatus = async (id: number, is_active: boolean) => {

  try {
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active })
      .eq('id', id)
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .single()

    if (error) throw error

    message.success(is_active ? 'Сотрудник активирован' : 'Сотрудник деактивирован')
    return data
  } catch (error) {
    console.error('[EmployeeOperations.toggleEmployeeStatus] Error:', error)
    message.error('Ошибка изменения статуса сотрудника')
    throw error
  }
}

// Contractors CRUD
export const loadContractorsWithNames = async () => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Загружаем альтернативные названия отдельно с батчингом
    if (data && data.length > 0) {
      const contractorIds = data.map(c => c.id)
      const batchSize = 100
      const namesMap = new Map<number, any[]>()

      // Загружаем названия батчами по 100
      for (let i = 0; i < contractorIds.length; i += batchSize) {
        const batch = contractorIds.slice(i, i + batchSize)
        const { data: names, error: namesError } = await supabase
          .from('contractor_alternative_names')
          .select('*')
          .in('contractor_id', batch)

        if (!namesError && names) {
          names.forEach(name => {
            if (!namesMap.has(name.contractor_id)) {
              namesMap.set(name.contractor_id, [])
            }
            namesMap.get(name.contractor_id)!.push(name)
          })
        }
      }

      // Добавляем названия в контрагентов
      data.forEach(contractor => {
        contractor.alternative_names = namesMap.get(contractor.id) || []
      })
    }

    return data || []
  } catch (error) {
    console.error('[EmployeeOperations.loadContractorsWithNames] Error:', error)
    return []
  }
}

export const addContractorAlternativeName = async (
  contractorId: number,
  alternativeName: string,
  isPrimary = false
) => {
  try {
    const { data, error } = await supabase
      .from('contractor_alternative_names')
      .insert({
        contractor_id: contractorId,
        alternative_name: alternativeName,
        is_primary: isPrimary,
      })
      .select()
      .single()

    if (error) throw error
    message.success('Альтернативное название добавлено')
    return data
  } catch (error) {
    console.error('[EmployeeOperations.addContractorAlternativeName] Error:', error)
    message.error('Ошибка добавления названия')
    throw error
  }
}

export const updateContractorAlternativeName = async (
  nameId: number,
  alternativeName: string
) => {
  try {
    const { data, error } = await supabase
      .from('contractor_alternative_names')
      .update({ alternative_name: alternativeName })
      .eq('id', nameId)
      .select()
      .single()

    if (error) throw error
    message.success('Название обновлено')
    return data
  } catch (error) {
    console.error('[EmployeeOperations.updateContractorAlternativeName] Error:', error)
    message.error('Ошибка обновления названия')
    throw error
  }
}

export const deleteContractorAlternativeName = async (nameId: number) => {
  try {
    const { error } = await supabase
      .from('contractor_alternative_names')
      .delete()
      .eq('id', nameId)

    if (error) throw error
    message.success('Название удалено')
  } catch (error) {
    console.error('[EmployeeOperations.deleteContractorAlternativeName] Error:', error)
    message.error('Ошибка удаления названия')
    throw error
  }
}

export const setPrimaryContractorName = async (
  contractorId: number,
  nameId: number
) => {
  try {
    // First, unset all primary names for this contractor
    await supabase
      .from('contractor_alternative_names')
      .update({ is_primary: false })
      .eq('contractor_id', contractorId)

    // Then set the new primary name
    const { data, error } = await supabase
      .from('contractor_alternative_names')
      .update({ is_primary: true })
      .eq('id', nameId)
      .select()
      .single()

    if (error) throw error
    message.success('Основное название установлено')
    return data
  } catch (error) {
    console.error('[EmployeeOperations.setPrimaryContractorName] Error:', error)
    message.error('Ошибка установки основного названия')
    throw error
  }
}