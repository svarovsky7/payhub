// Функция для обработки ИНН в научной нотации
const processINN = (innValue: string): string => {
  console.log('[ImportContractorsUtils.processINN] Input:', innValue)

  // Если значение содержит 'E+', это научная нотация
  if (innValue.includes('E+') || innValue.includes('e+')) {
    console.log('[ImportContractorsUtils.processINN] Scientific notation detected')
    // Преобразуем научную нотацию в обычное число
    const num = parseFloat(innValue)
    const result = Math.round(num).toString()
    console.log('[ImportContractorsUtils.processINN] Converted from scientific:', result)
    return result
  }

  // Убираем все пробелы и нечисловые символы кроме цифр
  const cleaned = innValue.replace(/[^\d]/g, '')
  console.log('[ImportContractorsUtils.processINN] Cleaned:', cleaned)
  return cleaned
}

// Функция для очистки названия компании
const cleanCompanyName = (name: string): string => {
  return name
    .replace(/^\uFEFF/, '') // Убираем BOM (Byte Order Mark)
    .replace(/^["'«»""]|["'«»""]$/g, '') // Убираем кавычки в начале и конце
    .trim()
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .replace(/;/g, '') // Убираем точки с запятой
    .trim()
}

export interface ParsedContractor {
  key: number
  line: number
  name: string
  inn: string
  originalInn: string
  error: string | null
  valid: boolean
}

// Парсинг CSV контента
export const parseCSVContent = (content: string): ParsedContractor[] => {
  console.log('[ImportContractorsUtils.parseCSVContent] Starting parse, content length:', content?.length)

  if (!content) {
    console.error('[ImportContractorsUtils.parseCSVContent] Content is empty!')
    throw new Error('Файл пустой')
  }

  // Убираем BOM из начала файла, если он есть
  const cleanContent = content.replace(/^\uFEFF/, '')
  console.log('[ImportContractorsUtils.parseCSVContent] BOM removed, clean content starts with:', cleanContent.substring(0, 50))

  const lines = cleanContent.split('\n')
  console.log('[ImportContractorsUtils.parseCSVContent] Lines count:', lines.length)

  if (lines.length < 2) {
    console.error('[ImportContractorsUtils.parseCSVContent] Not enough lines in file')
    throw new Error('Файл не содержит данных')
  }

  const headers = lines[0].split(';').map(h => h.trim())
  console.log('[ImportContractorsUtils.parseCSVContent] Headers:', headers)

  const contractors: ParsedContractor[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      console.log(`[ImportContractorsUtils.parseCSVContent] Line ${i + 1} is empty, skipping`)
      continue
    }

    const values = line.split(';')
    console.log(`[ImportContractorsUtils.parseCSVContent] Line ${i + 1} values:`, values)

    if (values.length < 2) {
      console.warn(`[ImportContractorsUtils.parseCSVContent] Line ${i + 1} has insufficient values:`, values)
      continue
    }

    const name = cleanCompanyName(values[0])
    const originalInn = values[1]
    const inn = processINN(values[1])

    console.log(`[ImportContractorsUtils.parseCSVContent] Line ${i + 1} processed:`, {
      name,
      originalInn,
      processedInn: inn
    })

    // Валидация ИНН
    let error = null
    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      error = `Некорректный ИНН (должен быть 10 или 12 цифр, получено: ${inn ? inn.length : 0})`
      console.warn(`[ImportContractorsUtils.parseCSVContent] Line ${i + 1} validation error:`, error)
    }

    contractors.push({
      key: i,
      line: i + 1,
      name: name,
      inn: inn,
      originalInn: originalInn,
      error: error,
      valid: !error
    })
  }

  console.log('[ImportContractorsUtils.parseCSVContent] Parsed contractors:', {
    total: contractors.length,
    valid: contractors.filter(c => c.valid).length,
    invalid: contractors.filter(c => !c.valid).length
  })

  return contractors
}