import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

// Настраиваем dayjs для работы с русской локалью
import customParseFormat from 'dayjs/plugin/customParseFormat'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import 'dayjs/locale/ru'

dayjs.extend(customParseFormat)
dayjs.extend(weekday)
dayjs.extend(localeData)
dayjs.locale('ru')

// Функция форматирования сумм
export const formatAmount = (value: number | string | undefined): string => {
  if (!value && value !== 0) return '0,00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0,00'

  // Форматируем с 2 знаками после запятой и разделителями разрядов
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Функция парсинга введенной суммы
export const parseAmount = (value: string | undefined): number => {
  if (!value) return 0
  // Удаляем все пробелы (включая неразрывные) и заменяем запятую на точку
  const cleaned = value.toString().replace(/[\s\u00A0]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  // Округляем до 2 знаков после запятой для избежания проблем с плавающей точкой
  return isNaN(num) ? 0 : Math.round(num * 100) / 100
}

// Функция для добавления рабочих дней к дате
const addWorkingDays = (startDate: Dayjs, days: number): Dayjs => {
  let date = startDate
  let workingDaysAdded = 0

  while (workingDaysAdded < days) {
    date = date.add(1, 'day')
    // Пропускаем выходные (суббота = 6, воскресенье = 0)
    if (date.day() !== 0 && date.day() !== 6) {
      workingDaysAdded++
    }
  }

  return date
}

// Функция расчета предварительной даты поставки
export const calculateDeliveryDate = (
  invoiceDate: Dayjs,
  deliveryDays: number,
  deliveryType: 'working' | 'calendar'
): Dayjs => {
  // Начинаем со следующего рабочего дня после даты счета
  let startDate = invoiceDate.add(1, 'day')

  // Если следующий день - выходной, переносим на понедельник
  while (startDate.day() === 0 || startDate.day() === 6) {
    startDate = startDate.add(1, 'day')
  }

  // Добавляем указанное количество дней
  if (deliveryType === 'working') {
    return addWorkingDays(startDate, deliveryDays - 1) // -1 так как уже перешли на следующий рабочий день
  } else {
    return startDate.add(deliveryDays - 1, 'day')
  }
}