import type { Dayjs } from 'dayjs'
import { calculateDeliveryDate } from './invoiceHelpers'

interface VatCalculationResult {
  amountWithVat: number
  vatAmount: number
  amountWithoutVat: number
}

/**
 * Calculate VAT amounts based on total amount with VAT and VAT rate
 */
export const calculateVat = (amountWithVat: number, vatRate: number): VatCalculationResult => {
  if (vatRate === 0) {
    return {
      amountWithVat,
      vatAmount: 0,
      amountWithoutVat: amountWithVat
    }
  }

  // Правильная формула: сумма без НДС = сумма с НДС / (1 + ставка НДС / 100)
  const amountWithoutVat = Math.round((amountWithVat / (1 + vatRate / 100)) * 100) / 100
  const vatAmount = Math.round((amountWithVat - amountWithoutVat) * 100) / 100

  return {
    amountWithVat,
    vatAmount,
    amountWithoutVat
  }
}

/**
 * Calculate preliminary delivery date based on invoice date and delivery days
 */
export const calculatePreliminaryDeliveryDate = (params: {
  invoiceDate: Dayjs
  deliveryDays?: number
  deliveryDaysType: 'working' | 'calendar'
}): Dayjs | null => {
  const { invoiceDate, deliveryDays, deliveryDaysType } = params

  if (!deliveryDays || deliveryDays <= 0) {
    return null
  }

  return calculateDeliveryDate(invoiceDate, deliveryDays, deliveryDaysType)
}

