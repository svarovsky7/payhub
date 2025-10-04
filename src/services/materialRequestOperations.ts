import { supabase } from '../lib/supabase'
import type { Project } from '../lib/supabase'
import type { Employee } from './employeeOperations'

// Types and interfaces
export interface MaterialRequest {
  id: string
  request_number: string
  request_date: string
  project_id?: number | null
  employee_id?: number | null
  total_items: number
  created_by?: string | null
  created_at: string
  updated_at: string
  // Relations
  project?: Project
  employee?: Employee
  items?: MaterialRequestItem[]
}

export interface MaterialRequestItem {
  id: string
  material_request_id: string
  material_name: string
  unit: string
  quantity: number
  nomenclature_id?: number | null
  sort_order: number
  created_at: string
  // Relations
  nomenclature?: {
    id: number
    name: string
    unit: string
    material_class?: {
      id: number
      name: string
      parent_id?: number | null
      parent?: {
        id: number
        name: string
      }
    }
  }
}

export interface CreateMaterialRequestInput {
  request_number: string
  request_date: string
  project_id?: number | null
  employee_id?: number | null
  items?: Omit<MaterialRequestItem, 'id' | 'material_request_id' | 'created_at'>[]
}

export interface UpdateMaterialRequestInput {
  request_number?: string
  request_date?: string
  project_id?: number | null
  employee_id?: number | null
}

// Create material request
export async function createMaterialRequest(
  userId: string,
  input: CreateMaterialRequestInput
): Promise<MaterialRequest> {
  console.log('[materialRequestOperations.createMaterialRequest] Creating request:', input)

  try {
    const { items, ...requestData } = input

    // Create material request
    const { data: request, error: requestError } = await supabase
      .from('material_requests')
      .insert({
        ...requestData,
        created_by: userId
      })
      .select('*')
      .single()

    if (requestError) throw requestError

    // Create items if provided
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        ...item,
        material_request_id: request.id,
        sort_order: item.sort_order ?? index
      }))

      const { error: itemsError } = await supabase
        .from('material_request_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
    }

    // Load full request with relations
    return await loadMaterialRequest(request.id)
  } catch (error: unknown) {
    console.error('[materialRequestOperations.createMaterialRequest] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка создания заявки на материалы')
  }
}

// Load single material request with relations
export async function loadMaterialRequest(requestId: string): Promise<MaterialRequest> {
  console.log('[materialRequestOperations.loadMaterialRequest] Loading request:', requestId)

  try {
    // Load request
    const { data: request, error: requestError } = await supabase
      .from('material_requests')
      .select(`
        *,
        project:projects(*),
        employee:employees(*)
      `)
      .eq('id', requestId)
      .single()

    if (requestError) throw requestError
    if (!request) throw new Error('Заявка не найдена')

    // Load items with nomenclature and material class
    const { data: items, error: itemsError } = await supabase
      .from('material_request_items')
      .select(`
        *,
        nomenclature:material_nomenclature(
          id,
          name,
          unit,
          material_class:material_classes(
            id,
            name,
            parent_id,
            parent:parent_id(id, name)
          )
        )
      `)
      .eq('material_request_id', requestId)
      .order('sort_order', { ascending: true })

    if (itemsError) throw itemsError

    return {
      ...request,
      items: items || []
    }
  } catch (error: unknown) {
    console.error('[materialRequestOperations.loadMaterialRequest] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка загрузки заявки на материалы')
  }
}

