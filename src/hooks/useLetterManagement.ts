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
  getLetterAttachments
} from '../services/letterOperations'

export const useLetterManagement = () => {
  const [letters, setLetters] = useState<Letter[]>([])
  const [letterStatuses, setLetterStatuses] = useState<LetterStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [letterModalVisible, setLetterModalVisible] = useState(false)
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [viewingLetter, setViewingLetter] = useState<Letter | null>(null)

  // Load initial data
  const loadData = useCallback(async () => {
    console.log('[useLetterManagement.loadData] Loading data')
    setLoading(true)

    try {
      // Load letters, statuses, projects, and users in parallel
      const [lettersData, statusesData, projectsData, usersData] = await Promise.all([
        loadLetters(),
        loadLetterStatuses(),
        supabase.from('projects').select('*').order('name'),
        supabase.from('user_profiles').select('id, full_name, email, created_at, updated_at').order('full_name')
      ])

      setLetters(lettersData)
      setLetterStatuses(statusesData)
      setProjects(projectsData.data || [])
      setUsers(usersData.data || [])
    } catch (error) {
      console.error('[useLetterManagement.loadData] Error:', error)
      message.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [])

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
    } catch (error) {
      console.error('[useLetterManagement.handleViewLetter] Error:', error)
      message.error('Ошибка загрузки данных письма')
    }
  }, [])

  // Create letter
  const handleCreateLetter = useCallback(async (letterData: Partial<Letter>, files?: File[]) => {
    console.log('[useLetterManagement.handleCreateLetter] Data:', letterData)

    try {
      await createLetter(letterData, files)
      message.success('Письмо создано')
      setLetterModalVisible(false)
      await loadData()
    } catch (error) {
      console.error('[useLetterManagement.handleCreateLetter] Error:', error)
      message.error('Ошибка создания письма')
      throw error
    }
  }, [loadData])

  // Update letter
  const handleUpdateLetter = useCallback(async (
    letterId: string,
    letterData: Partial<Letter>,
    files?: File[],
    originalFiles?: any[]
  ) => {
    console.log('[useLetterManagement.handleUpdateLetter] ID:', letterId, 'Data:', letterData)

    try {
      await updateLetter(letterId, letterData, files, originalFiles)
      message.success('Письмо обновлено')
      setLetterModalVisible(false)
      setEditingLetter(null)
      await loadData()
    } catch (error) {
      console.error('[useLetterManagement.handleUpdateLetter] Error:', error)
      message.error('Ошибка обновления письма')
      throw error
    }
  }, [loadData])

  // Delete letter
  const handleDeleteLetter = useCallback(async (letterId: string) => {
    console.log('[useLetterManagement.handleDeleteLetter] ID:', letterId)

    try {
      await deleteLetter(letterId)
      message.success('Письмо удалено')
      await loadData()
    } catch (error) {
      console.error('[useLetterManagement.handleDeleteLetter] Error:', error)
      message.error('Ошибка удаления письма')
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
    loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewLetter,
    handleCreateLetter,
    handleUpdateLetter,
    handleDeleteLetter
  }
}
