import { supabase } from '../lib/supabase'

export async function debugStorageAccess() {
  console.log('=== STORAGE DEBUG ===')

  // Проверяем текущего пользователя
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('Current user:', user?.id, user?.email)

  if (userError) {
    console.error('User error:', userError)
  }

  // Пытаемся получить список бакетов (если есть права)
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    console.log('Available buckets:', buckets)
    if (bucketsError) {
      console.error('Buckets error:', bucketsError)
    }
  } catch (e) {
    console.error('Cannot list buckets:', e)
  }

  // Проверяем конкретный бакет attachments
  const { data: files, error: listError } = await supabase.storage
    .from('attachments')
    .list()

  console.log('Root files in attachments bucket:', files?.length, listError)

  // Проверяем папку invoices
  const { data: invoicesFolder, error: invoicesError } = await supabase.storage
    .from('attachments')
    .list('invoices')

  console.log('Files in invoices folder:', invoicesFolder?.length, invoicesError)

  if (invoicesFolder && invoicesFolder.length > 0) {
    console.log('Invoice folders:', invoicesFolder.map(f => f.name))
  }

  console.log('=== END STORAGE DEBUG ===')
}

export async function testFileOperations(invoiceId: string) {
  console.log('=== TEST FILE OPERATIONS ===')

  const testFileName = `test_${Date.now()}.txt`
  const testPath = `invoices/${invoiceId}/${testFileName}`

  // Тест 1: Создание файла
  console.log('Test 1: Creating test file at:', testPath)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(testPath, new Blob(['Test content']), {
      contentType: 'text/plain',
      upsert: true
    })

  console.log('Upload result:', { uploadData, uploadError })

  if (!uploadError) {
    // Тест 2: Проверка наличия файла
    console.log('Test 2: Checking if file exists...')
    const { data: listData, error: listError } = await supabase.storage
      .from('attachments')
      .list(`invoices/${invoiceId}`)

    console.log('List after upload:', {
      files: listData?.map(f => f.name),
      error: listError
    })

    // Тест 3: Удаление файла
    console.log('Test 3: Deleting test file...')
    const { data: removeData, error: removeError } = await supabase.storage
      .from('attachments')
      .remove([testPath])

    console.log('Remove result:', { removeData, removeError })

    // Тест 4: Проверка после удаления
    console.log('Test 4: Checking after deletion...')
    const { data: checkData, error: checkError } = await supabase.storage
      .from('attachments')
      .list(`invoices/${invoiceId}`)

    console.log('List after delete:', {
      files: checkData?.map(f => f.name),
      error: checkError
    })
  }

  console.log('=== END TEST FILE OPERATIONS ===')
}

export async function cleanupOrphanedFiles() {
  console.log('=== CLEANUP ORPHANED FILES ===')

  // Получаем все файлы из Storage
  const { data: invoiceFolders, error: foldersError } = await supabase.storage
    .from('attachments')
    .list('invoices')

  if (foldersError) {
    console.error('Error listing invoice folders:', foldersError)
    return
  }

  console.log('Found invoice folders:', invoiceFolders?.length)

  // Получаем все существующие счета
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id')

  if (invoicesError) {
    console.error('Error getting invoices:', invoicesError)
    return
  }

  const validInvoiceIds = new Set(invoices?.map(i => i.id) || [])
  console.log('Valid invoice IDs:', validInvoiceIds.size)

  // Находим папки без соответствующих счетов
  const orphanedFolders = invoiceFolders?.filter(folder => !validInvoiceIds.has(folder.name)) || []
  console.log('Orphaned folders:', orphanedFolders.map(f => f.name))

  // Удаляем файлы из orphaned папок
  for (const folder of orphanedFolders) {
    const folderPath = `invoices/${folder.name}`
    console.log(`Cleaning up folder: ${folderPath}`)

    // Получаем файлы в папке
    const { data: files, error: filesError } = await supabase.storage
      .from('attachments')
      .list(folderPath)

    if (filesError) {
      console.error(`Error listing files in ${folderPath}:`, filesError)
      continue
    }

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${folderPath}/${f.name}`)
      console.log(`Deleting ${files.length} files from ${folderPath}`)

      const { error: removeError } = await supabase.storage
        .from('attachments')
        .remove(filePaths)

      if (removeError) {
        console.error(`Error removing files from ${folderPath}:`, removeError)
      } else {
        console.log(`Successfully cleaned up ${folderPath}`)
      }
    }
  }

  console.log('=== END CLEANUP ORPHANED FILES ===')
}