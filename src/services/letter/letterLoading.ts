import { supabase } from '../../lib/supabase'
import type { Letter, LetterStatus } from '../../lib/supabase'

/**
 * Load all letter statuses
 */
export async function loadLetterStatuses(): Promise<LetterStatus[]> {
  console.log('[letterLoading.loadLetterStatuses] Loading letter statuses')

  const { data, error } = await supabase
    .from('letter_statuses')
    .select('*')
    .order('id')

  if (error) {
    console.error('[letterLoading.loadLetterStatuses] Error:', error)
    throw error
  }

  return data || []
}

/**
 * Load all letters with related data and their children
 * Filters by user projects if role has own_projects_only flag set
 */
export async function loadLetters(userId?: string): Promise<Letter[]> {
  console.log('[letterLoading.loadLetters] Loading letters', { userId })

  // Build base query
  let query = supabase
    .from('letters')
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email),
      sender_contractor:contractors!fk_letters_sender_contractor(id, name),
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name)
    `)

  // If userId is provided, check role and filter by user projects if necessary
  if (userId) {
    // Load user profile and role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[letterLoading.loadLetters] Error loading user profile:', profileError)
      throw profileError
    }

    if (userProfile?.role_id) {
      // Load role data
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, own_projects_only')
        .eq('id', userProfile.role_id)
        .single()

      if (roleError) {
        console.error('[letterLoading.loadLetters] Error loading role:', roleError)
        throw roleError
      }

      // If role restricts to own projects only, filter by user's projects
      if (roleData?.own_projects_only) {
        console.log('[letterLoading.loadLetters] Filtering by user projects for role with own_projects_only')

        const { data: userProjects, error: projectsError } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', userId)

        if (projectsError) {
          console.error('[letterLoading.loadLetters] Error loading user projects:', projectsError)
          throw projectsError
        }

        const projectIds = userProjects?.map(p => p.project_id) || []

        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds)
        } else {
          // User has no projects, return empty array
          console.log('[letterLoading.loadLetters] User has no assigned projects')
          return []
        }
      }
    }
  }

  // Execute query
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[letterLoading.loadLetters] Error:', error)
    throw error
  }

  if (!data) return []

  // Get child letter IDs only for letters in the current dataset
  const parentLetterIds = data.map(l => l.id)

  // Use batching to avoid URL length issues (max 50 UUIDs per request)
  const BATCH_SIZE = 50

  // Load child IDs in batches
  const idBatches: string[][] = []
  for (let i = 0; i < parentLetterIds.length; i += BATCH_SIZE) {
    idBatches.push(parentLetterIds.slice(i, i + BATCH_SIZE))
  }

  const childIdResults = await Promise.all(
    idBatches.map(async (batch) => {
      const { data } = await supabase
        .from('letter_links')
        .select('child_id')
        .in('parent_id', batch)
      return data || []
    })
  )

  const childLinks = childIdResults.flat()
  const childLetterIds = new Set(childLinks?.map(link => link.child_id) || [])

  // Filter out child letters from main list
  const parentLetters = data.filter(letter => !childLetterIds.has(letter.id))

  // Load ALL children for all parent letters (with batching)
  if (parentLetterIds.length === 0) {
    return []
  }

  // Split into batches for loading full child data
  const batches: string[][] = []
  for (let i = 0; i < parentLetterIds.length; i += BATCH_SIZE) {
    batches.push(parentLetterIds.slice(i, i + BATCH_SIZE))
  }

  console.log(`[letterLoading.loadLetters] Loading children in ${batches.length} batches`)

  // Load children for each batch in parallel
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from('letter_links')
        .select(`
          parent_id,
          child_letter:letters!letter_links_child_id_fkey(
            *,
            project:projects(id, name, code),
            status:letter_statuses(id, name, code, color),
            responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
            creator:user_profiles!letters_created_by_fkey(id, full_name, email),
            sender_contractor:contractors!fk_letters_sender_contractor(id, name),
            recipient_contractor:contractors!fk_letters_recipient_contractor(id, name)
          )
        `)
        .in('parent_id', batch)

      if (error) {
        console.error('[letterLoading.loadLetters] Error loading batch:', error)
        throw error
      }

      return data || []
    })
  )

  // Flatten all batch results
  const allChildLinks = batchResults.flat()

  // Group children by parent_id
  const childrenByParent = new Map<string, Letter[]>()
  allChildLinks?.forEach((link: any) => {
    const parentId = link.parent_id
    const child = link.child_letter
    if (child) {
      const childWithParent = { ...child, parent_id: parentId }
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, [])
      }
      childrenByParent.get(parentId)!.push(childWithParent)
    }
  })

  // Attach children to parent letters
  const lettersWithChildren = parentLetters.map((letter) => {
    const children = childrenByParent.get(letter.id) || []
    return {
      ...letter,
      children: children.length > 0 ? children : undefined
    }
  })

  return lettersWithChildren
}

/**
 * Get a single letter by ID with all related data
 */
export async function getLetterById(letterId: string): Promise<Letter | null> {
  console.log('[letterLoading.getLetterById] Loading letter:', letterId)

  const { data, error } = await supabase
    .from('letters')
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email)
    `)
    .eq('id', letterId)
    .single()

  if (error) {
    console.error('[letterLoading.getLetterById] Error:', error)
    throw error
  }

  return data
}
