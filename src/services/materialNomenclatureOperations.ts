import { supabase } from '../lib/supabase'

export interface MaterialNomenclature {
  id: number
  name: string
  unit: string
  material_class_id?: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateMaterialNomenclatureData {
  name: string
  unit: string
  material_class_id?: number | null
  is_active?: boolean
}

export interface UpdateMaterialNomenclatureData {
  name?: string
  unit?: string
  material_class_id?: number | null
  is_active?: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  searchText?: string
  classId?: number | null
  activeOnly?: boolean
}

export interface PaginatedResult {
  data: MaterialNomenclature[]
  total: number
  page: number
  pageSize: number
}

// Загрузка номенклатуры с пагинацией
export async function loadMaterialNomenclaturePaginated({
  page = 1,
  pageSize = 50,
  searchText = '',
  classId = null,
  activeOnly = false
}: PaginationParams = {}): Promise<PaginatedResult> {
  console.log('[materialNomenclatureOperations.loadMaterialNomenclaturePaginated] Loading:', {
    page, pageSize, searchText, classId, activeOnly
  })

  try {
    // Сначала получаем общее количество записей
    let countQuery = supabase
      .from('material_nomenclature')
      .select('*', { count: 'exact', head: true })

    if (activeOnly) {
      countQuery = countQuery.eq('is_active', true)
    }

    if (classId !== null) {
      countQuery = countQuery.eq('material_class_id', classId)
    }

    if (searchText) {
      countQuery = countQuery.or(`name.ilike.%${searchText}%,unit.ilike.%${searchText}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) throw countError

    // Теперь загружаем данные с пагинацией
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('material_nomenclature')
      .select('*')
      .range(from, to)
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (classId !== null) {
      query = query.eq('material_class_id', classId)
    }

    if (searchText) {
      query = query.or(`name.ilike.%${searchText}%,unit.ilike.%${searchText}%`)
    }

    const { data, error } = await query

    if (error) throw error

    console.log('[materialNomenclatureOperations.loadMaterialNomenclaturePaginated] Loaded:', {
      count: data?.length,
      total: count
    })

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize
    }
  } catch (error: any) {
    console.error('[materialNomenclatureOperations.loadMaterialNomenclaturePaginated] Error:', error)
    throw error
  }
}

// Загрузка всей номенклатуры (для обратной совместимости, но ограничена 1000 записей)
export async function loadMaterialNomenclature(activeOnly: boolean = false) {
  console.log('[materialNomenclatureOperations.loadMaterialNomenclature] Loading nomenclature:', { activeOnly })

  let query = supabase
    .from('material_nomenclature')
    .select('*')
    .order('name', { ascending: true })
    .limit(1000) // Ограничиваем для безопасности

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[materialNomenclatureOperations.loadMaterialNomenclature] Error:', error)
    throw error
  }

  console.log('[materialNomenclatureOperations.loadMaterialNomenclature] Loaded:', { count: data?.length })
  return data || []
}

export async function searchMaterialNomenclature(searchTerm: string) {
  console.log('[materialNomenclatureOperations.searchMaterialNomenclature] Searching:', { searchTerm })

  if (!searchTerm || searchTerm.length < 2) {
    return []
  }

  const { data, error } = await supabase
    .from('material_nomenclature')
    .select('*')
    .eq('is_active', true)
    .ilike('name', `%${searchTerm}%`)
    .order('name', { ascending: true })
    .limit(20)

  if (error) {
    console.error('[materialNomenclatureOperations.searchMaterialNomenclature] Error:', error)
    throw error
  }

  console.log('[materialNomenclatureOperations.searchMaterialNomenclature] Found:', { count: data?.length })
  return data || []
}

export async function createMaterialNomenclature(nomenclatureData: CreateMaterialNomenclatureData) {
  console.log('[materialNomenclatureOperations.createMaterialNomenclature] Creating:', nomenclatureData)

  const { data, error } = await supabase
    .from('material_nomenclature')
    .insert({
      ...nomenclatureData,
      is_active: nomenclatureData.is_active ?? true
    })
    .select()
    .single()

  if (error) {
    console.error('[materialNomenclatureOperations.createMaterialNomenclature] Error:', error)
    throw error
  }

  console.log('[materialNomenclatureOperations.createMaterialNomenclature] Created:', data)
  return data
}

export async function updateMaterialNomenclature(id: number, updates: UpdateMaterialNomenclatureData) {
  console.log('[materialNomenclatureOperations.updateMaterialNomenclature] Updating:', { id, updates })

  const { data, error } = await supabase
    .from('material_nomenclature')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[materialNomenclatureOperations.updateMaterialNomenclature] Error:', error)
    throw error
  }

  console.log('[materialNomenclatureOperations.updateMaterialNomenclature] Updated:', data)
  return data
}

export async function deleteMaterialNomenclature(id: number) {
  console.log('[materialNomenclatureOperations.deleteMaterialNomenclature] Deleting:', { id })

  const { error } = await supabase
    .from('material_nomenclature')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[materialNomenclatureOperations.deleteMaterialNomenclature] Error:', error)
    throw error
  }

  console.log('[materialNomenclatureOperations.deleteMaterialNomenclature] Deleted successfully')
}

export async function getMaterialNomenclatureById(id: number) {
  console.log('[materialNomenclatureOperations.getMaterialNomenclatureById] Getting:', { id })

  const { data, error } = await supabase
    .from('material_nomenclature')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[materialNomenclatureOperations.getMaterialNomenclatureById] Error:', error)
    throw error
  }

  console.log('[materialNomenclatureOperations.getMaterialNomenclatureById] Found:', data)
  return data
}