import { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Button } from 'antd'
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import {
  loadContracts,
  deleteContract,
  loadAvailableInvoices,
  type Contract
} from '../services/contractOperations'
import { ContractsTable } from '../components/contracts/ContractsTable'
import { ContractViewModal } from '../components/contracts/ContractViewModal'
import { AddContractModal } from '../components/contracts/AddContractModal'
import { EditContractModal } from '../components/contracts/EditContractModal'

const { Title } = Typography

export const ContractsPage = () => {

  // State
  const [contracts, setContracts] = useState<Contract[]>([])
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const contractsData = await loadContracts()
      setContracts(contractsData)
    } finally {
      setLoading(false)
    }
  }

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
  const handleAddInvoice = (contract: Contract) => {
    setSelectedContract(contract)
    loadAvailableInvoices().then(setAvailableInvoices)
    setInvoiceModalVisible(true)
  }


  const handleCancelViewModal = () => {
    setInvoiceModalVisible(false)
    setSelectedContract(null)
  }

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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalVisible(true)}
            >
              Добавить договор
            </Button>
          </Col>
        </Row>

        <ContractsTable
          contracts={contracts}
          loading={loading}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onAddInvoice={handleAddInvoice}
          expandedRowKeys={expandedRowKeys}
          onExpandedRowsChange={setExpandedRowKeys}
          onDataChange={loadData}
        />
      </Card>

      <ContractViewModal
        visible={invoiceModalVisible}
        onCancel={handleCancelViewModal}
        selectedContract={selectedContract}
        availableInvoices={availableInvoices}
        onDataChange={loadData}
        onAvailableInvoicesChange={setAvailableInvoices}
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