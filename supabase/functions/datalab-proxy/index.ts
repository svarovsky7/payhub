import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const DATALAB_API_KEY = Deno.env.get('DATALAB_API_KEY')
const DATALAB_API_URL = 'https://www.datalab.to/api/v1'

// алиасы: дружелюбное имя -> {path, method по умолчанию}
const ALIAS: Record<string, { path: string | ((p:any)=>string), method?: string }> = {
  'list-step-types':   { path: 'workflows/step-types',   method: 'GET' },
  'list-workflows':    { path: 'workflows/workflows',    method: 'GET' },
  'create-workflow':   { path: 'workflows/workflows',    method: 'POST' },
  'get-workflow':      { path: (p:any) => `workflows/workflows/${p?.workflow_id}`, method: 'GET' },
  'marker_parse':      { path: 'marker' },
  'marker_result':     { path: (p:any) => `marker/${p.request_id || p.task_id}`, method: 'GET' }
  // при необходимости дополняйте: execute-workflow, health, и т.д.
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!DATALAB_API_KEY) {
    return new Response(JSON.stringify({ error: 'DATALAB_API_KEY is not configured on the server.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }

  try {
    const { endpoint, payload, method } = await req.json() as { endpoint?: string; payload?: any; method?: string }
    if (!endpoint) throw new Error('Endpoint is required.')
    const alias = ALIAS[endpoint]
    const m = (method ?? alias?.method ?? 'POST').toUpperCase()

    // реальный путь
    const path = typeof alias?.path === 'function' ? alias.path(payload) : (alias?.path ?? endpoint)
    if (!path || path.includes('{')) throw new Error('Missing required path parameter(s) for endpoint')

    // собрать URL / querystring для GET
    let url = `${DATALAB_API_URL}/${path}`
    let body: BodyInit | undefined
    const headers: HeadersInit = { 'X-API-Key': DATALAB_API_KEY }

    if (m === 'GET') {
      if (payload && Object.keys(payload).length) {
        const qs = new URLSearchParams(Object.entries(payload).reduce((a,[k,v]) => {
          a[k] = typeof v === 'string' ? v : JSON.stringify(v); return a
        }, {} as Record<string,string>))
        url += `?${qs.toString()}`
      }
    } else if (payload && Object.keys(payload).length) {
      // для marker используем form-data
      if (endpoint === 'marker_parse') {
        const formData = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          formData.append(k, typeof v === 'string' ? v : JSON.stringify(v))
        })
        body = formData
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(payload)
      }
    }

    console.log(`[datalab-proxy] Requesting: ${m} ${url}`)
    if (body) {
      if (body instanceof FormData) {
        console.log(`[datalab-proxy] Body (FormData):`, Array.from(body.entries()))
      } else {
        console.log(`[datalab-proxy] Body: ${body}`)
      }
    }

    const res = await fetch(url, {
      method: m,
      headers,
      body
    })

    console.log(`[datalab-proxy] Response status: ${res.status}`)
    
    if (!res.ok) {
      const t = await res.text()
      console.error(`[datalab-proxy] Upstream error: ${res.status}`, t)
      return new Response(JSON.stringify({ error: t || res.statusText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: res.status
      })
    }
    if (res.status === 204) return new Response(null, { headers: corsHeaders, status: 204 })
    const data = await res.json()
    console.log(`[datalab-proxy] Response data:`, JSON.stringify(data))
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e:any) {
    console.error(`[datalab-proxy] Internal error:`, e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})