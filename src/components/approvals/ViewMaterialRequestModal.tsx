import { useState, useEffect } from 'react'
import { message, Spin } from 'antd'
import { MaterialRequestViewModal } from '../materialRequests/MaterialRequestViewModal'
import { loadMaterialRequest, loadMaterialRequestReferences } from '../../services/materialRequestOperations'
import type { MaterialRequest } from '../../services/materialRequestOperations'
import type { Project } from '../../lib/supabase'
import type { Employee } from '../../services/employeeOperations'

interface ViewMaterialRequestModalProps {
  visible: boolean
  materialRequestId: string | null
  onClose: () => void
}

export const ViewMaterialRequestModal: React.FC<ViewMaterialRequestModalProps> = ({
  visible,
  materialRequestId,
  onClose
}) => {
  const [loading, setLoading] = useState(false)
  const [request, setRequest] = useState<MaterialRequest | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    if (visible && materialRequestId) {
      loadData()
    }
  }, [visible, materialRequestId])

  const loadData = async () => {
    if (!materialRequestId) return

    setLoading(true)
    try {
      console.log('[ViewMaterialRequestModal] Loading material request:', materialRequestId)

      // Load request and references in parallel
      const [requestData, references] = await Promise.all([
        loadMaterialRequest(materialRequestId),
        loadMaterialRequestReferences()
      ])

      setRequest(requestData)
      setProjects(references.projects)
      setEmployees(references.employees)
    } catch (error) {
      console.error('[ViewMaterialRequestModal] Error loading data:', error)
      message.error('Ошибка загрузки заявки на материалы')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setRequest(null)
    onClose()
  }

  if (!visible) return null

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <MaterialRequestViewModal
      isVisible={visible}
      request={request}
      projects={projects}
      employees={employees}
      onClose={handleClose}
    />
  )
}
