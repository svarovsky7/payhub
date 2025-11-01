/**
 * Letter Operations Service
 *
 * This service has been split into modules for better maintainability:
 * - letterLoading.ts: Loading letters, statuses, and queries
 * - letterRegistration.ts: Registration number generation
 * - letterCrud.ts: Create, Read, Update, Delete operations
 * - letterFiles.ts: File attachment management
 * - letterLinks.ts: Parent-child letter linking
 *
 * All functions are re-exported from this file for backward compatibility.
 */

import { supabase, type Letter } from '../lib/supabase'

// Loading operations
export {
  loadLetterStatuses,
  loadLetters,
  getLetterById
} from './letter/letterLoading'

// Registration number generation
export {
  generateRegNumber
} from './letter/letterRegistration'

// CRUD operations
export {
  createLetter,
  updateLetter,
  deleteLetter
} from './letter/letterCrud'

// File operations
export {
  processLetterFiles,
  getLetterAttachments
} from './letter/letterFiles'

// Letter linking
export {
  getParentLetters,
  getChildLetters,
  linkLetters,
  unlinkLetters
} from './letter/letterLinks'

export async function generatePublicShareLink(letterId: string): Promise<string> {
  try {
    // Check if public share already exists
    const { data: existingShare } = await supabase
      .from('letter_public_shares')
      .select('token')
      .eq('letter_id', letterId)
      .single()

    if (existingShare?.token) {
      // Return existing link
      const baseUrl = window.location.origin
      return `${baseUrl}/letter-share/${existingShare.token}`
    }

    // Generate new token
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    
    const { error } = await supabase
      .from('letter_public_shares')
      .insert({
        letter_id: letterId,
        token,
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    const baseUrl = window.location.origin
    return `${baseUrl}/letter-share/${token}`
  } catch (error) {
    console.error('[letterOperations.generatePublicShareLink] Error:', error)
    throw error
  }
}

export async function getLetterByShareToken(token: string): Promise<Letter | null> {
  const { data, error } = await supabase
    .from('letter_public_shares')
    .select(`
      letter_id,
      letters(
        *,
        creator:created_by(id, full_name, email),
        responsible_user:responsible_user_id(id, full_name, email),
        status:status_id(id, code, name, color)
      )
    `)
    .eq('token', token)
    .single()

  if (error || !data) return null
  const response = data as unknown as { letters: Letter } | null
  return response?.letters || null
}
