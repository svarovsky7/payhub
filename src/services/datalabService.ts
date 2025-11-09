import { supabase } from '../lib/supabase'

interface MarkerRequest {
  file_url: string
  output_format?: string
  force_ocr?: boolean
  format_lines?: boolean
  use_llm?: boolean
  mode?: string
  paginate?: boolean
  max_pages?: number
  page_range?: string
  disable_image_extraction?: boolean
  additional_config?: string
}

const poll = async <T>(
  fn: () => Promise<T>,
  validate: (result: T) => boolean,
  interval: number,
  maxAttempts: number
): Promise<T> => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fn()
    if (validate(result)) {
      return result
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  throw new Error('Max polling attempts reached')
}

const requestMarker = async (
  fileUrl: string,
  options?: {
    pageRange?: { start: number; end: number }
    maxPages?: number
  }
): Promise<string> => {
  const payload: MarkerRequest = {
    file_url: fileUrl,
    output_format: 'markdown,chunks',
    force_ocr: true,
    format_lines: true,
    use_llm: true,
    mode: 'accurate',
    paginate: true,
    disable_image_extraction: true,
    additional_config: JSON.stringify({
      drop_repeated_text: true,
      filter_blank_pages: true
    })
  }

  if (options?.pageRange) {
    payload.page_range = `${options.pageRange.start - 1}-${options.pageRange.end - 1}`
  } else if (options?.maxPages) {
    payload.max_pages = options.maxPages
  }

  const { data, error } = await supabase.functions.invoke('datalab-proxy', {
    body: {
      endpoint: 'marker_parse',
      method: 'POST',
      payload
    }
  })

  if (error) {
    console.error('Datalab proxy error (requestMarker):', error)
    throw error
  }
  console.log('Marker response:', data)
  if (!data || !data.request_id) throw new Error('Failed to start marker task')
  
  return data.request_id
}

const checkMarkerStatus = async (taskId: string): Promise<{ status: string; markdown?: string; isReady: boolean }> => {
  const { data, error } = await supabase.functions.invoke('datalab-proxy', {
    body: {
      endpoint: 'marker_result',
      payload: { request_id: taskId }
    }
  })
  
  if (error) {
    console.warn('Статус проверки не готов:', error.message)
    return { status: 'processing', isReady: false }
  }
  
  console.log('Ответ от Datalab:', data)
  
  if (data && data.status === 'complete' && data.markdown) {
    return { status: 'complete', markdown: data.markdown, isReady: true }
  }
  
  return { status: data?.status || 'processing', isReady: false }
}

const pollMarkerResult = (taskId: string): Promise<string> => {
  return poll(
    () => checkMarkerStatus(taskId),
    (result) => result.isReady,
    5000,
    20
  ).then(result => result.markdown!)
}

export const datalabService = {
  requestMarker,
  pollMarkerResult,
  checkMarkerStatus
}

