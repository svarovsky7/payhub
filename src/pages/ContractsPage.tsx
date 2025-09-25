import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Popconfirm,
  Tag,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Upload,
  List,
  message
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  LinkOutlined,
  FileAddOutlined,
  EyeOutlined,
  UploadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import {
  loadContracts,
  createContract,
  updateContract,
  deleteContract,
  addInvoiceToContract,
  removeInvoiceFromContract,
  loadAvailableInvoices,
  loadContractors,
  loadProjects,
  uploadContractFile,
  deleteAttachment,
  getFileUrl,
  loadContractAttachments,
  type Contract
} from '../services/contractOperations'
import type { UploadFile } from 'antd/es/upload/interface'

const { Title, Text } = Typography
const { TextArea } = Input

export const ContractsPage = () => {
  const { user } = useAuth()

  // State
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [currentContractId, setCurrentContractId] = useState<string | null>(null)

  const [form] = Form.useForm()

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [contractsData, contractorsData, projectsData] = await Promise.all([
        loadContracts(),
        loadContractors(),
        loadProjects()
      ])
      setContracts(contractsData)
      setContractors(contractorsData)
      setProjects(projectsData)
    } finally {
      setLoading(false)
    }
  }

  // Contract handlers
  const handleSubmit = async (values: any) => {
    try {
      const contractData = {
        ...values,
        contract_date: values.contract_date ? dayjs(values.contract_date).format('YYYY-MM-DD') : null
      }

      let contractId: string

      if (editingContract) {
        await updateContract(editingContract.id, contractData)
        contractId = editingContract.id
      } else {
        const newContract = await createContract(contractData, user?.id || '')
        contractId = newContract.id
      }

      // Upload files if any
      if (fileList.length > 0) {
        for (const file of fileList) {
          if (file.originFileObj && !file.url) {
            await uploadContractFile(file.originFileObj, contractId, user?.id || '')
          }
        }
      }

      await loadData()
      setModalVisible(false)
      form.resetFields()
      setEditingContract(null)
      setFileList([])
      setUploadedFiles([])
      setCurrentContractId(null)
    } catch (error) {
      console.error('Error saving contract:', error)
    }
  }

  const handleEdit = async (contract: Contract) => {
    setEditingContract(contract)
    setCurrentContractId(contract.id)
    form.setFieldsValue({
      ...contract,
      contract_date: contract.contract_date ? dayjs(contract.contract_date) : null,
      project_id: contract.project_id
    })

    // Load existing attachments
    const attachments = await loadContractAttachments(contract.id)
    setUploadedFiles(attachments)

    setModalVisible(true)
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

  const handleLinkInvoice = async (invoiceId: string) => {
    if (!selectedContract) return

    try {
      await addInvoiceToContract(selectedContract.id, invoiceId)
      await loadData()
      loadAvailableInvoices().then(setAvailableInvoices)
      message.success('Счет успешно привязан к договору')
    } catch (error) {
      console.error('Error linking invoice:', error)
    }
  }

  const handleUnlinkInvoice = async (contractId: string, invoiceId: string) => {
    try {
      await removeInvoiceFromContract(contractId, invoiceId)
      await loadData()
      message.success('Счет успешно отвязан от договора')
    } catch (error) {
      console.error('Error unlinking invoice:', error)
    }
  }

  // File handlers
  const handleFileUpload = async (options: any) => {
    const { file, onSuccess, onError } = options
    setUploadingFile(true)

    try {
      // If editing existing contract, upload immediately
      if (currentContractId || editingContract) {
        const contractId = currentContractId || editingContract?.id
        const attachment = await uploadContractFile(file, contractId!, user?.id || '')

        // Reload attachments
        const attachments = await loadContractAttachments(contractId!)
        setUploadedFiles(attachments)

        onSuccess(attachment, file)
      } else {
        // For new contract, just add to list and upload after contract creation
        onSuccess({}, file)
      }
    } catch (error) {
      onError(error)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleFileRemove = async (file: UploadFile) => {
    try {
      // If file is already uploaded, delete it
      if (file.uid && uploadedFiles.find(f => f.attachment?.id === file.uid)) {
        const attachment = uploadedFiles.find(f => f.attachment?.id === file.uid)?.attachment
        if (attachment) {
          await deleteAttachment(attachment.id, attachment.storage_path)

          // Reload attachments if editing
          if (currentContractId || editingContract) {
            const contractId = currentContractId || editingContract?.id
            const attachments = await loadContractAttachments(contractId!)
            setUploadedFiles(attachments)
          }
        }
      }
      return true
    } catch (error) {
      console.error('Error removing file:', error)
      return false
    }
  }

  const handleFilePreview = async (file: UploadFile) => {
    let url = file.url

    if (!url && file.originFileObj) {
      url = URL.createObjectURL(file.originFileObj)
    }

    if (!url) {
      const attachment = uploadedFiles.find(f => f.attachment?.id === file.uid)?.attachment
      if (attachment) {
        url = getFileUrl(attachment.storage_path)
      }
    }

    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleDeleteUploadedFile = async (attachmentId: string, storagePath: string) => {
    try {
      await deleteAttachment(attachmentId, storagePath)

      // Reload attachments
      if (currentContractId || editingContract) {
        const contractId = currentContractId || editingContract?.id
        const attachments = await loadContractAttachments(contractId!)
        setUploadedFiles(attachments)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  // Columns
  const columns: ColumnsType<Contract> = [
    {
      title: 'Номер договора',
      dataIndex: 'contract_number',
      key: 'contract_number',
      render: (number) => <Text strong>{number}</Text>,
      sorter: (a, b) => a.contract_number.localeCompare(b.contract_number)
    },
    {
      title: 'Дата договора',
      dataIndex: 'contract_date',
      key: 'contract_date',
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—',
      sorter: (a, b) => {
        const dateA = a.contract_date ? dayjs(a.contract_date).valueOf() : 0
        const dateB = b.contract_date ? dayjs(b.contract_date).valueOf() : 0
        return dateA - dateB
      }
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      render: (_, record) => record.payer?.name || '—'
    },
    {
      title: 'Поставщик',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      render: (_, record) => record.supplier?.name || '—'
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      render: (_, record) => record.project?.name || '—'
    },
    {
      title: 'Ставка НДС',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      render: (rate) => rate ? `${rate}%` : '—',
      align: 'center'
    },
    {
      title: 'Гарантийный срок',
      dataIndex: 'warranty_period_days',
      key: 'warranty_period_days',
      render: (days) => days ? `${days} дн.` : '—',
      align: 'center'
    },
    {
      title: 'Счетов',
      key: 'invoices_count',
      render: (_, record) => {
        const count = record.contract_invoices?.length || 0
        return (
          <Tag color={count > 0 ? 'blue' : 'default'}>
            {count}
          </Tag>
        )
      },
      align: 'center'
    },
    {
      title: 'Файлов',
      key: 'attachments_count',
      render: (_, record) => {
        const count = record.contract_attachments?.length || 0
        return (
          <Tag color={count > 0 ? 'green' : 'default'}>
            {count}
          </Tag>
        )
      },
      align: 'center'
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Привязать счет">
            <Button
              icon={<LinkOutlined />}
              onClick={() => handleAddInvoice(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Удалить договор?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Expanded row render - показ связанных счетов
  const expandedRowRender = (record: Contract) => {
    const invoices = record.contract_invoices || []

    if (invoices.length === 0) {
      return <Text type="secondary">Нет привязанных счетов</Text>
    }

    return (
      <div style={{ padding: '16px 0' }}>
        <Title level={5}>Привязанные счета:</Title>
        <Table
          dataSource={invoices}
          columns={[
            {
              title: 'Номер счета',
              dataIndex: ['invoice', 'invoice_number'],
              key: 'invoice_number',
              render: (number) => number || '—'
            },
            {
              title: 'Дата счета',
              dataIndex: ['invoice', 'invoice_date'],
              key: 'invoice_date',
              render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—'
            },
            {
              title: 'Сумма с НДС',
              dataIndex: ['invoice', 'amount_with_vat'],
              key: 'amount_with_vat',
              render: (amount) => amount ? `${amount.toLocaleString('ru-RU')} ₽` : '—'
            },
            {
              title: 'Действия',
              key: 'actions',
              render: (_, invoiceLink) => (
                <Popconfirm
                  title="Отвязать счет от договора?"
                  onConfirm={() => handleUnlinkInvoice(record.id, invoiceLink.invoice_id)}
                  okText="Отвязать"
                  cancelText="Отмена"
                >
                  <Button
                    type="link"
                    danger
                    size="small"
                  >
                    Отвязать
                  </Button>
                </Popconfirm>
              )
            }
          ]}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>
    )
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
              onClick={() => {
                setEditingContract(null)
                setCurrentContractId(null)
                form.resetFields()
                setFileList([])
                setUploadedFiles([])
                setModalVisible(true)
              }}
            >
              Добавить договор
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={contracts}
          columns={columns}
          loading={loading}
          rowKey="id"
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: setExpandedRowKeys,
            rowExpandable: (record) => (record.contract_invoices?.length || 0) > 0
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`
          }}
        />
      </Card>

      {/* Modal for creating/editing contract */}
      <Modal
        title={editingContract ? 'Редактировать договор' : 'Добавить договор'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingContract(null)
          form.resetFields()
          setFileList([])
          setUploadedFiles([])
          setCurrentContractId(null)
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contract_number"
                label="Номер договора"
                rules={[{ required: true, message: 'Укажите номер договора' }]}
              >
                <Input placeholder="Например: Д-2024-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contract_date"
                label="Дата договора"
                rules={[{ required: true, message: 'Укажите дату договора' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payer_id"
                label="Плательщик"
              >
                <Select
                  placeholder="Выберите плательщика"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={contractors.map(c => ({
                    value: c.id,
                    label: c.name
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplier_id"
                label="Поставщик"
              >
                <Select
                  placeholder="Выберите поставщика"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={contractors.map(c => ({
                    value: c.id,
                    label: c.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project_id"
                label="Проект"
              >
                <Select
                  placeholder="Выберите проект"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={projects.map(p => ({
                    value: p.id,
                    label: p.name
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vat_rate"
                label="Ставка НДС (%)"
                initialValue={20}
              >
                <InputNumber
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                  formatter={value => `${value}%`}
                  parser={value => value?.replace('%', '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="warranty_period_days"
                label="Гарантийный срок (дней)"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Например: 365"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание договора"
          >
            <TextArea
              rows={4}
              placeholder="Краткое описание предмета договора"
            />
          </Form.Item>

          {/* File upload section */}
          <Form.Item label="Файлы договора">
            <Upload
              fileList={fileList}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              customRequest={handleFileUpload}
              onRemove={handleFileRemove}
              onPreview={handleFilePreview}
              multiple
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: true,
                showDownloadIcon: false
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadingFile}>
                Загрузить файлы
              </Button>
            </Upload>

            {/* Display already uploaded files */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Загруженные файлы:</Text>
                <List
                  size="small"
                  dataSource={uploadedFiles}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Tooltip title="Просмотреть">
                          <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              const url = getFileUrl(item.attachment?.storage_path)
                              window.open(url, '_blank')
                            }}
                          />
                        </Tooltip>,
                        <Tooltip title="Удалить">
                          <Popconfirm
                            title="Удалить файл?"
                            onConfirm={() => handleDeleteUploadedFile(item.attachment?.id, item.attachment?.storage_path)}
                            okText="Удалить"
                            cancelText="Отмена"
                          >
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<PaperClipOutlined />}
                        title={item.attachment?.original_name}
                        description={`${(item.attachment?.size_bytes / 1024).toFixed(2)} KB`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingContract ? 'Сохранить' : 'Создать'}
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false)
                  setEditingContract(null)
                  form.resetFields()
                  setFileList([])
                  setUploadedFiles([])
                  setCurrentContractId(null)
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for linking invoices */}
      <Modal
        title={`Привязать счет к договору: ${selectedContract?.contract_number}`}
        open={invoiceModalVisible}
        onCancel={() => {
          setInvoiceModalVisible(false)
          setSelectedContract(null)
        }}
        footer={null}
        width={900}
      >
        {availableInvoices.length === 0 ? (
          <Text type="secondary">Нет доступных счетов для привязки</Text>
        ) : (
          <Table
            dataSource={availableInvoices}
            columns={[
              {
                title: 'Номер счета',
                dataIndex: 'invoice_number',
                key: 'invoice_number'
              },
              {
                title: 'Дата',
                dataIndex: 'invoice_date',
                key: 'invoice_date',
                render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—'
              },
              {
                title: 'Плательщик',
                dataIndex: ['payer', 'name'],
                key: 'payer',
                render: (_, record) => record.payer?.name || '—'
              },
              {
                title: 'Сумма',
                dataIndex: 'amount_with_vat',
                key: 'amount_with_vat',
                render: (amount) => amount ? `${amount.toLocaleString('ru-RU')} ₽` : '—'
              },
              {
                title: 'Действия',
                key: 'actions',
                render: (_, invoice) => (
                  <Button
                    type="link"
                    onClick={() => handleLinkInvoice(invoice.id)}
                  >
                    Привязать
                  </Button>
                )
              }
            ]}
            rowKey="id"
            pagination={false}
            style={{ maxHeight: 400, overflow: 'auto' }}
          />
        )}
      </Modal>
    </div>
  )
}