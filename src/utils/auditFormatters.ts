import dayjs from 'dayjs'

export const fieldNameMap: Record<string, string> = {
  invoice_number: 'Номер счета',
  invoice_date: 'Дата счета',
  amount_with_vat: 'Сумма с НДС',
  vat_rate: 'Ставка НДС (%)',
  vat_amount: 'Сумма НДС',
  amount_without_vat: 'Сумма без НДС',
  status_id: 'Статус',
  payer_id: 'Плательщик',
  supplier_id: 'Поставщик',
  project_id: 'Проект',
  contract_id: 'Договор',
  responsible_id: 'Ответственный менеджер снабжения',
  material_request_id: 'Заявка на материалы',
  delivery_cost: 'Стоимость доставки',
  delivery_days: 'Срок поставки (дни)',
  delivery_days_type: 'Тип дней поставки',
  preliminary_delivery_date: 'Предварительная дата поставки',
  due_date: 'Срок оплаты',
  description: 'Описание',
  is_archived: 'Архивирован',
  payment_number: 'Номер платежа',
  payment_date: 'Дата платежа',
  amount: 'Сумма',
  payment_type_id: 'Тип платежа',
  allocated_amount: 'Распределенная сумма',
  number: 'Номер письма',
  reg_number: 'Регистрационный номер',
  letter_date: 'Дата письма',
  reg_date: 'Дата регистрации',
  response_deadline: 'Регламентный срок ответа',
  subject: 'Тема',
  content: 'Содержание',
  sender: 'Отправитель',
  recipient: 'Получатель',
  direction: 'Направление',
  delivery_method: 'Способ доставки/отправки',
  responsible_user_id: 'Ответственный пользователь',
  responsible_person_name: 'Ответственный',
  sender_type: 'Тип отправителя',
  sender_contractor_id: 'Контрагент-отправитель',
  recipient_type: 'Тип получателя',
  recipient_contractor_id: 'Контрагент-получатель',
}

const MONEY_FIELDS = [
  'amount_with_vat',
  'vat_amount',
  'amount_without_vat',
  'amount',
  'allocated_amount',
  'delivery_cost',
]

export function formatFieldValue(value: string | undefined, fieldName?: string): string {
  if (!value) return '—'

  if (fieldName === 'vat_rate') {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      return `${numValue}%`
    }
  }

  if (fieldName === 'delivery_days_type') {
    return value === 'working' ? 'Рабочие дни' : 'Календарные дни'
  }

  if (fieldName === 'direction') {
    return value === 'incoming' ? 'Входящее' : value === 'outgoing' ? 'Исходящее' : value
  }

  if (fieldName === 'sender_type' || fieldName === 'recipient_type') {
    return value === 'contractor' ? 'Контрагент' : value === 'individual' ? 'Физ. лицо' : value
  }

  if (fieldName && MONEY_FIELDS.includes(fieldName)) {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue)
    }
  }

  if (dayjs(value, 'YYYY-MM-DD', true).isValid()) {
    return dayjs(value).format('DD.MM.YYYY')
  }

  if (value === 'true') return 'Да'
  if (value === 'false') return 'Нет'

  return value
}

