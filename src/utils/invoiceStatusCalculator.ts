// Утилиты для автоматического расчёта статуса счёта на основе платежей

// Допуск для сравнения сумм в рублях
const EPS = 10

// ID статусов счетов
// Используйте только эти официальные определения статусов!
export const INVOICE_STATUSES = {
  DRAFT: 1,      // draft (Черновик)
  PENDING: 2,    // pending (На согласовании)
  PARTIAL: 3,    // partial (Частично оплачен)
  PAID: 4,       // paid (Оплачен)
  CANCELLED: 5   // cancelled (Отменен)
}

// ID статусов платежей
// Используйте только эти официальные определения статусов!
export const PAYMENT_STATUSES = {
  CREATED: 1,    // created (Создан)
  PENDING: 2,    // pending (На согласовании)
  APPROVED: 3,   // approved (В оплате)
  PAID: 4,       // paid (Оплачен)
  CANCELLED: 5   // cancelled (Отменён)
}

interface Payment {
  status_id: number
  amount: number
}

/**
 * Рассчитывает новый статус счёта на основе платежей
 *
 * Правила приоритета (сверху вниз):
 * 0. Если счёт отменён (cancelled) - не меняем статус
 * 1. Полностью оплачен (paid) - если сумма платежей >= суммы счёта с учётом допуска
 * 2. Частично оплачен (partial) - если есть оплаченные платежи, но меньше суммы счёта
 * 3. На согласовании (pending) - если есть платежи в статусе pending или approved
 * 4. Черновик (draft) - во всех остальных случаях
 *
 * @param invoiceAmount - Сумма счёта с НДС
 * @param currentStatusId - Текущий статус счёта
 * @param payments - Массив платежей, связанных со счётом
 * @returns ID нового статуса счёта
 */
export function calculateInvoiceStatus(
  invoiceAmount: number,
  currentStatusId: number,
  payments: Payment[]
): number {
  // 0. Если счёт отменён - не меняем статус
  if (currentStatusId === INVOICE_STATUSES.CANCELLED) {
    return INVOICE_STATUSES.CANCELLED
  }

  // Считаем сумму оплаченных платежей
  const paidSum = payments
    .filter(p => p.status_id === PAYMENT_STATUSES.PAID)
    .reduce((sum, p) => sum + p.amount, 0)

  // Проверяем наличие платежей на согласовании или утверждённых
  const hasPendingOrApproved = payments.some(
    p => p.status_id === PAYMENT_STATUSES.PENDING ||
         p.status_id === PAYMENT_STATUSES.APPROVED
  )

  // 1. Полностью оплачен
  if (Math.abs(paidSum - invoiceAmount) <= EPS || paidSum > invoiceAmount + EPS) {
    return INVOICE_STATUSES.PAID
  }

  // 2. Частично оплачен
  if (paidSum > EPS && paidSum < invoiceAmount - EPS) {
    return INVOICE_STATUSES.PARTIAL
  }

  // 3. На согласовании
  if (hasPendingOrApproved) {
    return INVOICE_STATUSES.PENDING
  }

  // 4. Черновик (по умолчанию)
  return INVOICE_STATUSES.DRAFT
}

/**
 * Определяет, нужно ли обновить статус счёта
 * @param currentStatusId - Текущий статус счёта
 * @param newStatusId - Рассчитанный новый статус
 * @returns true если статус изменился и нужно обновить
 */
export function shouldUpdateInvoiceStatus(
  currentStatusId: number,
  newStatusId: number
): boolean {
  // Не обновляем, если счёт отменён
  if (currentStatusId === INVOICE_STATUSES.CANCELLED) {
    return false
  }

  // Обновляем только если статус изменился
  return currentStatusId !== newStatusId
}