import { Table, Button, Space, Modal, App, Empty } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ExpandableConfig } from 'antd/es/table/interface'
import { useAuth } from '../contexts/AuthContext'
import { useMaterialRequestManagement } from '../hooks/useMaterialRequestManagement'
import { getMaterialRequestTableColumns } from '../components/materialRequests/MaterialRequestTableColumns'
import { MaterialRequestFormModal } from '../components/materialRequests/MaterialRequestFormModal'
import { MaterialRequestViewModal } from '../components/materialRequests/MaterialRequestViewModal'
import { MaterialRequestItemsTable } from '../components/materialRequests/MaterialRequestItemsTable'
import type { MaterialRequest } from '../services/materialRequestOperations'

export const MaterialRequestsPage = () => {
  const { user } = useAuth()
  const { modal } = App.useApp()

  const {
    materialRequests,
    projects,
    employees,
    loading,
    modalVisible,
    setModalVisible,
    editingRequest,
    setEditingRequest,
    viewModalVisible,
    setViewModalVisible,
    viewingRequest,
    setViewingRequest,
    expandedRows,
    handleCreateRequest,
    handleUpdateRequest,
    handleDeleteRequest,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewRequest,
    handleExpandRow,
    handleGenerateRequestNumber
  } = useMaterialRequestManagement()

  // Handle form submit
  const handleFormSubmit = async (values: any) => {
    if (editingRequest) {
      const { items, ...requestData } = values
      await handleUpdateRequest(editingRequest.id, requestData)
    } else {
      await handleCreateRequest(values)
    }
  }

  // Handle delete with confirmation
  const handleConfirmDelete = (requestId: string) => {
    modal.confirm({
      title: 'Удалить заявку?',
      content: 'Это действие нельзя отменить. Все позиции заявки также будут удалены.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        await handleDeleteRequest(requestId)
      }
    })
  }

  // Table columns
  const columns = getMaterialRequestTableColumns({
    projects,
    employees,
    handleViewRequest,
    handleEditRequest: handleOpenEditModal,
    handleDeleteRequest: handleConfirmDelete,
    handleExpandRow,
    expandedRows
  })

  // Expandable configuration
  const expandable: ExpandableConfig<MaterialRequest> = {
    expandedRowRender: (record) => (
      <MaterialRequestItemsTable
        items={record.items || []}
        loading={false}
      />
    ),
    rowExpandable: (record) => (record.items?.length || 0) > 0, // Only show expand if has items
    expandedRowKeys: Array.from(expandedRows),
    onExpand: (expanded, record) => {
      handleExpandRow(record.id)
    },
    expandRowByClick: true,
    showExpandColumn: false,
    expandedRowClassName: () => 'expanded-row-animated'
  }

  return (
    <div style={{ padding: 24, width: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Заявки на материалы</h1>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            Создать заявку
          </Button>
        </Space>
      </div>

      {materialRequests.length === 0 && !loading ? (
        <Empty
          description="Нет заявок на материалы"
          style={{ marginTop: 100 }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            Создать первую заявку
          </Button>
        </Empty>
      ) : (
        <Table
          columns={columns}
          dataSource={materialRequests}
          rowKey="id"
          loading={loading}
          expandable={expandable}
          scroll={{ x: true }}
          tableLayout="auto"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onRow={() => ({
            style: { cursor: 'pointer' }
          })}
          style={{ width: '100%' }}
        />
      )}

      {/* Create/Edit Modal */}
      <MaterialRequestFormModal
        isVisible={modalVisible}
        editingRequest={editingRequest}
        onClose={() => {
          setModalVisible(false)
          setEditingRequest(null)
        }}
        onSubmit={handleFormSubmit}
        projects={projects}
        employees={employees}
        onGenerateRequestNumber={handleGenerateRequestNumber}
      />

      {/* View Modal */}
      <MaterialRequestViewModal
        isVisible={viewModalVisible}
        request={viewingRequest}
        projects={projects}
        employees={employees}
        onClose={() => {
          setViewModalVisible(false)
          setViewingRequest(null)
        }}
      />
    </div>
  )
}