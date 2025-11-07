import * as XLSX from 'xlsx'
import type { Letter } from '../lib/supabase'
import dayjs from 'dayjs'

export const exportLettersToExcel = (letters: Letter[]) => {
  const flattenLetters = (lettersList: Letter[]): Letter[] => {
    const result: Letter[] = []
    lettersList.forEach(letter => {
      result.push(letter)
      if (letter.children) {
        result.push(...flattenLetters(letter.children))
      }
    })
    return result
  }

  const allLetters = flattenLetters(letters)

  const data = allLetters.map(letter => ({
    'Направление': letter.direction === 'incoming' ? 'Входящее' : 'Исходящее',
    'Номер письма': letter.number || '',
    'Рег. номер': letter.reg_number || '',
    'Дата письма': letter.letter_date ? dayjs(letter.letter_date).format('DD.MM.YYYY') : '',
    'Дата регистрации': letter.reg_date ? dayjs(letter.reg_date).format('DD.MM.YYYY') : '',
    'Тема': letter.subject || '',
    'Содержание': letter.content || '',
    'Отправитель': letter.sender_type === 'contractor' 
      ? letter.sender_contractor?.name || '' 
      : letter.sender || '',
    'Получатель': letter.recipient_type === 'contractor' 
      ? letter.recipient_contractor?.name || '' 
      : letter.recipient || '',
    'Проект': letter.project?.name || '',
    'Ответственный': letter.responsible_user?.full_name || letter.responsible_person_name || '',
    'Создатель': letter.creator?.full_name || '',
    'Статус': letter.status?.name || '',
    'Способ доставки': letter.delivery_method || '',
    'Срок ответа': letter.response_deadline ? dayjs(letter.response_deadline).format('DD.MM.YYYY') : '',
    'Количество файлов': (letter.letter_attachments?.length || 0) > 0 ? (letter.letter_attachments?.[0]?.count || 0) : 0,
    'Дата создания': letter.created_at ? dayjs(letter.created_at).format('DD.MM.YYYY HH:mm') : '',
    'Дата обновления': letter.updated_at ? dayjs(letter.updated_at).format('DD.MM.YYYY HH:mm') : ''
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Письма')

  // Auto-size columns with max width limit
  const MAX_COL_WIDTH = 50
  const MIN_COL_WIDTH = 10
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key as keyof typeof row] || '').length)
    )
    return {
      wch: Math.min(Math.max(maxLength, MIN_COL_WIDTH), MAX_COL_WIDTH)
    }
  })
  ws['!cols'] = colWidths

  // Enable text wrapping for all cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[cellAddress]) continue
      if (!ws[cellAddress].s) ws[cellAddress].s = {}
      ws[cellAddress].s.alignment = { wrapText: true, vertical: 'top' }
    }
  }

  const fileName = `Письма_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

