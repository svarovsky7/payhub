import { Table, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useLetterManagement } from '../hooks/useLetterManagement'
import { getLetterTableColumns } from '../components/letters/LetterTableColumns'
import { LetterFormModal } from '../components/letters/LetterFormModal'
import { LetterViewModal } from '../components/letters/LetterViewModal'

export const LettersPage = () => {
  const {
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
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewLetter,
    handleCreateLetter,
    handleUpdateLetter,
    handleDeleteLetter
  } = useLetterManagement()

  // Table columns
  const columns = getLetterTableColumns({
    letterStatuses,
    projects,
    users,
    handleViewLetter,
    handleEditLetter: handleOpenEditModal,
    handleDeleteLetter
  })

  // Handle form submit
  const handleFormSubmit = async (values: any, files: File[], originalFiles: string[]) => {
    if (editingLetter) {
      await handleUpdateLetter(editingLetter.id, values, files, originalFiles)
    } else {
      await handleCreateLetter(values, files)
    }
  }

  return (
    <div style={{ padding: 24, width: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Письма</h1>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            Добавить письмо
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={letters}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        scroll={{ x: 'max-content' }}
        className="compact-table"
      />

      {/* Letter Form Modal */}
      <LetterFormModal
        visible={letterModalVisible}
        onCancel={() => {
          setLetterModalVisible(false)
          setEditingLetter(null)
        }}
        onSubmit={handleFormSubmit}
        editingLetter={editingLetter}
        letterStatuses={letterStatuses}
        projects={projects}
        users={users}
      />

      {/* Letter View Modal */}
      <LetterViewModal
        visible={viewModalVisible}
        onClose={() => {
          setViewModalVisible(false)
          setViewingLetter(null)
        }}
        letter={viewingLetter}
      />
    </div>
  )
}