// Load all material requests
export async function loadMaterialRequests(userId?: string): Promise<MaterialRequest[]> {
  console.log('[materialRequestOperations.loadMaterialRequests] Loading requests for user:', userId)

  try {
    let query = supabase
      .from('material_requests')
      .select(`
        *,
        project:projects(*),
        employee:employees(*),
        items:material_request_items(
          *,
          nomenclature:material_nomenclature(
            id,
            name,
            unit,
            material_class:material_classes(
              id,
              name,
              parent_id,
              parent:parent_id(id, name)
            )
          )
        )
      `)

    // Filter by user projects if needed
    if (userId) {
      const { getUserProjectFilter } = await import('./userProjectsService')
      const { shouldFilter, projectIds } = await getUserProjectFilter(userId)

      if (shouldFilter && projectIds.length > 0) {
        console.log('[materialRequestOperations.loadMaterialRequests] Filtering by projects:', projectIds)
        query = query.in('project_id', projectIds)
      } else if (shouldFilter && projectIds.length === 0) {
        // User has no projects - return empty array
        console.log('[materialRequestOperations.loadMaterialRequests] User has no projects')
        return []
      }
    }

    const { data: requests, error } = await query
      .order('request_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Sort items by sort_order for each request
    const requestsWithSortedItems = (requests || []).map(request => ({
      ...request,
      items: request.items?.sort((a: MaterialRequestItem, b: MaterialRequestItem) =>
        a.sort_order - b.sort_order
      ) || []
    }))

    return requestsWithSortedItems
  } catch (error: unknown) {
    console.error('[materialRequestOperations.loadMaterialRequests] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка загрузки заявок на материалы')
  }
}

// Update material request
export async function updateMaterialRequest(
  requestId: string,
  input: UpdateMaterialRequestInput
): Promise<MaterialRequest> {
  console.log('[materialRequestOperations.updateMaterialRequest] Updating request:', {
    requestId,
    input
  })

  try {
    const { data: request, error } = await supabase
      .from('material_requests')
      .update(input)
      .eq('id', requestId)
      .select('*')
      .single()

    if (error) throw error
    if (!request) throw new Error('Заявка не найдена')

    return await loadMaterialRequest(requestId)
  } catch (error: unknown) {
    console.error('[materialRequestOperations.updateMaterialRequest] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка обновления заявки на материалы')
  }
}

// Delete material request
export async function deleteMaterialRequest(requestId: string): Promise<void> {
  console.log('[materialRequestOperations.deleteMaterialRequest] Deleting request:', requestId)

  try {
    const { error } = await supabase
      .from('material_requests')
      .delete()
      .eq('id', requestId)

    if (error) throw error
  } catch (error) {
    console.error('[materialRequestOperations.deleteMaterialRequest] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка удаления заявки на материалы')
  }
}

// Add items to material request
export async function addMaterialRequestItems(
  requestId: string,
  items: Omit<MaterialRequestItem, 'id' | 'material_request_id' | 'created_at'>[]
): Promise<MaterialRequestItem[]> {
  console.log('[materialRequestOperations.addMaterialRequestItems] Adding items:', {
    requestId,
    items
  })

  try {
    // Get current max sort order
    const { data: existingItems } = await supabase
      .from('material_request_items')
      .select('sort_order')
      .eq('material_request_id', requestId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxSortOrder = existingItems?.[0]?.sort_order ?? -1

    const itemsToInsert = items.map((item, index) => ({
      ...item,
      material_request_id: requestId,
      sort_order: item.sort_order ?? (maxSortOrder + index + 1)
    }))

    const { data, error } = await supabase
      .from('material_request_items')
      .insert(itemsToInsert)
      .select('*')

    if (error) throw error

    return data || []
  } catch (error: unknown) {
    console.error('[materialRequestOperations.addMaterialRequestItems] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка добавления позиций в заявку')
  }
}

// Update material request item
export async function updateMaterialRequestItem(
  itemId: string,
  input: Partial<Omit<MaterialRequestItem, 'id' | 'material_request_id' | 'created_at'>>
): Promise<MaterialRequestItem> {
  console.log('[materialRequestOperations.updateMaterialRequestItem] Updating item:', {
    itemId,
    input
  })

  try {
    const { data, error } = await supabase
      .from('material_request_items')
      .update(input)
      .eq('id', itemId)
      .select('*')
      .single()

    if (error) throw error
    if (!data) throw new Error('Позиция не найдена')

    return data
  } catch (error: unknown) {
    console.error('[materialRequestOperations.updateMaterialRequestItem] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка обновления позиции')
  }
}

// Delete material request item
export async function deleteMaterialRequestItem(itemId: string): Promise<void> {
  console.log('[materialRequestOperations.deleteMaterialRequestItem] Deleting item:', itemId)

  try {
    const { error } = await supabase
      .from('material_request_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  } catch (error: unknown) {
    console.error('[materialRequestOperations.deleteMaterialRequestItem] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка удаления позиции')
  }
}


// Generate next request number
export async function generateRequestNumber(): Promise<string> {
  console.log('[materialRequestOperations.generateRequestNumber] Generating number')

  try {
    const year = new Date().getFullYear()
    const prefix = `МТ-${year}-`

    // Get the latest request number for current year
    const { data, error } = await supabase
      .from('material_requests')
      .select('request_number')
      .like('request_number', `${prefix}%`)
      .order('request_number', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return `${prefix}001`
    }

    const latestNumber = data[0].request_number
    const currentNumber = parseInt(latestNumber.replace(prefix, ''))
    const nextNumber = (currentNumber + 1).toString().padStart(3, '0')

    return `${prefix}${nextNumber}`
  } catch (error: unknown) {
    console.error('[materialRequestOperations.generateRequestNumber] Error:', error)
    // Return a timestamp-based number as fallback
    return `МТ-${new Date().getTime()}`
  }
}

// Load projects and employees for dropdowns
export async function loadMaterialRequestReferences() {
  console.log('[materialRequestOperations.loadMaterialRequestReferences] Loading references')

  try {
    const [projectsResult, employeesResult] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name')
    ])

    if (projectsResult.error) throw projectsResult.error
    if (employeesResult.error) throw employeesResult.error

    return {
      projects: projectsResult.data || [],
      employees: employeesResult.data || []
    }
  } catch (error: unknown) {
    console.error('[materialRequestOperations.loadMaterialRequestReferences] Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Ошибка загрузки справочников')
  }
}