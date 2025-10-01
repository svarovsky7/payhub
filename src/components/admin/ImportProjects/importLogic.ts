import { message } from 'antd'
import { supabase } from '../../../lib/supabase'
import type { ProjectData } from './excelParser'

export interface ImportResult {
  row: number
  code: string
  name: string
  description: string
  status: 'success' | 'skip' | 'error'
  message?: string
}

// Проверка на дубликаты в базе данных
export const checkDuplicates = async (
  projects: ProjectData[]
): Promise<{ codes: string[], names: string[] }> => {
  const codes = projects.map(p => p.code).filter(c => c)
  const names = projects.map(p => p.name).filter(n => n)

  if (codes.length === 0 && names.length === 0) {
    return { codes: [], names: [] }
  }

  const { data: existingProjects } = await supabase
    .from('projects')
    .select('code, name')
    .or(`code.in.(${codes.join(',')}),name.in.(${names.map(n => `"${n}"`).join(',')})`)

  const existingCodes = existingProjects?.map(p => p.code).filter(Boolean) || []
  const existingNames = existingProjects?.map(p => p.name) || []

  return { codes: existingCodes, names: existingNames }
}

// Импорт данных в базу
export const importProjects = async (
  parsedData: ProjectData[],
  duplicateCheck: { codes: string[], names: string[] },
  userId?: string
): Promise<ImportResult[]> => {
  const results: ImportResult[] = []

  for (let i = 0; i < parsedData.length; i++) {
    const project = parsedData[i]
    const row = i + 2 // +2 потому что строка 1 - заголовки, нумерация с 1

    try {
      // Проверяем на дубликаты
      if (duplicateCheck.codes.includes(project.code) || duplicateCheck.names.includes(project.name)) {
        results.push({
          row,
          code: project.code,
          name: project.name,
          description: project.description || '',
          status: 'skip',
          message: 'Проект уже существует'
        })
        continue
      }

      // Добавляем проект в базу
      const { error } = await supabase
        .from('projects')
        .insert([{
          code: project.code || null,
          name: project.name,
          description: project.description || null,
          is_active: project.is_active,
          created_by: userId
        }])

      if (error) throw error

      results.push({
        row,
        code: project.code,
        name: project.name,
        description: project.description || '',
        status: 'success',
        message: 'Успешно импортирован'
      })

      // Добавляем в список дубликатов для последующих проверок
      if (project.code) duplicateCheck.codes.push(project.code)
      duplicateCheck.names.push(project.name)

    } catch (error) {
      console.error(`[importLogic.importProjects] Error on row ${row}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при импорте'
      results.push({
        row,
        code: project.code,
        name: project.name,
        description: project.description || '',
        status: 'error',
        message: errorMessage
      })
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  const skipCount = results.filter(r => r.status === 'skip').length
  const errorCount = results.filter(r => r.status === 'error').length

  if (successCount > 0) {
    message.success(`Успешно импортировано: ${successCount} проектов`)
  }
  if (skipCount > 0) {
    message.warning(`Пропущено (уже существуют): ${skipCount} проектов`)
  }
  if (errorCount > 0) {
    message.error(`Ошибки при импорте: ${errorCount} проектов`)
  }

  return results
}
