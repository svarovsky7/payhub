import { supabase } from '../../lib/supabase'
import type { Letter, LetterStatus } from '../../lib/supabase'

/**
 * Load all letter statuses
 */
export async function loadLetterStatuses(): Promise<LetterStatus[]> {
  const { data, error } = await supabase
    .from('letter_statuses')
    .select('*')
    .order('id')

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Load all letters with related data and their children
 * Filters by user projects if role has own_projects_only flag set
 */
export async function loadLetters(userId?: string): Promise<Letter[]> {
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
      attachments:letter_attachments(
        id,
        attachment:attachments(
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type
        )
      )
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
        throw roleError
      }

      // If role restricts to own projects only, filter by user's projects
      if (roleData?.own_projects_only) {
        const { data: userProjects, error: projectsError } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', userId)

        if (projectsError) {
          throw projectsError
        }

        const projectIds = userProjects?.map(p => p.project_id) || []

        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds)
        } else {
          // User has no projects, return empty array
          return []
        }
      }
    }
  }

  // Execute query
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!data) return []

  // Get ALL letter links once to identify parent-child relationships
  const { data: allLinks, error: linksError } = await supabase
    .from('letter_links')
    .select('parent_id, child_id')

  if (linksError) {
    throw linksError
  }

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
  const lettersWithChildren = parentLetters.map((letter) => {
    const children = getAllDescendants(letter.id)
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
    throw error
  }

  return data
}
