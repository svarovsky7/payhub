import { message } from 'antd'
import * as XLSX from 'xlsx'

export interface ProjectData {
  code: string
  name: string
  description?: string
  is_active?: boolean
}

// Функция для очистки и нормализации строковых значений
const cleanString = (value: unknown): string => {
  if (!value) return ''
  return String(value)
    .replace(/^\uFEFF/, '') // Убираем BOM
    .trim()
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
}

// Обработка загруженного Excel файла
export const parseExcelFile = async (
  file: File | { originFileObj?: File; name?: string }
): Promise<ProjectData[] | null> => {
  const fileName = file instanceof File ? file.name : (file.name || 'unknown')
  console.log('[excelParser.parseExcelFile] Processing file:', fileName)

  const hideLoading = message.loading('Читаем Excel файл...', 0)

  try {
    // Определяем файл для чтения
    const fileToRead = file instanceof File ? file : file.originFileObj

    if (!fileToRead) {
      throw new Error('Не удалось получить файл')
    }

    // Читаем файл как ArrayBuffer
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            throw new Error('Не удалось прочитать файл')
          }

          // Парсим Excel файл
          const workbook = XLSX.read(data, { type: 'array' })

          // Берем первый лист
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // Преобразуем в JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false })

          console.log('[excelParser.parseExcelFile] Parsed data:', jsonData)

          // Логируем первую строку для отладки
          if (jsonData.length > 0) {
            const firstRow = jsonData[0] as Record<string, unknown>
            console.log('[excelParser.parseExcelFile] First row keys:', Object.keys(firstRow))
            console.log('[excelParser.parseExcelFile] First row data:', firstRow)
          }

          // Проверяем наличие данных
          if (!jsonData || jsonData.length === 0) {
            message.error('Файл не содержит данных')
            hideLoading()
            resolve(null)
            return
          }

          // Маппинг колонок Excel на поля базы данных
          const projects: ProjectData[] = (jsonData as Record<string, unknown>[]).map((row) => {
            // Получаем все ключи строки
            const keys = Object.keys(row)

            // Функция для поиска значения по возможным названиям колонок (case-insensitive)
            const findValue = (possibleNames: string[]): string => {
              for (const key of keys) {
                // Пропускаем ключи вида __EMPTY, __EMPTY_1 и т.д.
                if (key.startsWith('__EMPTY')) continue

                const normalizedKey = key.toLowerCase().trim()
                for (const name of possibleNames) {
                  if (normalizedKey.includes(name.toLowerCase())) {
                    return cleanString(row[key])
                  }
                }
              }
              return ''
            }

            // Если в Excel нет заголовков, используем колонки по индексам
            const values = Object.values(row).map(v => cleanString(v))

            // Пытаемся найти колонки по различным возможным названиям
            let code = findValue(['код', 'code', 'project code', 'номер', '№', 'шифр'])
            let name = findValue(['название', 'name', 'наименование', 'project', 'проект', 'объект'])
            let description = findValue(['описание', 'description', 'комментарий', 'comment', 'примечание', 'note'])

            // Если не нашли по названиям колонок, пробуем по индексам
            if (!code && !name && !description && values.length >= 2) {
              // Предполагаем: 1я колонка - код, 2я - название, 3я - описание
              code = values[0] || ''
              name = values[1] || ''
              description = values[2] || ''
            }

            // Если все еще нет названия, но есть хотя бы одно значение, берем первое непустое
            if (!name && values.length > 0) {
              const firstNonEmpty = values.find(v => v && v.length > 0)
              if (firstNonEmpty) {
                name = firstNonEmpty
              }
            }

            return {
              code,
              name,
              description,
              is_active: true
            }
          }).filter(p => p.name) // Фильтруем строки без названия

          if (projects.length === 0) {
            console.error('[excelParser.parseExcelFile] No projects found after mapping')
            console.error('[excelParser.parseExcelFile] Sample raw data:', jsonData.slice(0, 3))

            // Более информативное сообщение об ошибке
            message.error('Не найдено проектов для импорта. Убедитесь, что файл содержит колонку "Название" или данные расположены во второй колонке.', 10)
            hideLoading()
            resolve(null)
            return
          }

          message.success(`Загружено ${projects.length} проектов из файла`)
          hideLoading()
          resolve(projects)
        } catch (error) {
          console.error('[excelParser.parseExcelFile] Parse error:', error)
          message.error(`Ошибка чтения файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
          hideLoading()
          reject(error)
        }
      }

      reader.onerror = () => {
        hideLoading()
        message.error('Ошибка чтения файла')
        reject(new Error('Ошибка чтения файла'))
      }

      reader.readAsArrayBuffer(fileToRead)
    })
  } catch (error) {
    console.error('[excelParser.parseExcelFile] Error:', error)
    hideLoading()
    message.error('Ошибка при загрузке файла')
    return null
  }
}

// Скачать шаблон Excel
export const downloadTemplate = () => {
  const ws_data = [
    ['Код', 'Название', 'Описание'],
    ['PROJ-001', 'Проект 1', 'Описание проекта 1'],
    ['PROJ-002', 'Проект 2', 'Описание проекта 2']
  ]

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')

  // Устанавливаем ширину колонок
  ws['!cols'] = [
    { wch: 15 }, // Код
    { wch: 40 }, // Название
    { wch: 60 }  // Описание
  ]

  XLSX.writeFile(wb, 'projects_template.xlsx')
  message.success('Шаблон скачан')
}
