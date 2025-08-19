import { useState, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Alert,
  message,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  List,
  Progress,
} from 'antd';
import {
  ExclamationCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ProjectOutlined,
  UserOutlined,
  BankOutlined,
  CalculatorOutlined,
  CloudUploadOutlined,
  InboxOutlined,
  PaperClipOutlined,
  EyeOutlined,
  DeleteOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice, Attachment } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { InvoiceActions } from '@/shared/components';
import { invoiceApi, attachmentApi } from '@/entities';
import { contractorApi } from '@/entities/contractor';
import { payerApi } from '@/entities/payer';
import { projectApi } from '@/entities/project';
import locale from 'antd/es/date-picker/locale/ru_RU';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export function SupplyApprovalPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [includeVat, setIncludeVat] = useState(true);
  const [vatDisplay, setVatDisplay] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Calculate delivery date excluding weekends
  const calculateDeliveryDate = (startDate: Date, days: number): Date => {
    const result = new Date(startDate);
    // Get next working day
    if (result.getDay() === 5) result.setDate(result.getDate() + 3);
    else if (result.getDay() === 6) result.setDate(result.getDate() + 2);
    else result.setDate(result.getDate() + 1);
    // Add calendar days
    result.setDate(result.getDate() + days);
    return result;
  };

  // Fetch invoices for Supply approval
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['supply-invoices'],
    queryFn: () => invoiceApi.getByStatus('supply_review'),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch reference data for dropdowns
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorApi.getAll,
  });

  const { data: payers = [] } = useQuery({
    queryKey: ['payers'],
    queryFn: payerApi.getAll,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => invoiceApi.approve(id, 'supply_review'),
    onSuccess: async () => {
      message.success('Счет передан в оплату');
      
      // Small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supply-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
    onError: (error) => {
      console.error('Failed to approve invoice:', error);
      message.error('Ошибка при согласовании счета');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (invoice: Partial<Invoice> & { id: number }) => 
      invoiceApi.update(invoice.id, invoice),
    onSuccess: async () => {
      message.success('Счет успешно обновлен');
      setIsEditModalOpen(false);
      setSelectedInvoice(null);
      form.resetFields();
      
      await queryClient.invalidateQueries({ queryKey: ['supply-invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error('Failed to update invoice:', error);
      message.error('Ошибка при обновлении счета');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      invoiceApi.reject(id, 'supply_review', reason),
    onSuccess: async () => {
      message.success('Счет отклонен');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedInvoice(null);
      
      // Small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supply-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
    onError: (error) => {
      console.error('Failed to reject invoice:', error);
      message.error('Ошибка при отклонении счета');
    },
  });

  const handleEdit = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    // Always display the total amount (which includes VAT by default)
    const displayAmount = invoice.total_amount;
    
    // Calculate and display VAT
    if (displayAmount) {
      const withoutVat = Math.round(displayAmount / 1.2 * 100) / 100;
      const vatAmount = Math.round((displayAmount - withoutVat) * 100) / 100;
      setVatDisplay(`Без НДС: ${withoutVat.toLocaleString('ru-RU')} ₽ | НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽`);
    }
    
    // Calculate expected delivery date if delivery_days exists
    if (invoice.delivery_days) {
      const today = new Date();
      const deliveryDate = calculateDeliveryDate(today, invoice.delivery_days);
      setExpectedDeliveryDate(deliveryDate);
    } else {
      setExpectedDeliveryDate(null);
    }
    
    form.setFieldsValue({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : null,
      contractor_id: invoice.contractor_id,
      payer_id: invoice.payer_id,
      project_id: invoice.project_id,
      amount: displayAmount,
      description: invoice.description,
      delivery_days: invoice.delivery_days,
      rukstroy_amount: invoice.rukstroy_amount,
    });
    
    // Load existing attachments for the invoice
    try {
      const existingAttachments = await attachmentApi.getByInvoiceId(invoice.id);
      setAttachments(existingAttachments);
      
      // Convert to fileList format for Upload component
      const files = existingAttachments.map((att, index) => ({
        uid: `-${index}`,
        name: att.file_name,
        status: 'done',
        url: attachmentApi.getPublicUrl(att.file_path),
        attachmentId: att.id,
      }));
      setFileList(files);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
    
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedInvoice) {
        // Calculate VAT amounts based on includeVat flag
        const inputAmount = values.amount || 0;
        let totalAmount, withoutVat, vatAmount;
        
        if (includeVat) {
          // Сумма введена с НДС
          totalAmount = inputAmount;
          withoutVat = Math.round(inputAmount / 1.2 * 100) / 100;
          vatAmount = Math.round((totalAmount - withoutVat) * 100) / 100;
        } else {
          // Сумма введена без НДС
          withoutVat = inputAmount;
          vatAmount = Math.round(inputAmount * 0.2 * 100) / 100;
          totalAmount = Math.round((withoutVat + vatAmount) * 100) / 100;
        }

        const updatedInvoice = {
          id: selectedInvoice.id,
          invoice_number: values.invoice_number,
          invoice_date: values.invoice_date ? values.invoice_date.format('YYYY-MM-DD') : null,
          contractor_id: values.contractor_id,
          payer_id: values.payer_id,
          project_id: values.project_id,
          total_amount: totalAmount,
          vat_amount: vatAmount,
          without_vat: withoutVat,
          description: values.description,
          delivery_days: values.delivery_days,
          // rukstroy_amount не обновляем - оно только для чтения
        };
        
        await updateMutation.mutateAsync(updatedInvoice);
        
        // Handle attachments
        for (const attachment of uploadedAttachments) {
          await attachmentApi.linkToInvoice(attachment.id, selectedInvoice.id);
        }
        
        const currentIds = fileList
          .filter(f => f.attachmentId)
          .map(f => f.attachmentId);
        const toDelete = attachments.filter(a => !currentIds.includes(a.id));
        
        for (const attachment of toDelete) {
          await attachmentApi.unlinkFromInvoice(attachment.id, selectedInvoice.id);
          await attachmentApi.delete(attachment.id);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleApprove = (invoice: Invoice) => {
    approveMutation.mutate(invoice.id);
  };

  const handleReject = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedInvoice) {
      rejectMutation.mutate({ 
        id: selectedInvoice.id, 
        reason: rejectReason 
      });
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => file.size <= 50 * 1024 * 1024);
    
    validFiles.forEach(async (file) => {
      const uid = `${Date.now()}-${Math.random()}`;
      
      // Add to fileList immediately with uploading status
      setFileList(prev => [...prev, {
        uid,
        name: file.name,
        status: 'uploading',
        percent: 0,
      }]);
      
      try {
        // Upload file
        const attachment = await attachmentApi.upload(file, selectedInvoice?.id);
        
        // Update fileList with success status
        setFileList(prev => prev.map(f => 
          f.uid === uid 
            ? {
                uid: f.uid,
                name: f.name,
                status: 'done',
                url: attachmentApi.getPublicUrl(attachment.file_path),
                attachmentId: attachment.id,
                percent: 100,
              }
            : f
        ));
        
        setUploadedAttachments(prev => [...prev, attachment]);
        message.success(`${file.name} загружен успешно`);
      } catch (error) {
        console.error('Upload error:', error);
        
        // Update fileList with error status
        setFileList(prev => prev.map(f =>
          f.uid === uid
            ? { ...f, status: 'error' }
            : f
        ));
        
        message.error(`Ошибка загрузки ${file.name}`);
      }
    });
    
    if (files.length > validFiles.length) {
      message.warning(`${files.length - validFiles.length} файл(ов) превышают максимальный размер 50MB`);
    }
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedInvoice(null);
    form.resetFields();
    setFileList([]);
    setAttachments([]);
    setUploadedAttachments([]);
    setExpectedDeliveryDate(null);
    setIncludeVat(true);
    setVatDisplay('');
  };

  const getStatusTag = (status: string | null) => {
    const statusConfig = {
      supply_review: { color: 'processing', text: 'На согласовании Снабжения' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status || 'Не указан' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Номер счета',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 120,
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 100,
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'Поставщик',
      dataIndex: ['contractor', 'name'],
      key: 'contractor',
      width: 200,
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      width: 150,
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 150,
    },
    {
      title: 'Сумма счета',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount) => new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
      }).format(amount),
    },
    {
      title: 'Сумма Рукстроя',
      dataIndex: 'rukstroy_amount',
      key: 'rukstroy_amount',
      width: 120,
      render: (amount) => {
        if (!amount) {
          return <span style={{ color: '#d9d9d9' }}>—</span>;
        }
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
        }).format(amount);
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: getStatusTag,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <InvoiceActions
          invoice={record}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onReject={handleReject}
          size="small"
          showApprove={true}
          showEdit={true}
          showDelete={false}
          showReject={true}
          showView={true}
          showSubmit={false}
        />
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Согласование Снабжения</Title>
        </Col>
        <Col>
          <Tag color="processing">
            Всего счетов: {invoices.length}
          </Tag>
        </Col>
      </Row>

      {error && (
        <Alert
          message="Ошибка загрузки данных"
          description={`Не удалось загрузить счета. ${error instanceof Error ? error.message : 'Пожалуйста, проверьте подключение к интернету и попробуйте обновить страницу.'}`}
          type="error"
          icon={<ExclamationCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          }
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего: ${total} счетов`,
          }}
          scroll={{ x: 'max-content' }}
          tableLayout="auto"
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        open={isEditModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={1000}
        centered
        style={{
          top: 20,
          maxWidth: '1200px'
        }}
        className="modern-invoice-modal"
        styles={{
          content: {
            padding: 0,
            borderRadius: 16,
            overflow: 'hidden'
          },
          body: {
            padding: 0
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.45)'
          }
        }}
        closeIcon={null}
      >
        <div className="modern-invoice-form">
          <style>
            {`
              .modern-invoice-form .ant-select-single:not(.ant-select-customize-input) .ant-select-selector {
                height: 48px !important;
                padding: 0 11px !important;
                display: flex !important;
                align-items: center !important;
              }
              
              .modern-invoice-form .ant-select-selection-search {
                display: flex !important;
                align-items: center !important;
              }
              
              .modern-invoice-form .ant-select-selection-item,
              .modern-invoice-form .ant-select-selection-placeholder {
                line-height: 48px !important;
                display: flex !important;
                align-items: center !important;
              }
              
              .modern-invoice-form .ant-select-arrow {
                top: 50% !important;
                transform: translateY(-50%) !important;
                right: 11px !important;
              }
              
              .modern-invoice-form .ant-input-number {
                height: 48px !important;
              }
              
              .modern-invoice-form .ant-input-number-input {
                height: 46px !important;
              }
              
              .modern-invoice-form .ant-picker {
                height: 48px !important;
              }
              
              .modern-invoice-form .ant-picker-input > input {
                height: 46px !important;
              }
            `}
          </style>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px 32px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileTextOutlined style={{ fontSize: 20 }} />
                </div>
                <Title level={3} style={{ margin: 0, color: 'white' }}>
                  Редактировать счет
                </Title>
              </div>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleModalClose}
                style={{ color: 'white' }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div style={{ padding: 32, maxHeight: 'calc(85vh - 100px)', overflowY: 'auto' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveEdit}
              className="modern-form"
            >
              {/* Basic Info Section */}
              <Card 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <Row gutter={[20, 0]}>
                  <Col span={8}>
                    <Form.Item
                      name="invoice_number"
                      label={
                        <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                          Номер счета <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Введите номер счета' },
                      ]}
                    >
                      <Input 
                        placeholder="Например: СЧ-001"
                        size="large"
                        prefix={<FileTextOutlined style={{ color: '#8c8c8c' }} />}
                        style={{ 
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        autoComplete="off"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="invoice_date"
                      label={
                        <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          Дата счета <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Выберите дату счета' },
                      ]}
                    >
                      <DatePicker
                        locale={locale}
                        style={{ 
                          width: '100%',
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        format="DD.MM.YYYY"
                        placeholder="Выберите дату"
                        size="large"
                        suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="project_id"
                      label={
                        <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                          <ProjectOutlined style={{ marginRight: 4 }} />
                          Проект <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Выберите проект' },
                      ]}
                    >
                      <Select
                        placeholder="Выберите проект"
                        showSearch
                        size="large"
                        style={{
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        filterOption={(input, option) =>
                          (option?.children as React.ReactNode as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {projects.map((project) => (
                          <Option key={project.id} value={project.id}>
                            {project.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Parties Section */}
              <Card 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <Row gutter={[20, 0]}>
                  <Col span={12}>
                    <Form.Item
                      name="contractor_id"
                      label={
                        <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                          <UserOutlined style={{ marginRight: 4 }} />
                          Поставщик <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Выберите поставщика' },
                      ]}
                    >
                      <Select
                        placeholder="Выберите поставщика"
                        showSearch
                        size="large"
                        style={{
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        filterOption={(input, option) =>
                          (option?.children as React.ReactNode as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {contractors.map((contractor) => (
                          <Option key={contractor.id} value={contractor.id}>
                            {contractor.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="payer_id"
                      label={
                        <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                          <BankOutlined style={{ marginRight: 4 }} />
                          Плательщик <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Выберите плательщика' },
                      ]}
                    >
                      <Select
                        placeholder="Выберите плательщика"
                        showSearch
                        size="large"
                        style={{
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        filterOption={(input, option) =>
                          (option?.children as React.ReactNode as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {payers.map((payer) => (
                          <Option key={payer.id} value={payer.id}>
                            {payer.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Amount Section */}
              <Card 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #f6ffed 100%)',
                  border: '1px solid #e6f7ff',
                  boxShadow: '0 2px 8px rgba(24, 144, 255, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <CalculatorOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                  <Title level={5} style={{ margin: 0, color: '#262626' }}>Сумма и НДС</Title>
                </div>
                
                <Row gutter={[20, 0]}>
                  <Col span={12}>
                    <Form.Item
                      name="amount"
                      label={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                            {includeVat ? 'Сумма с НДС' : 'Сумма без НДС'} <span style={{ color: '#ff4d4f' }}>*</span>
                          </span>
                          <Switch
                            checked={includeVat}
                            onChange={(checked) => {
                              setIncludeVat(checked);
                              const amount = form.getFieldValue('amount');
                              if (amount && amount > 0) {
                                if (checked) {
                                  const withoutVat = Math.round(amount / 1.2 * 100) / 100;
                                  const vatAmount = Math.round((amount - withoutVat) * 100) / 100;
                                  setVatDisplay(`Без НДС: ${withoutVat.toLocaleString('ru-RU')} ₽ | НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽`);
                                } else {
                                  const vatAmount = Math.round(amount * 0.2 * 100) / 100;
                                  const totalAmount = Math.round((amount + vatAmount) * 100) / 100;
                                  setVatDisplay(`НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽ | Всего с НДС: ${totalAmount.toLocaleString('ru-RU')} ₽`);
                                }
                              }
                            }}
                            checkedChildren="С НДС"
                            unCheckedChildren="Без НДС"
                            style={{ minWidth: 90 }}
                          />
                        </div>
                      }
                      rules={[
                        { required: true, message: 'Введите сумму' },
                        { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' },
                      ]}
                    >
                      <InputNumber
                        style={{ 
                          width: '100%',
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        placeholder={includeVat ? "0" : "0"}
                        precision={2}
                        size="large"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                        parser={(value) => value!.replace(/\s?/g, '')}
                        addonAfter="₽"
                        onChange={(value) => {
                          if (value && value > 0) {
                            if (includeVat) {
                              const withoutVat = Math.round(value / 1.2 * 100) / 100;
                              const vatAmount = Math.round((value - withoutVat) * 100) / 100;
                              setVatDisplay(`Без НДС: ${withoutVat.toLocaleString('ru-RU')} ₽ | НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽`);
                            } else {
                              const vatAmount = Math.round(value * 0.2 * 100) / 100;
                              const totalAmount = Math.round((value + vatAmount) * 100) / 100;
                              setVatDisplay(`НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽ | Всего с НДС: ${totalAmount.toLocaleString('ru-RU')} ₽`);
                            }
                          } else {
                            setVatDisplay('');
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <div style={{
                      background: 'white',
                      borderRadius: 10,
                      padding: '16px',
                      border: '1px solid #e6f7ff',
                      marginTop: 28
                    }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8, fontWeight: 600 }}>
                        Расчет НДС:
                      </div>
                      <div style={{ 
                        fontSize: 14, 
                        color: '#262626',
                        fontWeight: 500,
                        lineHeight: 1.8
                      }}>
                        {vatDisplay || 
                          <span style={{ color: '#bfbfbf' }}>Введите сумму для автоматического расчета</span>
                        }
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Rukstroy Amount Info - Always visible */}
              {selectedInvoice?.rukstroy_amount && (
                <Card 
                  style={{ 
                    marginBottom: 24,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #fff1f0 0%, #fff7e6 100%)',
                    border: '1px solid #ffccc7',
                    boxShadow: '0 2px 8px rgba(255, 77, 79, 0.08)'
                  }}
                >
                  <Form.Item
                    name="rukstroy_amount"
                    label={
                      <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                        Сумма, согласованная Рукстроем (только для чтения)
                      </span>
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      style={{ 
                        width: '100%',
                        height: 48,
                        borderRadius: 10,
                        fontSize: 15,
                        background: '#fff9f0',
                        borderColor: '#ffd591'
                      }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      parser={(value) => value!.replace(/\s?/g, '')}
                      addonAfter="₽"
                      precision={2}
                      size="large"
                      disabled
                    />
                  </Form.Item>
                  <Alert
                    message="Внимание"
                    description="Эта сумма была утверждена Рукстроем и не может быть изменена."
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                </Card>
              )}

              {/* Delivery Terms */}
              <Card 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <Title level={5} style={{ marginBottom: 20, color: '#262626' }}>Срок поставки</Title>
                <Row gutter={[20, 0]}>
                  <Col span={12}>
                    <Form.Item
                      name="delivery_days"
                      label={
                        <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                          Количество дней
                        </span>
                      }
                    >
                      <InputNumber
                        min={1}
                        max={9999}
                        placeholder="Например: 7"
                        style={{ 
                          width: '100%',
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        size="large"
                        addonAfter="дней"
                        onChange={(value) => {
                          if (value) {
                            const today = new Date();
                            const deliveryDate = calculateDeliveryDate(today, value);
                            setExpectedDeliveryDate(deliveryDate);
                          } else {
                            setExpectedDeliveryDate(null);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    {expectedDeliveryDate && (
                      <div style={{
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
                        borderRadius: 10,
                        padding: '16px',
                        border: '1px solid #91d5ff',
                        marginTop: 28
                      }}>
                        <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 4, fontWeight: 600 }}>
                          Ожидаемая дата поставки:
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#096dd9', marginBottom: 4 }}>
                          {expectedDeliveryDate.toLocaleDateString('ru-RU', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: '#52c41a' }}>
                          * След. раб. день + {form.getFieldValue('delivery_days')} кал. дней
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </Card>

              {/* Description */}
              <Card 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <Form.Item
                  name="description"
                  label={
                    <span style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                      Описание
                    </span>
                  }
                  extra={
                    <div style={{ 
                      fontSize: 12, 
                      color: '#8c8c8c',
                      marginTop: 4
                    }}>
                      Краткое описание товаров или услуг
                    </div>
                  }
                >
                  <TextArea
                    rows={4}
                    placeholder="Например: Строительные материалы для объекта..."
                    style={{
                      borderRadius: 10,
                      fontSize: 15,
                      resize: 'vertical'
                    }}
                  />
                </Form.Item>
              </Card>

              {/* File Upload Section */}
              <Card 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <CloudUploadOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                  <Title level={5} style={{ margin: 0, color: '#262626' }}>Прикрепленные файлы</Title>
                </div>
                
                {/* Drag and Drop Area */}
                <div
                  style={{
                    border: `2px dashed ${dragActive ? '#1890ff' : '#d9d9d9'}`,
                    borderRadius: 12,
                    padding: 32,
                    textAlign: 'center',
                    background: dragActive ? 'rgba(24, 144, 255, 0.04)' : '#fafafa',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <InboxOutlined style={{ 
                    fontSize: 48, 
                    color: dragActive ? '#1890ff' : '#bfbfbf',
                    marginBottom: 16
                  }} />
                  <Title level={5} style={{ color: '#595959', marginBottom: 8 }}>
                    Перетащите файлы сюда или
                  </Title>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CloudUploadOutlined />}
                    style={{
                      borderRadius: 10,
                      height: 48,
                      fontSize: 15,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    Выберите файлы
                  </Button>
                  <div style={{ marginTop: 12, color: '#8c8c8c', fontSize: 13 }}>
                    Счета, накладные, спецификации (макс. 50 МБ на файл)
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      handleFiles(files);
                      if (e.target.value) {
                        e.target.value = ''; // Reset input
                      }
                    }}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                </div>

                {/* File List */}
                {fileList.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <List
                      size="small"
                      dataSource={fileList}
                      renderItem={(file) => (
                        <List.Item
                          key={file.uid}
                          style={{
                            background: 'white',
                            borderRadius: 8,
                            padding: '8px 12px',
                            marginBottom: 8,
                            border: '1px solid #f0f0f0'
                          }}
                          actions={[
                            file.url && (
                              <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  if (file.url) {
                                    window.open(file.url, '_blank');
                                  }
                                }}
                                title="Просмотр файла"
                              />
                            ),
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setFileList(prev => prev.filter(f => f.uid !== file.uid));
                                if (file.attachmentId) {
                                  setUploadedAttachments(prev => prev.filter(a => a.id !== file.attachmentId));
                                }
                              }}
                              title="Удалить файл"
                            />
                          ].filter(Boolean)}
                        >
                          <List.Item.Meta
                            avatar={<PaperClipOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                            title={
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>{file.name}</span>
                                {file.status === 'uploading' && (
                                  <Tag color="processing">Загрузка...</Tag>
                                )}
                                {file.status === 'done' && (
                                  <Tag color="success">Загружено</Tag>
                                )}
                                {file.status === 'error' && (
                                  <Tag color="error">Ошибка</Tag>
                                )}
                              </div>
                            }
                            description={
                              file.percent !== undefined && file.status === 'uploading' ? (
                                <Progress 
                                  percent={file.percent} 
                                  size="small" 
                                  showInfo={false}
                                  strokeColor="#1890ff"
                                />
                              ) : null
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </Card>

              {/* Action Buttons */}
              <div style={{ 
                marginTop: 32,
                paddingTop: 24,
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12
              }}>
                <Button
                  size="large"
                  onClick={handleModalClose}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    minWidth: 120,
                    fontSize: 15
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={updateMutation.isPending}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    minWidth: 120,
                    fontSize: 15,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  Сохранить
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Отклонение счета"
        open={isRejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectReason('');
          setSelectedInvoice(null);
        }}
        confirmLoading={rejectMutation.isPending}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        {selectedInvoice && (
          <div>
            <Text>
              Вы уверены, что хотите отклонить счет №{selectedInvoice.invoice_number}?
            </Text>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Причина отклонения (необязательно):</Text>
              <TextArea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Укажите причину отклонения..."
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}