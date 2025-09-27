/**
 * Normalize VAT rate input to handle common variations
 */
export const normalizeVatRate = (value: string | number | undefined): number => {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return 0
  }

  // Return any valid number without restrictions
  return numValue
}

/**
 * Format VAT rate for display
 */
export const formatVatRate = (rate: number): string => {
  if (rate === 0) {
    return 'Без НДС'
  }
  return `${rate}%`
}

/**
 * Common VAT rates in Russia
 */
export const VAT_RATES = [
  { value: 0, label: 'Без НДС' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
] as const

export const DEFAULT_VAT_RATE = 20

/**
 * Get allowed VAT rates for select dropdown
 */
export const getAllowedVatRates = () => {
  return VAT_RATES.map(rate => ({
    value: rate.value,
    label: rate.label
  }))
}