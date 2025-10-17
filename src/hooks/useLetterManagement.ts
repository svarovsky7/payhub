import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import type { Letter, LetterStatus, Project, UserProfile } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import {
  loadLetters,
  loadLetterStatuses,
  createLetter,
  updateLetter,
  deleteLetter,
  getLetterAttachments,
  linkLetters,
  unlinkLetters
} from '../services/letterOperations'
import { useAuth } from '../contexts/AuthContext'
import { createAuditLogEntry } from '../services/auditLogService'

export const useLetterManagement = () => {
  const { user } = useAuth()
  const [letters, setLetters] = useState<Letter[]>([])
  const [letterStatuses, setLetterStatuses] = useState<LetterStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [letterModalVisible, setLetterModalVisible] = useState(false)
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [viewingLetter, setViewingLetter] = useState<Letter | null>(null)
  const [linkModalVisible, setLinkModalVisible] = useState(false)
  const [linkingLetter, setLinkingLetter] = useState<Letter | null>(null)

  // Load initial data
  const loadData = useCallback(async () => {
    console.log('[useLetterManagement.loadData] Loading data')
    setLoading(true)

    try {
      // Load user role to check own_projects_only flag
      let filteredProjects: Project[] = []

      if (user?.id) {
        // Load user profile and role
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('id', user.id)
          .single()

        if (userProfile?.role_id) {
          // Load role data
          const { data: roleData } = await supabase
            .from('roles')
            .select('id, own_projects_only')
            .eq('id', userProfile.role_id)
            .single()

          // If role restricts to own projects only, filter projects
          if (roleData?.own_projects_only) {
            console.log('[useLetterManagement.loadData] Filtering projects for role with own_projects_only')

            const { data: userProjects } = await supabase
              .from('user_projects')
              .select('project_id, projects(*)')
              .eq('user_id', user.id)

            filteredProjects = (userProjects?.map((up: any) => up.projects).filter(Boolean) || []) as Project[]
          } else {
            // Load all projects
            const { data: allProjects } = await supabase
              .from('projects')
              .select('*')
              .order('name')

            filteredProjects = allProjects || []
          }
        } else {
          // No role, load all projects
          const { data: allProjects } = await supabase
            .from('projects')
            .select('*')
            .order('name')

          filteredProjects = allProjects || []
        }
      } else {
        // No user, load all projects
        const { data: allProjects } = await supabase
          .from('projects')
          .select('*')
          .order('name')

        filteredProjects = allProjects || []
      }

      // Load letters, statuses, and users in parallel
      const [lettersData, statusesData, usersData] = await Promise.all([
        loadLetters(user?.id),
        loadLetterStatuses(),
        supabase.from('user_profiles').select('id, full_name, email, created_at, updated_at').order('full_name')
      ])

      setLetters(lettersData)
      setLetterStatuses(statusesData)
      setProjects(filteredProjects)
      setUsers(usersData.data || [])
    } catch (error) {
      console.error('[useLetterManagement.loadData] Error:', error)
      message.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open create modal
  const handleOpenCreateModal = useCallback(() => {
    console.log('[useLetterManagement.handleOpenCreateModal]')
    setEditingLetter(null)
    setLetterModalVisible(true)
  }, [])

  // Open edit modal
  const handleOpenEditModal = useCallback(async (letter: Letter) => {
    console.log('[useLetterManagement.handleOpenEditModal] Letter:', letter)

    // Load attachments for the letter
    try {
      const attachments = await getLetterAttachments(letter.id)
      setEditingLetter({ ...letter, attachments } as any)
      setLetterModalVisible(true)
    } catch (error) {
      console.error('[useLetterManagement.handleOpenEditModal] Error:', error)
      message.error('Ошибка загрузки данных письма')
    }
  }, [])

  // View letter
  const handleViewLetter = useCallback(async (letter: Letter) => {
    console.log('[useLetterManagement.handleViewLetter] Letter:', letter)

    try {
      const attachments = await getLetterAttachments(letter.id)
      setViewingLetter({ ...letter, attachments } as any)
      setViewModalVisible(true)

      // Log view action
      if (user?.id) {
        await createAuditLogEntry('letter', letter.id, 'view', user.id, {
          metadata: {
            letter_number: letter.number,
            subject: letter.subject
          }
        })
      }
    } catch (error) {
      console.error('[useLetterManagement.handleViewLetter] Error:', error)
      message.error('Ошибка загрузки данных письма')
    }
  }, [user?.id])

  // Create letter
  const handleCreateLetter = useCallback(async (letterData: Partial<Letter>, files?: File[], fileDescriptions?: Record<string, string>) => {
    console.log('[useLetterManagement.handleCreateLetter] Data:', letterData)

    try {
      // Close modal immediately for better UX
      setLetterModalVisible(false)
      message.success('Письмо создано')

      // Create in background and add to list when complete
      const newLetter = await createLetter(letterData, files, fileDescriptions)

      // Add new letter to the list
      setLetters(prev => [newLetter, ...prev])
    } catch (error) {
      console.error('[useLetterManagement.handleCreateLetter] Error:', error)
      message.error('Ошибка создания письма')
      throw error
    }
  }, [])

  // Update letter
  const handleUpdateLetter = useCallback(async (
    letterId: string,
    letterData: Partial<Letter>,
    files?: File[],
    originalFiles?: any[],
    fileDescriptions?: Record<string, string>,
    existingFileDescriptions?: Record<string, string>
  ) => {
    console.log('[useLetterManagement.handleUpdateLetter] ID:', letterId, 'Data:', letterData)

    // Store original state for rollback
    const originalLetters = letters

    try {
      // Close modal immediately for better UX
      setLetterModalVisible(false)
      setEditingLetter(null)
      message.success('Письмо обновлено')

      // Update in background and get full data with JOINs
      const updatedLetter = await updateLetter(letterId, letterData, files, originalFiles, fileDescriptions, existingFileDescriptions)

      // Update letter in tree with full data from server
      const updateLetterInTree = (lettersList: Letter[]): Letter[] => {
        return lettersList.map(letter => {
          if (letter.id === letterId) {
            return { ...letter, ...updatedLetter }
          }
          if (letter.children && letter.children.length > 0) {
            return {
              ...letter,
              children: updateLetterInTree(letter.children)
            }
          }
          return letter
        })
      }

      setLetters(updateLetterInTree(letters))
    } catch (error) {
      console.error('[useLetterManagement.handleUpdateLetter] Error:', error)
      // Rollback on error
      setLetters(originalLetters)
      message.error('Ошибка обновления письма')
      throw error
    }
  }, [letters])

  // Delete letter
  const handleDeleteLetter = useCallback(async (letterId: string) => {
    console.log('[useLetterManagement.handleDeleteLetter] ID:', letterId)

    // Store original state for rollback
    const originalLetters = letters

    try {
      // Optimistic delete: remove from UI immediately
      const removeLetterFromTree = (lettersList: Letter[]): Letter[] => {
        return lettersList
          .filter(letter => letter.id !== letterId)
          .map(letter => {
            if (letter.children && letter.children.length > 0) {
              return {
                ...letter,
                children: removeLetterFromTree(letter.children)
              }
            }
            return letter
          })
      }

      setLetters(removeLetterFromTree(letters))
      message.success('Письмо удалено')

      // Delete in background
      await deleteLetter(letterId)
    } catch (error) {
      console.error('[useLetterManagement.handleDeleteLetter] Error:', error)
      // Rollback on error
      setLetters(originalLetters)
      message.error('Ошибка удаления письма')
      throw error
    }
  }, [letters])

  // Open link modal
  const handleOpenLinkModal = useCallback((letter: Letter) => {
    console.log('[useLetterManagement.handleOpenLinkModal] Letter:', letter)
    setLinkingLetter(letter)
    setLinkModalVisible(true)
  }, [])

  // Link letters
  const handleLinkLetters = useCallback(async (parentId: string, childId: string) => {
    console.log('[useLetterManagement.handleLinkLetters] Parent:', parentId, 'Child:', childId)

    try {
      await linkLetters(parentId, childId)
      message.success('Письма связаны')
      setLinkModalVisible(false)
      setLinkingLetter(null)
      await loadData()
    } catch (error) {
      console.error('[useLetterManagement.handleLinkLetters] Error:', error)
      message.error('Ошибка связывания писем')
      throw error
    }
  }, [loadData])

  // Unlink letters
  const handleUnlinkLetters = useCallback(async (parentId: string, childId: string) => {
    console.log('[useLetterManagement.handleUnlinkLetters] Parent:', parentId, 'Child:', childId)

    try {
      await unlinkLetters(parentId, childId)
      message.success('Связь удалена')
      await loadData()
    } catch (error) {
      console.error('[useLetterManagement.handleUnlinkLetters] Error:', error)
      message.error('Ошибка удаления связи')
      throw error
    }
  }, [loadData])

  return {
    letters,
    letterStatuses,
    projects,
    users,
    loading,
    letterModalVisible,
    setLetterModalVisible,
    editingLetter,
    setEditingLetter,
    viewModalVisible,
    setViewModalVisible,
    viewingLetter,
    setViewingLetter,
    linkModalVisible,
    setLinkModalVisible,
    linkingLetter,
    setLinkingLetter,
    loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewLetter,
    handleCreateLetter,
    handleUpdateLetter,
    handleDeleteLetter,
    handleOpenLinkModal,
    handleLinkLetters,
    handleUnlinkLetters
  }
}
