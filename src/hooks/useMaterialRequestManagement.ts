import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import {
  createMaterialRequest,
  loadMaterialRequest,
  loadMaterialRequests,
  updateMaterialRequest,
  deleteMaterialRequest,
  addMaterialRequestItems,
  updateMaterialRequestItem,
  deleteMaterialRequestItem,
  generateRequestNumber,
  loadMaterialRequestReferences
} from '../services/materialRequestOperations'
import type {
  MaterialRequest,
  MaterialRequestItem,
  CreateMaterialRequestInput,
  UpdateMaterialRequestInput
} from '../services/materialRequestOperations'
import type { Project } from '../lib/supabase'
import type { Employee } from '../services/employeeOperations'

export function useMaterialRequestManagement() {
  const { user } = useAuth()

  // State
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<MaterialRequest | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Load material requests
  const loadData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    console.log('[useMaterialRequestManagement.loadData] Loading material requests')

    try {
      const [requestsData, referencesData] = await Promise.all([
        loadMaterialRequests(user.id),
        loadMaterialRequestReferences()
      ])

      setMaterialRequests(requestsData)
      setProjects(referencesData.projects)
      setEmployees(referencesData.employees)

      console.log('[useMaterialRequestManagement.loadData] Loaded:', {
        requests: requestsData.length,
        projects: referencesData.projects.length,
        employees: referencesData.employees.length
      })
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.loadData] Error:', error)
      message.error(error.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Initial load
  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id, loadData])

  // Create material request
  const handleCreateRequest = useCallback(async (input: CreateMaterialRequestInput) => {
    if (!user?.id) return

    console.log('[useMaterialRequestManagement.handleCreateRequest] Creating:', input)

    try {
      // Generate request number if not provided
      if (!input.request_number) {
        input.request_number = await generateRequestNumber()
      }

      const newRequest = await createMaterialRequest(user.id, input)

      // Update state
      setMaterialRequests(prev => [newRequest, ...prev])
      setModalVisible(false)
      setEditingRequest(null)

      message.success('Заявка на материалы создана')
      return newRequest
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleCreateRequest] Error:', error)
      message.error(error.message || 'Ошибка создания заявки')
      throw error
    }
  }, [user])

  // Update material request
  const handleUpdateRequest = useCallback(async (
    requestId: string,
    input: UpdateMaterialRequestInput
  ) => {
    console.log('[useMaterialRequestManagement.handleUpdateRequest] Updating:', {
      requestId,
      input
    })

    try {
      const updatedRequest = await updateMaterialRequest(requestId, input)

      // Update state
      setMaterialRequests(prev =>
        prev.map(req => req.id === requestId ? updatedRequest : req)
      )
      setModalVisible(false)
      setEditingRequest(null)

      message.success('Заявка обновлена')
      return updatedRequest
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleUpdateRequest] Error:', error)
      message.error(error.message || 'Ошибка обновления заявки')
      throw error
    }
  }, [])

  // Delete material request
  const handleDeleteRequest = useCallback(async (requestId: string) => {
    console.log('[useMaterialRequestManagement.handleDeleteRequest] Deleting:', requestId)

    try {
      await deleteMaterialRequest(requestId)

      // Update state
      setMaterialRequests(prev => prev.filter(req => req.id !== requestId))

      message.success('Заявка удалена')
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleDeleteRequest] Error:', error)
      message.error(error.message || 'Ошибка удаления заявки')
      throw error
    }
  }, [])

  // Add items to request
  const handleAddItems = useCallback(async (
    requestId: string,
    items: Omit<MaterialRequestItem, 'id' | 'material_request_id' | 'created_at'>[]
  ) => {
    console.log('[useMaterialRequestManagement.handleAddItems] Adding items:', {
      requestId,
      items
    })

    try {
      const newItems = await addMaterialRequestItems(requestId, items)

      // Reload the request to get updated data
      const updatedRequest = await loadMaterialRequest(requestId)
      setMaterialRequests(prev =>
        prev.map(req => req.id === requestId ? updatedRequest : req)
      )

      message.success('Позиции добавлены')
      return newItems
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleAddItems] Error:', error)
      message.error(error.message || 'Ошибка добавления позиций')
      throw error
    }
  }, [])

  // Update item
  const handleUpdateItem = useCallback(async (
    itemId: string,
    input: Partial<Omit<MaterialRequestItem, 'id' | 'material_request_id' | 'created_at'>>
  ) => {
    console.log('[useMaterialRequestManagement.handleUpdateItem] Updating item:', {
      itemId,
      input
    })

    try {
      const updatedItem = await updateMaterialRequestItem(itemId, input)

      // Find and update the request containing this item
      const request = materialRequests.find(req =>
        req.items?.some(item => item.id === itemId)
      )

      if (request) {
        const updatedRequest = await loadMaterialRequest(request.id)
        setMaterialRequests(prev =>
          prev.map(req => req.id === request.id ? updatedRequest : req)
        )
      }

      message.success('Позиция обновлена')
      return updatedItem
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleUpdateItem] Error:', error)
      message.error(error.message || 'Ошибка обновления позиции')
      throw error
    }
  }, [materialRequests])

  // Delete item
  const handleDeleteItem = useCallback(async (itemId: string) => {
    console.log('[useMaterialRequestManagement.handleDeleteItem] Deleting item:', itemId)

    try {
      await deleteMaterialRequestItem(itemId)

      // Find and update the request containing this item
      const request = materialRequests.find(req =>
        req.items?.some(item => item.id === itemId)
      )

      if (request) {
        const updatedRequest = await loadMaterialRequest(request.id)
        setMaterialRequests(prev =>
          prev.map(req => req.id === request.id ? updatedRequest : req)
        )
      }

      message.success('Позиция удалена')
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleDeleteItem] Error:', error)
      message.error(error.message || 'Ошибка удаления позиции')
      throw error
    }
  }, [materialRequests])

  // Open create modal
  const handleOpenCreateModal = useCallback(() => {
    setEditingRequest(null)
    setModalVisible(true)
  }, [])

  // Open edit modal
  const handleOpenEditModal = useCallback(async (request: MaterialRequest) => {
    console.log('[useMaterialRequestManagement.handleOpenEditModal] Opening edit for:', request.id)

    try {
      // Load full request data with items
      const fullRequest = await loadMaterialRequest(request.id)
      setEditingRequest(fullRequest)
      setModalVisible(true)
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleOpenEditModal] Error:', error)
      message.error('Ошибка загрузки заявки')
    }
  }, [])

  // View request details
  const handleViewRequest = useCallback(async (request: MaterialRequest) => {
    console.log('[useMaterialRequestManagement.handleViewRequest] Viewing:', request.id)

    try {
      // Load full request data with items
      const fullRequest = await loadMaterialRequest(request.id)
      setViewingRequest(fullRequest)
      setViewModalVisible(true)
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleViewRequest] Error:', error)
      message.error('Ошибка загрузки заявки')
    }
  }, [])

  // Toggle expanded row
  const handleExpandRow = useCallback((requestId: string) => {
    console.log('[useMaterialRequestManagement.handleExpandRow] Toggle expand for:', requestId)

    // Toggle expanded state
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(requestId)) {
        next.delete(requestId)
      } else {
        next.add(requestId)
      }
      return next
    })
  }, [])

  // Generate next request number
  const handleGenerateRequestNumber = useCallback(async () => {
    try {
      return await generateRequestNumber()
    } catch (error: any) {
      console.error('[useMaterialRequestManagement.handleGenerateRequestNumber] Error:', error)
      message.error('Ошибка генерации номера заявки')
      throw error
    }
  }, [])

  return {
    // Data
    materialRequests,
    projects,
    employees,
    loading,

    // Modal state
    modalVisible,
    setModalVisible,
    editingRequest,
    setEditingRequest,
    viewModalVisible,
    setViewModalVisible,
    viewingRequest,
    setViewingRequest,

    // Expanded rows
    expandedRows,
    handleExpandRow,

    // Actions
    loadData,
    handleCreateRequest,
    handleUpdateRequest,
    handleDeleteRequest,
    handleAddItems,
    handleUpdateItem,
    handleDeleteItem,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewRequest,
    handleGenerateRequestNumber
  }
}