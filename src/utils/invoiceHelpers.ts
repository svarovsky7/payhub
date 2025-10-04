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

// Функция форматирования сумм в миллионах рублей
export const formatAmountInMillions = (value: number | string | undefined): string => {
  if (!value && value !== 0) return '0,00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0,00'

  // Делим на миллион и форматируем
  const millions = num / 1000000
  return millions.toLocaleString('ru-RU', {
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
  _invoiceDate: Dayjs, // Не используется, расчет идет от текущей даты
  deliveryDays: number,
  deliveryType: 'working' | 'calendar'
): Dayjs => {
  // ВАЖНО: Начинаем с текущей даты (сегодня), а не с даты счета
  const today = dayjs()

  // Шаг 1: Находим следующий рабочий день от сегодня
  let nextWorkingDay = today.add(1, 'day')
  while (nextWorkingDay.day() === 0 || nextWorkingDay.day() === 6) {
    nextWorkingDay = nextWorkingDay.add(1, 'day')
  }

  // Шаг 2: От следующего рабочего дня добавляем указанное количество дней
  if (deliveryType === 'working') {
    return addWorkingDays(nextWorkingDay, deliveryDays)
  } else {
    return nextWorkingDay.add(deliveryDays, 'day')
  }
}