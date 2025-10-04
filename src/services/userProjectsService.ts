import { supabase } from '../lib/supabase'

/**
 * Check if the user's role has own_projects_only enabled
 */
export async function getUserRoleSettings(userId: string): Promise<{
  ownProjectsOnly: boolean
  roleId: number | null
}> {
  console.log('[userProjectsService.getUserRoleSettings] Checking role settings for user:', userId)

  try {
    // Get user profile with role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        role_id,
        role:roles(
          id,
          code,
          name,
          own_projects_only
        )
      `)
      .eq('id', userId)
      .single()

    if (profileError) throw profileError

    if (!userProfile || !userProfile.role) {
      return {
        ownProjectsOnly: false,
        roleId: null
      }
    }

    const role = userProfile.role as any

    return {
      ownProjectsOnly: role.own_projects_only || false,
      roleId: role.id
    }
  } catch (error: unknown) {
    console.error('[userProjectsService.getUserRoleSettings] Error:', error)
    return {
      ownProjectsOnly: false,
      roleId: null
    }
  }
}

/**
 * Get list of project IDs that the user has access to
 */
export async function getUserProjectIds(userId: string): Promise<number[]> {
  console.log('[userProjectsService.getUserProjectIds] Getting projects for user:', userId)

  try {
    const { data: userProjects, error } = await supabase
      .from('user_projects')
      .select('project_id')
      .eq('user_id', userId)

    if (error) throw error

    const projectIds = (userProjects || []).map(up => up.project_id)

    console.log('[userProjectsService.getUserProjectIds] Found projects:', projectIds)

    return projectIds
  } catch (error: unknown) {
    console.error('[userProjectsService.getUserProjectIds] Error:', error)
    return []
  }
}

/**
 * Check if user should see only their own projects and return project IDs
 */
export async function getUserProjectFilter(userId: string): Promise<{
  shouldFilter: boolean
  projectIds: number[]
}> {
  const roleSettings = await getUserRoleSettings(userId)

  if (!roleSettings.ownProjectsOnly) {
    return {
      shouldFilter: false,
      projectIds: []
    }
  }

  const projectIds = await getUserProjectIds(userId)

  return {
    shouldFilter: true,
    projectIds
  }
}
