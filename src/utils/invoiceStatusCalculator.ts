// Утилиты для автоматического расчёта статуса счёта на основе платежей

// Допуск для сравнения сумм в рублях
const EPS = 10

// ID статусов счетов
// Используйте только эти официальные определения статусов!
const INVOICE_STATUSES = {
  DRAFT: 1,      // draft (Черновик)
  PENDING: 2,    // pending (На согласовании)
  PAID: 3,       // paid (Оплачен)
  PARTIAL: 4,    // partial (Частично оплачен)
  CANCELLED: 5,  // cancelled (Отменен)
  APPROVED: 7    // approved (В оплате) - НОВЫЙ СТАТУС
}

// ID статусов платежей
// Используйте только эти официальные определения статусов!
const PAYMENT_STATUSES = {
  CREATED: 1,    // created (Создан)
  PENDING: 2,    // pending (На согласовании)
  PAID: 3,       // paid (Оплачен)
  CANCELLED: 4,  // cancelled (Отменён)
  APPROVED: 5    // approved (В оплате)
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

  // Считаем сумму оплаченных и утвержденных к оплате платежей
  const paidSum = payments
    .filter(p =>
      p.status_id === PAYMENT_STATUSES.PAID ||
      p.status_id === PAYMENT_STATUSES.APPROVED
    )
    .reduce((sum, p) => sum + p.amount, 0)

  // Проверяем наличие платежей на согласовании
  const hasPending = payments.some(
    p => p.status_id === PAYMENT_STATUSES.PENDING
  )

  // НОВОЕ ПРАВИЛО: Проверяем наличие платежей, утвержденных к оплате
  const hasApproved = payments.some(
    p => p.status_id === PAYMENT_STATUSES.APPROVED
  )

  // 1. Полностью оплачен (только по статусу PAID)
  const fullyPaidSum = payments
    .filter(p => p.status_id === PAYMENT_STATUSES.PAID)
    .reduce((sum, p) => sum + p.amount, 0);

  if (invoiceAmount > 0 && (Math.abs(fullyPaidSum - invoiceAmount) <= EPS || fullyPaidSum > invoiceAmount + EPS)) {
    // Убедимся, что нет активных процессов, прежде чем закрывать счет
    if (!hasPending && !hasApproved) {
      return INVOICE_STATUSES.PAID
    }
  }

  // 2. В ОПЛАТЕ (приоритет над частичной оплатой)
  if (hasApproved) {
    return INVOICE_STATUSES.APPROVED
  }

  // 3. На согласовании
  if (hasPending) {
    return INVOICE_STATUSES.PENDING
  }

  // 4. Частично оплачен (только если нет активных согласований)
  if (fullyPaidSum > EPS) {
    return INVOICE_STATUSES.PARTIAL
  }
  
  // Правило для сохранения статуса "На согласовании"
  if (currentStatusId === INVOICE_STATUSES.PENDING && paidSum <= EPS && !hasApproved) {
    return INVOICE_STATUSES.PENDING
  }

  // 5. Черновик (по умолчанию)
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