import { supabase } from '../../lib/supabase'
import type { Letter } from '../../lib/supabase'
import { createAuditLogEntry } from '../auditLogService'
import { processLetterFiles } from './letterFiles'
import { updateFileDescriptionsBatch } from '../fileAttachmentService'

/**
 * Create a new letter
 */
export async function createLetter(
  letterData: Partial<Letter>,
  files?: File[],
  fileDescriptions?: Record<string, string>,
  publicShareToken?: string
): Promise<Letter> {
  console.log('[letterCrud.createLetter] Creating letter:', letterData)

  let { data, error } = await supabase
    .from('letters')
    .insert(letterData)
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email),
      sender_contractor:contractors!fk_letters_sender_contractor(id, name),
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name),
      letter_attachments(count)
    `)
    .single()

  if (error) {
    console.error('[letterCrud.createLetter] Error:', error)
    throw error
  }

  // Save public share token if provided
  if (publicShareToken && data) {
    const token = publicShareToken
    const { error: shareError } = await supabase
      .from('letter_public_shares')
      .insert({
        letter_id: data.id,
        token,
        created_at: new Date().toISOString()
      })

    if (shareError) {
      console.error('[letterCrud.createLetter] Error saving share token:', shareError)
      // Don't throw - letter was created successfully, just log the error
    }
  }

  // Upload files if provided
  if (files && files.length > 0 && data) {
    await processLetterFiles(data.id, files, [], fileDescriptions)
    
    // Reload letter data to get updated attachment count
    const { data: updatedData, error: reloadError } = await supabase
      .from('letters')
      .select(`
        *,
        project:projects(id, name, code),
        status:letter_statuses(id, name, code, color),
        responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
        creator:user_profiles!letters_created_by_fkey(id, full_name, email),
        sender_contractor:contractors!fk_letters_sender_contractor(id, name),
        recipient_contractor:contractors!fk_letters_recipient_contractor(id, name),
        letter_attachments(count)
      `)
      .eq('id', data.id)
      .single()
    
    if (!reloadError && updatedData) {
      data = updatedData
    }
  }

  // Log creation
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) {
    await createAuditLogEntry('letter', data.id, 'create', session.user.id, {
      metadata: {
        letter_number: data.number,
        subject: data.subject,
        direction: data.direction
      }
    })
  }

  return data
}

/**
 * Update an existing letter
 */
export async function updateLetter(
  letterId: string,
  letterData: Partial<Letter>,
  files?: File[],
  originalFiles?: any[],
  fileDescriptions?: Record<string, string>,
  existingFileDescriptions?: Record<string, string>
): Promise<Letter> {
  console.log('[letterCrud.updateLetter] Updating letter:', letterId, letterData)

  // Get old letter data before updating
  const { data: oldLetter } = await supabase
    .from('letters')
    .select('*')
    .eq('id', letterId)
    .single()

  let { data, error } = await supabase
    .from('letters')
    .update(letterData)
    .eq('id', letterId)
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email),
      sender_contractor:contractors!fk_letters_sender_contractor(id, name),
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name),
      letter_attachments(count)
    `)
    .single()

  if (error) {
    console.error('[letterCrud.updateLetter] Error:', error)
    throw error
  }

  // Handle file operations
  if (files || originalFiles) {
    await processLetterFiles(letterId, files || [], originalFiles || [], fileDescriptions)
    
    // Reload letter data to get updated attachment count
    const { data: updatedData, error: reloadError } = await supabase
      .from('letters')
      .select(`
        *,
        project:projects(id, name, code),
        status:letter_statuses(id, name, code, color),
        responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
        creator:user_profiles!letters_created_by_fkey(id, full_name, email),
        sender_contractor:contractors!fk_letters_sender_contractor(id, name),
        recipient_contractor:contractors!fk_letters_recipient_contractor(id, name),
        letter_attachments(count)
      `)
      .eq('id', letterId)
      .single()
    
    if (!reloadError && updatedData) {
      data = updatedData
    }
  }

  // Update existing file descriptions
  if (existingFileDescriptions && Object.keys(existingFileDescriptions).length > 0) {
    console.log('[letterCrud.updateLetter] Updating existing file descriptions:', {
      count: Object.keys(existingFileDescriptions).length
    })
    await updateFileDescriptionsBatch(existingFileDescriptions)
  }

  // Log updates for changed fields
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id && oldLetter) {
    const fieldsToLog = [
      'number', 'reg_number', 'letter_date', 'reg_date', 'subject', 'content',
      'sender', 'recipient', 'direction', 'delivery_method', 'status_id',
      'project_id', 'responsible_user_id', 'responsible_person_name'
    ] as const

    for (const field of fieldsToLog) {
      const oldValue = oldLetter[field]
      const newValue = (letterData as any)[field]

      // Only log if field was actually changed
      if (newValue !== undefined && oldValue !== newValue) {
        await createAuditLogEntry('letter', letterId, 'update', session.user.id, {
          fieldName: field,
          oldValue: oldValue != null ? String(oldValue) : undefined,
          newValue: newValue != null ? String(newValue) : undefined
        })
      }
    }
  }

  return data
}

/**
 * Delete a letter
 */
export async function deleteLetter(letterId: string): Promise<void> {
  console.log('[letterCrud.deleteLetter] Deleting letter:', letterId)

  // Delete associated files first
  const { data: attachments } = await supabase
    .from('letter_attachments')
    .select('attachment_id')
    .eq('letter_id', letterId)

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      // Get file path
      const { data: fileData } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', att.attachment_id)
        .single()

      if (fileData) {
        // Delete from storage
        await supabase.storage
          .from('attachments')
          .remove([fileData.storage_path])
      }

      // Delete attachment record
      await supabase
        .from('attachments')
        .delete()
        .eq('id', att.attachment_id)
    }
  }

  // Delete the letter (cascade will handle letter_attachments and letter_links)
  const { error } = await supabase
    .from('letters')
    .delete()
    .eq('id', letterId)

  if (error) {
    console.error('[letterCrud.deleteLetter] Error:', error)
    throw error
  }
}
