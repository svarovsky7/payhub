import { supabase } from '@/shared/api/supabase';
import type { Attachment } from '@/shared/types';

export const attachmentApi = {
  /**
   * Verify storage bucket configuration
   */
  async verifyStorageSetup(): Promise<{ isConfigured: boolean; error?: string }> {
    try {
      console.log('=== Verifying storage setup ===');
      
      // Check if user is authenticated first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication check failed:', authError);
        return { 
          isConfigured: false, 
          error: 'User not authenticated. Please log in.' 
        };
      }
      
      console.log('User authenticated:', user.id);
      
      // Try to list buckets to check if storage is accessible
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Cannot list buckets:', bucketsError);
        // Continue anyway - user might not have permission to list buckets
      } else {
        console.log('Available buckets:', buckets?.map(b => b.name));
      }
      
      // Test if we can list files in the bucket
      const { error } = await supabase.storage
        .from('attachments')
        .list('', { limit: 1 });
      
      if (error) {
        console.error('Storage verification failed:', error);
        
        // Check specific error types
        if (error.message?.includes('not found') || error.message?.includes('Bucket not found')) {
          return { 
            isConfigured: false, 
            error: 'Storage bucket "attachments" not found. Please create it in Supabase Dashboard.' 
          };
        }
        
        if (error.message?.includes('policy') || error.message?.includes('RLS')) {
          return { 
            isConfigured: false, 
            error: 'Storage policies not configured. Please check RLS policies.' 
          };
        }
        
        // If error but not critical, assume it's OK
        console.warn('Storage check had non-critical error, continuing:', error.message);
      }
      
      console.log('Storage verification complete - OK');
      return { isConfigured: true };
      
    } catch (error) {
      console.error('Unexpected error during storage verification:', error);
      return { 
        isConfigured: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  /**
   * Upload a file to Supabase storage and create attachment record
   */
  async upload(file: File, invoiceId?: number): Promise<Attachment> {
    console.log('=== Starting file upload ===');
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      invoiceId
    });
    
    try {
      // Skip storage verification for now - it might be hanging
      console.log('Skipping storage verification, proceeding with upload...');

      // Generate unique file name - sanitize to avoid storage errors
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      
      // Extract extension safely
      const lastDotIndex = file.name.lastIndexOf('.');
      const hasExtension = lastDotIndex > 0 && lastDotIndex < file.name.length - 1;
      const fileExt = hasExtension ? file.name.substring(lastDotIndex + 1).toLowerCase() : 'file';
      
      // Sanitize base name more aggressively
      const nameWithoutExt = hasExtension ? file.name.substring(0, lastDotIndex) : file.name;
      const baseName = nameWithoutExt
        .replace(/[^\w\s-]/g, '') // Remove all non-word chars except spaces and hyphens
        .replace(/\s+/g, '_')      // Replace spaces with underscores
        .replace(/-+/g, '-')       // Replace multiple hyphens with single
        .replace(/_+/g, '_')       // Replace multiple underscores with single
        .substring(0, 50);         // Limit length
      
      // If base name is empty after sanitization, use a default
      const safeName = baseName || 'file';
      
      // Construct final file name
      const fileName = `${timestamp}_${randomStr}_${safeName}.${fileExt}`;
      const filePath = invoiceId ? `invoices/${invoiceId}/${fileName}` : `temp/${fileName}`;
      
      console.log('Generated file path:', filePath);
      console.log('Uploading to Supabase storage...');

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload failed:', uploadError);
        console.error('Error details:', {
          message: uploadError.message,
          statusCode: uploadError?.statusCode,
          error: uploadError?.error,
          path: filePath
        });
        
        // Check if it's a bucket not found error
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
          throw new Error('Storage bucket "attachments" не найден. Создайте его в Supabase Dashboard (Storage -> New bucket -> имя: attachments, сделайте PUBLIC)');
        }
        
        // Check for auth errors
        if (uploadError.message?.includes('authenticated') || uploadError.message?.includes('JWT')) {
          throw new Error('Ошибка аутентификации. Попробуйте перезайти в систему.');
        }
        
        throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
      }
      
      console.log('File uploaded successfully to storage:', uploadData);

      // Get current user
      console.log('Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Failed to get user:', userError);
      }
      console.log('Current user ID:', user?.id || 'No user');
      
      // Check if user exists in public.users table
      if (user?.id) {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (checkError) {
          console.error('Failed to check user existence:', checkError);
        }
        
        // If user doesn't exist in public.users, create them
        if (!existingUser) {
          console.log('User not found in public.users, creating...');
          const { error: createUserError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_active: true
            });
          
          if (createUserError) {
            console.error('Failed to create user in public.users:', createUserError);
            // Continue anyway - maybe the user was created by another process
          } else {
            console.log('User created successfully in public.users');
          }
        }
      }

      // Create attachment record in database
      const attachmentData = {
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        attachment_type: getAttachmentType(file.type),
        uploaded_by: user?.id || null,
      };
      
      console.log('Creating database record with data:', attachmentData);
      
      const { data, error } = await supabase
        .from('attachments')
        .insert(attachmentData)
        .select()
        .single();

      if (error) {
        console.error('Database insert failed:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Try to delete uploaded file if database insert fails
        console.log('Cleaning up uploaded file due to database error...');
        const { error: deleteError } = await supabase.storage
          .from('attachments')
          .remove([uploadData.path]);
        
        if (deleteError) {
          console.error('Failed to cleanup file:', deleteError);
        }
        
        throw error;
      }

      console.log('Attachment record created successfully:', data);
      return data;
    } catch (error) {
      console.error('=== Upload failed ===');
      console.error('Full error object:', error);
      
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      throw error;
    }
  },

  /**
   * Get attachments for an invoice
   */
  async getByInvoiceId(invoiceId: number): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from('invoice_documents')
      .select(`
        attachment_id,
        attachments (*)
      `)
      .eq('invoice_id', invoiceId);

    if (error) {
      console.error('Failed to fetch invoice attachments:', error);
      throw error;
    }

    return data?.map(item => item.attachments).filter(Boolean) || [];
  },

  /**
   * Link attachment to invoice
   */
  async linkToInvoice(attachmentId: number, invoiceId: number): Promise<void> {
    const { error } = await supabase
      .from('invoice_documents')
      .insert({
        invoice_id: invoiceId,
        attachment_id: attachmentId,
      });

    if (error) {
      console.error('Failed to link attachment to invoice:', error);
      throw error;
    }
  },

  /**
   * Unlink attachment from invoice
   */
  async unlinkFromInvoice(attachmentId: number, invoiceId: number): Promise<void> {
    const { error } = await supabase
      .from('invoice_documents')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('attachment_id', attachmentId);

    if (error) {
      console.error('Failed to unlink attachment from invoice:', error);
      throw error;
    }
  },

  /**
   * Delete attachment (removes file and database record)
   */
  async delete(attachmentId: number): Promise<void> {
    // First get the attachment to get file path
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch attachment:', fetchError);
      throw fetchError;
    }

    // Delete from storage
    if (attachment?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('Failed to delete attachment:', error);
      throw error;
    }
  },

  /**
   * Get public URL for attachment
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  },

  /**
   * Download attachment
   */
  async download(filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(filePath);

    if (error) {
      console.error('Failed to download file:', error);
      throw error;
    }

    return data;
  },
};

// Helper function to determine attachment type based on mime type
function getAttachmentType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  return 'other';
}