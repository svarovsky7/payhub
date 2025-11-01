import React, { useState } from 'react'
import { Modal, Button, Upload, message, Alert, Space } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import { parseXLSXContent, type ParsedContractor } from './ImportContractorsUtils'
import { ImportContractorsPreview } from './ImportContractorsPreview'
import { ImportContractorsResult, type ImportResult } from './ImportContractorsResult'
import { addContractorAlternativeName } from '../../services/employeeOperations'

interface ImportContractorsModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ImportContractorsModal: React.FC<ImportContractorsModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const [parsedData, setParsedData] = useState<ParsedContractor[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')

  // Проверка существующих ИНН в БД (батчинг по 100)
  const checkExistingINNs = async (contractors: ParsedContractor[]): Promise<ParsedContractor[]> => {
    const validContractors = contractors.filter(c => c.valid)
    if (validContractors.length === 0) return contractors

    try {
      const inns = validContractors.map(c => c.inn)
      const existingInns = new Set<string>()
      const batchSize = 100

      // Проверяем ИНН батчами по 100
      for (let i = 0; i < inns.length; i += batchSize) {
        const batch = inns.slice(i, i + batchSize)
        const { data: existing, error } = await supabase
          .from('contractors')
          .select('inn')
          .in('inn', batch)

        if (error) {
          console.error('[ImportContractorsModal.checkExistingINNs] Batch error:', error)
          continue
        }

        existing?.forEach(e => existingInns.add(e.inn))
      }

      // Теперь не отмечаем как невалидные, просто сохраняем информацию
      return contractors.map(c => ({
        ...c,
        exists: c.valid && existingInns.has(c.inn)
      })) as any
    } catch (error) {
      console.error('[ImportContractorsModal.checkExistingINNs] Error:', error)
      return contractors
    }
  }

  // Обработка загруженного файла
  const handleFileUpload = (file: any) => {
    console.log('[ImportContractorsModal.handleFileUpload] Called with:', file)
    console.log('[ImportContractorsModal.handleFileUpload] File type:', Object.prototype.toString.call(file))
    console.log('[ImportContractorsModal.handleFileUpload] File properties:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      lastModified: file?.lastModified,
      originFileObj: file?.originFileObj,
      hasOriginFileObj: !!file?.originFileObj
    })

    // Показываем индикатор загрузки сразу
    const hideLoading = message.loading('Читаем файл...', 0)

    try {
      // Определяем файл для чтения
      let fileToRead: File | Blob | null = null

      // Ant Design может передавать файл в разных форматах
      if (file instanceof File) {
        fileToRead = file
        console.log('[ImportContractorsModal.handleFileUpload] Direct File object')
      } else if (file instanceof Blob) {
        fileToRead = file
        console.log('[ImportContractorsModal.handleFileUpload] Direct Blob object')
      } else if (file?.originFileObj instanceof File) {
        fileToRead = file.originFileObj
        console.log('[ImportContractorsModal.handleFileUpload] Using originFileObj (File)')
      } else if (file?.originFileObj instanceof Blob) {
        fileToRead = file.originFileObj
        console.log('[ImportContractorsModal.handleFileUpload] Using originFileObj (Blob)')
      } else {
        console.error('[ImportContractorsModal.handleFileUpload] Cannot determine file object')
        hideLoading()
        message.error('Не удалось определить тип файла')
        return false
      }

      console.log('[ImportContractorsModal.handleFileUpload] Will read file:', fileToRead)

      if (!fileToRead) {
        console.error('[ImportContractorsModal.handleFileUpload] No file to read')
        hideLoading()
        message.error('Не удалось прочитать файл')
        return false
      }

      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          console.log('[ImportContractorsModal.handleFileUpload] FileReader.onload triggered')
          const arrayBuffer = e.target?.result as ArrayBuffer
          console.log('[ImportContractorsModal.handleFileUpload] ArrayBuffer length:', arrayBuffer?.byteLength)

          // Убираем индикатор загрузки
          hideLoading()

          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            console.error('[ImportContractorsModal.handleFileUpload] File content is empty!')
            message.error('Файл пустой или не удалось прочитать содержимое')
            return
          }

          try {
            const contractors = parseXLSXContent(arrayBuffer)
            
            // Проверяем существующие ИНН
            const contractorsWithCheck = await checkExistingINNs(contractors)
            
            setParsedData(contractorsWithCheck)
            setStep('preview')

            const validCount = contractorsWithCheck.filter(c => c.valid).length
            const duplicateCount = contractorsWithCheck.filter(c => !c.valid && c.error?.includes('уже существует')).length

            if (validCount === 0) {
              message.error('Нет новых данных для импорта')
            } else {
              message.success(`Распознано ${validCount} новых записей${duplicateCount > 0 ? ` (${duplicateCount} дубликатов)` : ''}`)
            }
          } catch (error) {
            console.error('[ImportContractorsModal.handleFileUpload] Parse error:', error)
            message.error('Ошибка при разборе файла: ' + (error as Error).message)
          }
        } catch (err) {
          console.error('[ImportContractorsModal.handleFileUpload] Error in onload:', err)
          hideLoading()
          message.error('Ошибка при обработке файла')
        }
      }

      reader.onerror = (error) => {
        console.error('[ImportContractorsModal.handleFileUpload] FileReader error:', error)
        hideLoading()
        message.error('Ошибка при чтении файла')
      }

      reader.onabort = () => {
        console.warn('[ImportContractorsModal.handleFileUpload] FileReader aborted')
        hideLoading()
        message.warning('Чтение файла было прервано')
      }

      // Читаем файл как ArrayBuffer для XLSX
      console.log('[ImportContractorsModal.handleFileUpload] Starting FileReader.readAsArrayBuffer')
      reader.readAsArrayBuffer(fileToRead)

    } catch (error) {
      console.error('[ImportContractorsModal.handleFileUpload] Caught error:', error)
      hideLoading()
      message.error('Ошибка при обработке файла')
    }

    return false // Prevent automatic upload
  }

  // Импорт в базу данных
  const handleImport = async () => {
    const validContractors = parsedData.filter(c => c.valid)

    if (validContractors.length === 0) {
      message.error('Нет данных для импорта')
      return
    }

    setImporting(true)

    try {
      const results: ImportResult[] = []
      
      // Группируем по ИНН
      const innGroups = new Map<string, ParsedContractor[]>()
      validContractors.forEach(c => {
        if (!innGroups.has(c.inn)) {
          innGroups.set(c.inn, [])
        }
        innGroups.get(c.inn)!.push(c)
      })

      console.log(`[ImportContractorsModal] Grouped into ${innGroups.size} unique INNs`)

      // Импортируем по ИНН (группы)
      for (const [inn, names] of innGroups) {
        try {
          // Используем первое название как основное для контрагента
          const primaryName = names[0]
          
          // Проверяем существует ли уже
          const { data: existing } = await supabase
            .from('contractors')
            .select('id')
            .eq('inn', inn)
            .single()

          let contractorId: number
          
          if (existing) {
            // Контрагент уже существует, добавляем все названия как альтернативные
            contractorId = existing.id
            console.log(`[ImportContractorsModal] Contractor with INN ${inn} already exists, adding alternative names`)
            
            // Добавляем все названия (включая первое)
            for (const name of names) {
              try {
                // Получаем уже существующие названия для этого контрагента
                const { data: existingNames } = await supabase
                  .from('contractor_alternative_names')
                  .select('alternative_name')
                  .eq('contractor_id', contractorId)

                const existingNamesList = existingNames?.map(n => n.alternative_name) || []

                // Проверяем, есть ли уже такое название
                if (!existingNamesList.includes(name.name)) {
                  await addContractorAlternativeName(contractorId, name.name, false)
                  results.push({
                    line: name.line,
                    name: name.name,
                    inn: name.inn,
                    status: 'success',
                    message: 'Добавлено как альтернативное название'
                  })
                } else {
                  results.push({
                    line: name.line,
                    name: name.name,
                    inn: name.inn,
                    status: 'skip',
                    message: 'Это название уже существует'
                  })
                }
              } catch (err: unknown) {
                const error = err as any
                console.error(`[ImportContractorsModal] Error adding alternative name:`, error)
                results.push({
                  line: name.line,
                  name: name.name,
                  inn: name.inn,
                  status: 'error',
                  message: 'Ошибка добавления названия'
                })
              }
            }
          } else {
            // Создаем новый контрагент
            const { data: newContractor, error } = await supabase
              .from('contractors')
              .insert({ name: primaryName.name, inn: inn })
              .select()
              .single()

            if (error) throw error
            
            contractorId = newContractor.id

            // Добавляем первое название как основное в альтернативные
            await addContractorAlternativeName(contractorId, primaryName.name, true)

            results.push({
              line: primaryName.line,
              name: primaryName.name,
              inn: primaryName.inn,
              status: 'success',
              message: 'Успешно импортирован'
            })

            // Добавляем остальные названия как неосновные
            for (let i = 1; i < names.length; i++) {
              try {
                await addContractorAlternativeName(contractorId, names[i].name, false)
                results.push({
                  line: names[i].line,
                  name: names[i].name,
                  inn: names[i].inn,
                  status: 'success',
                  message: 'Добавлено как альтернативное название'
                })
              } catch (err: unknown) {
                const error = err as any
                if (error?.code === '23505') {
                  results.push({
                    line: names[i].line,
                    name: names[i].name,
                    inn: names[i].inn,
                    status: 'skip',
                    message: 'Это название уже существует'
                  })
                } else {
                  results.push({
                    line: names[i].line,
                    name: names[i].name,
                    inn: names[i].inn,
                    status: 'error',
                    message: 'Ошибка добавления названия'
                  })
                }
              }
            }
          }
        } catch (err: unknown) {
          const error = err as any
          names.forEach(contractor => {
            results.push({
              line: contractor.line,
              name: contractor.name,
              inn: contractor.inn,
              status: 'error',
              message: error?.message || 'Неизвестная ошибка'
            })
          })
        }
      }

      setImportResults(results)
      setStep('result')

      const successCount = results.filter(r => r.status === 'success').length
      const skipCount = results.filter(r => r.status === 'skip').length

      if (successCount > 0) {
        message.success(`Успешно импортировано: ${successCount}`)
        onSuccess()
      }

      if (skipCount > 0) {
        message.info(`Пропущено: ${skipCount}`)
      }

    } catch (error) {
      console.error('Import error:', error)
      message.error('Ошибка при импорте данных: ' + (error as Error).message)
    } finally {
      setImporting(false)
    }
  }

  // Сброс состояния
  const handleReset = () => {
    setParsedData([])
    setImportResults([])
    setStep('upload')
  }

  // Закрытие модала
  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Modal
      title="Импорт контрагентов из XLSX"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={
        step === 'upload' ? [
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>
        ] : step === 'preview' ? [
          <Button key="back" onClick={handleReset}>
            Назад
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importing}
            onClick={handleImport}
            disabled={parsedData.filter(c => c.valid).length === 0}
          >
            Импортировать ({parsedData.filter(c => c.valid).length} записей)
          </Button>
        ] : [
          <Button key="new" type="primary" onClick={handleReset}>
            Импортировать еще
          </Button>,
          <Button key="close" onClick={handleClose}>
            Закрыть
          </Button>
        ]
      }
    >
      {step === 'upload' && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Формат XLSX файла"
            description={
              <div>
                <p>Файл должен быть в формате XLSX</p>
                <p>Первая строка - заголовки: <code>Контрагент, ИНН</code></p>
                <p>Последующие строки - данные контрагентов</p>
                <p>Колонка 1: Наименование контрагента</p>
                <p>Колонка 2: ИНН (10 или 12 цифр)</p>
                <p style={{ marginTop: 8, fontStyle: 'italic', color: '#666' }}>
                  <strong>Поддержка альтернативных названий:</strong> К одному ИНН может быть несколько строк с разными названиями. Первое название станет основным для контрагента, остальные - альтернативными.
                </p>
              </div>
            }
            type="info"
            showIcon
          />

          {/* Временная альтернативная кнопка для отладки */}
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="xlsx-upload-input"
              onChange={(e) => {
                console.log('[ImportContractorsModal] Native input onChange')
                const file = e.target.files?.[0]
                if (file) {
                  console.log('[ImportContractorsModal] Native file selected:', file)
                  handleFileUpload(file)
                }
              }}
            />
            <Button
              onClick={() => {
                console.log('[ImportContractorsModal] Triggering native file input')
                document.getElementById('xlsx-upload-input')?.click()
              }}
            >
              Альтернативная загрузка (для отладки)
            </Button>
          </div>

          <Upload.Dragger
            accept=".xlsx,.xls"
            beforeUpload={handleFileUpload}
            maxCount={1}
            showUploadList={false}
            onDrop={(e) => {
              console.log('[ImportContractorsModal] Files dropped:', e.dataTransfer.files)
            }}
            onChange={(info) => {
              console.log('[ImportContractorsModal] Upload onChange:', info)
              if (info.file.status === 'error') {
                console.error('[ImportContractorsModal] Upload error status')
              }
            }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              Нажмите или перетащите XLSX файл для загрузки
            </p>
            <p className="ant-upload-hint">
              Поддерживается формат XLSX с данными: Контрагент, ИНН
            </p>
          </Upload.Dragger>
        </Space>
      )}

      {step === 'preview' && <ImportContractorsPreview data={parsedData} />}

      {step === 'result' && <ImportContractorsResult results={importResults} />}
    </Modal>
  )
}