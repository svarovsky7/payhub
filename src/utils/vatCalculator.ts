import type { Dayjs } from 'dayjs'
import { calculateDeliveryDate } from './invoiceHelpers'

export interface VatCalculationResult {
  amountWithVat: number
  vatAmount: number
  amountWithoutVat: number
}

export interface DeliveryDateCalculationParams {
  invoiceDate: Dayjs
  deliveryDays?: number
  deliveryDaysType: 'working' | 'calendar'
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

  const vatAmount = Math.round((amountWithVat * vatRate / (100 + vatRate)) * 100) / 100
  const amountWithoutVat = Math.round((amountWithVat - vatAmount) * 100) / 100

  return {
    amountWithVat,
    vatAmount,
    amountWithoutVat
  }
}

/**
 * Calculate preliminary delivery date based on invoice date and delivery days
 */
export const calculatePreliminaryDeliveryDate = (
  params: DeliveryDateCalculationParams
): Dayjs | null => {
  const { invoiceDate, deliveryDays, deliveryDaysType } = params

  if (!deliveryDays || deliveryDays <= 0) {
    return null
  }

  return calculateDeliveryDate(invoiceDate, deliveryDays, deliveryDaysType)
}

