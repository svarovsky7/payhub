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
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name),
      letter_attachments(count)
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

  // Get ALL letter links once to identify parent-child relationships
  const { data: allLinks, error: linksError } = await supabase
    .from('letter_links')
    .select('parent_id, child_id')

  if (linksError) {
    console.error('[letterLoading.loadLetters] Error loading letter_links:', linksError)
    throw linksError
  }

  console.log('[letterLoading.loadLetters] Total letter_links found:', allLinks?.length || 0)

  // Build a map: parent_id -> array of child_ids for O(1) lookup
  const parentToChildrenMap = new Map<string, string[]>()
  allLinks?.forEach(link => {
    const children = parentToChildrenMap.get(link.parent_id) || []
    children.push(link.child_id)
    parentToChildrenMap.set(link.parent_id, children)
  })

  // Create a set of all child letter IDs
  const childLetterIds = new Set(allLinks?.map(link => link.child_id) || [])

  // Filter out child letters from main list to get only top-level parents
  const parentLetters = data.filter(letter => !childLetterIds.has(letter.id))

  console.log('[letterLoading.loadLetters] Total letters loaded:', data.length)
  console.log('[letterLoading.loadLetters] Top-level parent letters:', parentLetters.length)

  // Create a map of all letters by ID for easy lookup
  const lettersById = new Map<string, Letter>()
  data.forEach(letter => lettersById.set(letter.id, letter))

  // Function to get all descendants of a parent letter (flattened to one level) - NO DB QUERIES
  const getAllDescendants = (parentId: string): Letter[] => {
    const allDescendants: Letter[] = []
    const visited = new Set<string>()
    const queue: string[] = [parentId]

    // BFS to collect all descendants using in-memory map
    while (queue.length > 0) {
      const currentId = queue.shift()!

      if (visited.has(currentId)) {
        continue
      }
      visited.add(currentId)

      const childIds = parentToChildrenMap.get(currentId) || []

      for (const childId of childIds) {
        const childLetter = lettersById.get(childId)
        if (childLetter) {
          // Add all descendants to the same level
          allDescendants.push({
            ...childLetter,
            parent_id: parentId
          })
          // Add to queue to find its children
          queue.push(childId)
        }
      }
    }

    return allDescendants
  }

  // Build hierarchy for all parent letters (NO MORE ASYNC CALLS)
  console.log('[letterLoading.loadLetters] Building one-level hierarchy in memory')
  const lettersWithChildren = parentLetters.map((letter) => {
    const children = getAllDescendants(letter.id)
    return {
      ...letter,
      children: children.length > 0 ? children : undefined
    }
  })

  console.log('[letterLoading.loadLetters] Finished loading, returning', lettersWithChildren.length, 'letters')

  // Log the final structure for debugging (one-level only)
  const logStructure = (lettersList: Letter[]) => {
    lettersList.forEach(letter => {
      console.log(`Letter: ${letter.number} (ID: ${letter.id})`)
      if (letter.children && letter.children.length > 0) {
        console.log(`  Children: ${letter.children.length}`)
        letter.children.forEach(child => {
          console.log(`    - ${child.number} (ID: ${child.id})`)
        })
      }
    })
  }

  console.log('[letterLoading.loadLetters] Final structure (one-level hierarchy):')
  logStructure(lettersWithChildren)

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
