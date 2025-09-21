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

