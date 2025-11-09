import { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Button, Space } from 'antd'
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import {
  loadContracts,
  deleteContract,
  type Contract
} from '../services/contractOperations'
import { ContractsTable } from '../components/contracts/ContractsTable'
import { ContractViewModal } from '../components/contracts/ContractViewModal'
import { AddContractModal } from '../components/contracts/AddContractModal'
import { EditContractModal } from '../components/contracts/EditContractModal'
import { ColumnSettings } from '../components/common/ColumnSettings'
import { getContractTableColumns } from '../components/contracts/ContractTableColumns'
import { useColumnSettings } from '../hooks/useColumnSettings'
import { useAuth } from '../contexts/AuthContext'

const { Title } = Typography

export const ContractsPage = () => {
  const { user } = useAuth()

  // State
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  console.log('[ContractsPage] Render:', { 
    contractsCount: contracts.length, 
    loading, 
    expandedRowKeys,
    userId: user?.id 
  })

  const loadData = async () => {
    if (!user?.id) return

    console.log('[ContractsPage.loadData] Starting...')
    setLoading(true)
    try {
      const contractsData = await loadContracts(user.id)
      console.log('[ContractsPage.loadData] Loaded:', contractsData.length)
      setContracts(contractsData)
    } finally {
      setLoading(false)
    }
  }

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  // Contract handlers
  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setEditModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteContract(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting contract:', error)
    }
  }

  // Invoice management
  const handleViewInvoices = (contract: Contract) => {
    setSelectedContract(contract)
    setInvoiceModalVisible(true)
  }

  const handleCancelViewModal = () => {
    setInvoiceModalVisible(false)
    setSelectedContract(null)
  }

  // Table columns with column settings
  const allColumns = getContractTableColumns({
    contracts,
    onDelete: handleDelete,
    onEdit: handleEdit,
    onAddInvoice: handleViewInvoices
  })

  const { columnConfig, setColumnConfig, visibleColumns, defaultConfig } = useColumnSettings(
    allColumns,
    'contracts_column_settings'
  )

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>
              <FileTextOutlined /> Договоры
            </Title>
          </Col>
          <Col>
            <Space>
              <ColumnSettings
                columns={columnConfig}
                onChange={setColumnConfig}
                defaultColumns={defaultConfig}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddModalVisible(true)}
              >
                Добавить договор
              </Button>
            </Space>
          </Col>
        </Row>

        <ContractsTable
          contracts={contracts}
          loading={loading}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onAddInvoice={handleViewInvoices}
          expandedRowKeys={expandedRowKeys}
          onExpandedRowsChange={(keys) => {
            console.log('[ContractsPage.onExpandedRowsChange]', keys)
            setExpandedRowKeys(keys)
          }}
          onDataChange={loadData}
          columns={visibleColumns}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page, size) => {
            console.log('[ContractsPage.onPageChange]', { page, size })
            setCurrentPage(page)
            setPageSize(size)
            setExpandedRowKeys([])
          }}
        />
      </Card>

      <ContractViewModal
        visible={invoiceModalVisible}
        onCancel={handleCancelViewModal}
        selectedContract={selectedContract}
        onDataChange={loadData}
      />

      <AddContractModal
        visible={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onSuccess={loadData}
      />

      <EditContractModal
        visible={editModalVisible}
        contract={editingContract}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingContract(null)
        }}
        onSuccess={loadData}
      />
    </div>
  )
}