import { supabase } from '../../lib/supabase'

/**
 * Archive invoice and all related payments
 * @param invoiceId - Invoice UUID to archive
 * @param isArchived - Archive status (true to archive, false to unarchive)
 */
export async function archiveInvoice(invoiceId: string, isArchived: boolean = true): Promise<void> {
  console.log('[invoiceArchive.archiveInvoice] Archiving invoice:', { invoiceId, isArchived })

  try {
    // Start a transaction-like operation by archiving invoice first
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ is_archived: isArchived })
      .eq('id', invoiceId)

    if (invoiceError) throw invoiceError

    // Archive all payments related to this invoice
    const { error: paymentsError } = await supabase
      .from('payments')
      .update({ is_archived: isArchived })
      .eq('invoice_id', invoiceId)

    if (paymentsError) throw paymentsError

    console.log('[invoiceArchive.archiveInvoice] Successfully archived invoice and payments')
  } catch (error) {
    console.error('[invoiceArchive.archiveInvoice] Error archiving invoice:', error)
    throw error
  }
}

/**
 * Unarchive invoice and all related payments
 * @param invoiceId - Invoice UUID to unarchive
 */
export async function unarchiveInvoice(invoiceId: string): Promise<void> {
  return archiveInvoice(invoiceId, false)
}
