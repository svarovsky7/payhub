import React, { useState, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Typography,
  Space,
  Card,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  DatePicker,
  Alert,
  Switch,
  Image,
  Grid,
  List,
  Segmented,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  PaperClipOutlined,
  TableOutlined,
  AppstoreOutlined,
  MoreOutlined,
  CalendarOutlined,
  UserOutlined,
  BankOutlined,
  ProjectOutlined,
  CalculatorOutlined,
  CloseOutlined,
  CheckOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/model/auth-store';
import { invoiceApi, projectApi, contractorApi, payerApi, attachmentApi } from '@/entities';
import type { Invoice, Attachment } from '@/shared/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface InvoiceFormData {
  invoice_number: string;
  contractor_id: number;
  payer_id: number;
  amount: number;
  description: string;
  project_id: number;
  invoice_date: string;
  delivery_days?: number;
}

// Функция для расчета даты поставки (следующий рабочий день + календарные дни)
function calculateDeliveryDate(startDate: Date, deliveryDays: number): Date {
  const result = new Date(startDate);
  
  // Сначала находим следующий рабочий день
  result.setDate(result.getDate() + 1);
  
  // Пропускаем выходные для получения следующего рабочего дня
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }
  
  // Теперь добавляем указанное количество календарных дней
  result.setDate(result.getDate() + deliveryDays);
  
  return result;
}

export function InvoicesPage() {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const [contractorForm] = Form.useForm();
  const [payerForm] = Form.useForm();
  const [projectForm] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [fileList, setFileList] = useState<Array<{
    uid: string;
    name: string;
    status?: string;
    url?: string;
    attachmentId?: number;
    percent?: number;
  }>>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(null);
  const [includeVat, setIncludeVat] = useState(true); // По умолчанию сумма с НДС
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Responsive breakpoint detection
  const isTablet = !screens.lg && screens.md;
  const isMobile = !screens.md;
  
  // Auto-switch to card view on tablets and mobile
  React.useEffect(() => {
    if (isMobile || (isTablet && window.innerWidth < 900)) {
      setViewMode('cards');
    } else {
      setViewMode('table');
    }
  }, [isMobile, isTablet]);

  // Fetch invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceApi.getAll,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });


  // Fetch supporting data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorApi.getAll,
  });

  const { data: payers = [] } = useQuery({
    queryKey: ['payers'],
    queryFn: payerApi.getAll,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: invoiceApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Invoice created successfully');
      handleModalClose();
      return data;
    },
    onError: (error) => {
      console.error('Failed to create invoice:', error);
      message.error('Failed to create invoice');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Invoice>) =>
      invoiceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Invoice updated successfully');
      handleModalClose();
    },
    onError: (error) => {
      console.error('Failed to update invoice:', error);
      message.error('Failed to update invoice');
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: invoiceApi.submitForApproval,
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['rukstroy-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['director-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['supply-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-invoices'] });
      message.success('Счет отправлен на согласование');
    },
    onError: (error) => {
      console.error('Failed to submit invoice:', error);
      message.error('Не удалось отправить счет на согласование');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: invoiceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      message.success('Invoice deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete invoice:', error);
      message.error('Failed to delete invoice');
    },
  });

  // Mutations for creating contractors and payers
  const createContractorMutation = useMutation({
    mutationFn: contractorApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      message.success('Поставщик успешно создан');
      setIsContractorModalOpen(false);
      contractorForm.resetFields();
    },
    onError: (error) => {
      console.error('Failed to create contractor:', error);
      message.error('Не удалось создать поставщика');
    },
  });

  const createPayerMutation = useMutation({
    mutationFn: payerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payers'] });
      message.success('Плательщик успешно создан');
      setIsPayerModalOpen(false);
      payerForm.resetFields();
    },
    onError: (error) => {
      console.error('Failed to create payer:', error);
      message.error('Не удалось создать плательщика');
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект успешно создан');
      setIsProjectModalOpen(false);
      projectForm.resetFields();
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      message.error('Не удалось создать проект');
    },
  });

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
        const attachment = await attachmentApi.upload(file, editingInvoice?.id);
        
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

  const handleCreate = () => {
    setEditingInvoice(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    // Always display the total amount (which includes VAT by default)
    const displayAmount = invoice.total_amount;
    
    // Calculate expected delivery date if delivery_days exists
    if (invoice.delivery_days) {
      const today = new Date();
      const deliveryDate = calculateDeliveryDate(today, invoice.delivery_days);
      setExpectedDeliveryDate(deliveryDate);
    } else {
      setExpectedDeliveryDate(null);
    }
    
    form.setFieldsValue({
      ...invoice,
      amount: displayAmount,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : null,
      delivery_days: invoice.delivery_days,
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
    
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
    form.resetFields();
    setFileList([]);
    setAttachments([]);
    setUploadedAttachments([]);
    setPreviewFile(null);
    setExpectedDeliveryDate(null); // Reset expected delivery date
    setIncludeVat(true); // Reset to default (with VAT)
  };

  const handleSaveDraft = () => {
    const values = form.getFieldsValue();
    console.log('Сохранение черновика:', values);
    message.info('Функция сохранения черновика будет реализована позже');
    // TODO: Implement draft saving logic
  };

  const handleSubmit = async (values: InvoiceFormData) => {
    try {
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

      const invoiceData = {
        invoice_number: values.invoice_number,
        contractor_id: values.contractor_id,
        payer_id: values.payer_id,
        project_id: values.project_id,
        description: values.description,
        invoice_date: values.invoice_date ? dayjs(values.invoice_date).format('YYYY-MM-DD') : null,
        created_by: user?.id || null,
        status: 'draft' as const,
        total_amount: totalAmount,
        without_vat: withoutVat,
        vat_amount: vatAmount,
        delivery_date: null,
        delivery_days: values.delivery_days || null,
        is_important: null,
        responsible_person_id: null,
      };

      if (editingInvoice) {
        await updateMutation.mutateAsync({ id: editingInvoice.id, ...invoiceData });
        
        // Link new attachments to invoice
        for (const attachment of uploadedAttachments) {
          await attachmentApi.linkToInvoice(attachment.id, editingInvoice.id);
        }
        
        // Remove deleted attachments
        const currentIds = fileList
          .filter(f => f.attachmentId)
          .map(f => f.attachmentId);
        const toDelete = attachments.filter(a => !currentIds.includes(a.id));
        
        for (const attachment of toDelete) {
          await attachmentApi.unlinkFromInvoice(attachment.id, editingInvoice.id);
          await attachmentApi.delete(attachment.id);
        }
      } else {
        const newInvoice = await createMutation.mutateAsync(invoiceData);
        
        // Link uploaded attachments to the new invoice
        for (const attachment of uploadedAttachments) {
          await attachmentApi.linkToInvoice(attachment.id, newInvoice.id);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleSubmitForApproval = (invoiceId: number) => {
    submitForApprovalMutation.mutate(invoiceId);
  };

  const handleDelete = (invoiceId: number) => {
    deleteMutation.mutate(invoiceId);
  };

  const handleCreateContractor = async (values: { name: string; inn: string; address?: string }) => {
    createContractorMutation.mutate({
      name: values.name,
      inn: values.inn,
      address: values.address || null,
      created_by: user?.id || null,
    });
  };

  const handleCreatePayer = async (values: { name: string; inn: string }) => {
    createPayerMutation.mutate({
      name: values.name,
      inn: values.inn,
      created_by: user?.id || null,
    });
  };

  const handleCreateProject = async (values: { name: string; address?: string }) => {
    createProjectMutation.mutate({
      name: values.name,
      address: values.address || null,
    });
  };

  const getStatusTag = (status: string | null) => {
    const statusConfig = {
      draft: { color: 'default', text: 'Черновик' },
      rukstroy_review: { color: 'processing', text: 'На согласовании Рукстроя' },
      director_review: { color: 'processing', text: 'На согласовании Директора' },
      supply_review: { color: 'processing', text: 'На согласовании Снабжения' },
      in_payment: { color: 'warning', text: 'В оплате' },
      paid: { color: 'success', text: 'Оплачено' },
      rejected: { color: 'error', text: 'Отказано' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status || 'Не указан' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchText || 
      invoice.invoice_number?.toLowerCase().includes(searchText.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      invoice.contractor?.name?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  const columns: ColumnsType<Invoice> = [
    {
      title: '№',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      fixed: 'left',
      width: 100,
      sorter: (a, b) => a.invoice_number.localeCompare(b.invoice_number),
      render: (text) => (
        <span style={{ 
          fontWeight: 600, 
          color: '#1677ff',
          fontSize: '13px'
        }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 100,
      sorter: (a, b) => {
        const dateA = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
        const dateB = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
        return dateA - dateB;
      },
      render: (date) => (
        <span style={{ color: '#595959', fontSize: '13px' }}>
          {date ? dayjs(date).format('DD.MM.YY') : '-'}
        </span>
      ),
    },
    {
      title: 'Поставщик',
      dataIndex: ['contractor', 'name'],
      key: 'contractor',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => (a.contractor?.name || '').localeCompare(b.contractor?.name || ''),
      render: (text) => (
        <span title={text} style={{ fontSize: '13px' }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      width: 150,
      ellipsis: true,
      responsive: ['lg'],
      sorter: (a, b) => (a.payer?.name || '').localeCompare(b.payer?.name || ''),
      render: (text) => (
        <span title={text} style={{ fontSize: '13px' }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 150,
      ellipsis: true,
      responsive: ['xl'],
      sorter: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || ''),
      render: (text) => (
        <span title={text} style={{ fontSize: '13px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (amount) => (
        <span style={{
          fontWeight: 600,
          fontSize: '13px',
          color: '#52c41a'
        }}>
          {new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount)} ₽
        </span>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: [
        { text: 'Черновик', value: 'draft' },
        { text: 'На согласовании Рукстроя', value: 'rukstroy_review' },
        { text: 'На согласовании Директора', value: 'director_review' },
        { text: 'На согласовании Снабжения', value: 'supply_review' },
        { text: 'В оплате', value: 'in_payment' },
        { text: 'Оплачено', value: 'paid' },
        { text: 'Отказано', value: 'rejected' },
      ],
      onFilter: (value, record) => record.status === value,
      render: getStatusTag,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      responsive: ['xxl'],
      render: (text) => (
        <span title={text} style={{ fontSize: '13px', color: '#8c8c8c' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Поставка',
      key: 'delivery',
      width: 150,
      responsive: ['lg'],
      render: (_, record) => {
        if (!record.delivery_days) {
          return <span style={{ color: '#d9d9d9' }}>—</span>;
        }
        
        // If invoice is paid and has a fixed delivery date
        if (record.status === 'paid' && record.delivery_date) {
          const deliveryDate = new Date(record.delivery_date);
          const today = new Date();
          const daysLeft = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div>
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                {deliveryDate.toLocaleDateString('ru-RU')}
              </div>
              <div style={{ fontSize: '11px', color: daysLeft > 0 ? '#52c41a' : '#ff4d4f' }}>
                {daysLeft > 0 ? `Через ${daysLeft} дн.` : daysLeft === 0 ? 'Сегодня' : 'Просрочено'}
              </div>
            </div>
          );
        }
        
        // If not paid yet, show expected delivery based on current date
        const today = new Date();
        const expectedDate = calculateDeliveryDate(today, record.delivery_days);
        
        return (
          <div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {record.delivery_days} кал. дн.
            </div>
            <div style={{ fontSize: '11px', color: '#bfbfbf' }}>
              Ожид.: {expectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      width: isMobile ? 60 : isTablet ? 80 : 100,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'draft' ? (
            <>
              <Button
                type="text"
                size={isMobile ? 'middle' : 'small'}
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(record);
                }}
                className="touch-target"
                style={{ minHeight: isMobile ? 40 : 'auto' }}
              />
              <Button
                type="text"
                size={isMobile ? 'middle' : 'small'}
                icon={<SendOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitForApproval(record.id);
                }}
                style={{ 
                  color: '#52c41a',
                  minHeight: isMobile ? 40 : 'auto'
                }}
                className="touch-target"
              />
              {!isMobile && (
                <Popconfirm
                  title="Удалить счет?"
                  onConfirm={(e) => {
                    if (e) e.stopPropagation();
                    handleDelete(record.id);
                  }}
                  onCancel={(e) => {
                    if (e) e.stopPropagation();
                  }}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Button
                    type="text"
                    size={isMobile ? 'middle' : 'small'}
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    className="touch-target"
                    style={{ minHeight: isMobile ? 40 : 'auto' }}
                  />
                </Popconfirm>
              )}
              {isMobile && (
                <Button
                  type="text"
                  size="middle"
                  icon={<MoreOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  className="touch-target"
                  style={{ minHeight: 40 }}
                />
              )}
            </>
          ) : (
            <Button
              type="text"
              size={isMobile ? 'middle' : 'small'}
              icon={<FileTextOutlined />}
              onClick={(e) => e.stopPropagation()}
              className="touch-target"
              style={{ minHeight: isMobile ? 40 : 'auto' }}
            />
          )}
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        message="Ошибка загрузки"
        description="Не удалось загрузить список счетов. Попробуйте обновить страницу."
        type="error"
        showIcon
        style={{ marginBottom: 24 }}
      />
    );
  }

  // Render invoice cards for mobile/tablet view
  const renderInvoiceCards = () => (
    <List
      grid={{ 
        gutter: [16, 16], 
        xs: 1, 
        sm: 1, 
        md: 2, 
        lg: 3, 
        xl: 3, 
        xxl: 4 
      }}
      dataSource={filteredInvoices}
      renderItem={(invoice) => (
        <List.Item>
          <Card
            size="small"
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease',
            }}
            styles={{
              body: { 
                padding: isMobile ? 16 : 20,
              }
            }}
            hoverable
            actions={[
              invoice.status === 'draft' ? (
                <Space key="actions" size="small">
                  <Button
                    type="text"
                    size={isMobile ? 'large' : 'middle'}
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(invoice)}
                    className="touch-target"
                  />
                  <Button
                    type="text"
                    size={isMobile ? 'large' : 'middle'}
                    icon={<SendOutlined />}
                    onClick={() => handleSubmitForApproval(invoice.id)}
                    style={{ color: '#52c41a' }}
                    className="touch-target"
                  />
                  <Popconfirm
                    title="Удалить счет?"
                    onConfirm={() => handleDelete(invoice.id)}
                    okText="Да"
                    cancelText="Нет"
                  >
                    <Button
                      type="text"
                      size={isMobile ? 'large' : 'middle'}
                      danger
                      icon={<DeleteOutlined />}
                      className="touch-target"
                    />
                  </Popconfirm>
                </Space>
              ) : (
                <Button
                  type="text"
                  size={isMobile ? 'large' : 'middle'}
                  icon={<FileTextOutlined />}
                  className="touch-target"
                />
              )
            ]}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 8 
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  color: '#1677ff',
                  fontSize: isMobile ? 16 : 14
                }}>
                  №{invoice.invoice_number}
                </span>
                {getStatusTag(invoice.status)}
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <span style={{ 
                  fontSize: isMobile ? 18 : 16,
                  fontWeight: 600,
                  color: '#52c41a'
                }}>
                  {new Intl.NumberFormat('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(invoice.total_amount)} ₽
                </span>
              </div>
              
              <div style={{ 
                fontSize: isMobile ? 14 : 13,
                color: '#595959',
                marginBottom: 6
              }}>
                <strong>Поставщик:</strong> {invoice.contractor?.name}
              </div>
              
              {invoice.project?.name && (
                <div style={{ 
                  fontSize: isMobile ? 14 : 13,
                  color: '#595959',
                  marginBottom: 6
                }}>
                  <strong>Проект:</strong> {invoice.project.name}
                </div>
              )}

              {invoice.delivery_days && (
                <div style={{ 
                  fontSize: isMobile ? 13 : 12,
                  color: '#595959',
                  marginBottom: 6,
                  padding: '4px 8px',
                  background: invoice.status === 'paid' && invoice.delivery_date ? '#e6f7ff' : '#f5f5f5',
                  borderRadius: '4px',
                  border: invoice.status === 'paid' && invoice.delivery_date ? '1px solid #91d5ff' : '1px solid #e8e8e8'
                }}>
                  {invoice.status === 'paid' && invoice.delivery_date ? (
                    <>
                      <strong>Поставка:</strong> {new Date(invoice.delivery_date).toLocaleDateString('ru-RU')}
                      {(() => {
                        const daysLeft = Math.ceil((new Date(invoice.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <span style={{ 
                            marginLeft: 8, 
                            color: daysLeft > 0 ? '#52c41a' : daysLeft === 0 ? '#faad14' : '#ff4d4f',
                            fontWeight: 500,
                            fontSize: '11px'
                          }}>
                            {daysLeft > 0 ? `(через ${daysLeft} дн.)` : daysLeft === 0 ? '(сегодня)' : '(просрочено)'}
                          </span>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <strong>Срок:</strong> {invoice.delivery_days} кал. дн. после оплаты
                    </>
                  )}
                </div>
              )}
              
              <div style={{ 
                fontSize: isMobile ? 13 : 12,
                color: '#8c8c8c'
              }}>
                {invoice.invoice_date ? dayjs(invoice.invoice_date).format('DD.MM.YYYY') : '-'}
              </div>
            </div>
          </Card>
        </List.Item>
      )}
      locale={{
        emptyText: (
          <div style={{ padding: '40px 0' }}>
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <p style={{ marginTop: 16, color: '#8c8c8c' }}>
              {searchText || statusFilter ? 'Ничего не найдено' : 'Нет счетов'}
            </p>
          </div>
        ),
      }}
    />
  );
  
  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={isMobile ? 3 : 2} style={{
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'inline-block'
          }}>Счета</Title>
        </Col>
        <Col>
          <Space>
            {(isTablet || isMobile) && (
              <Segmented
                options={[
                  { label: <TableOutlined />, value: 'table' },
                  { label: <AppstoreOutlined />, value: 'cards' },
                ]}
                value={viewMode}
                onChange={(value) => setViewMode(value as 'table' | 'cards')}
                size={isMobile ? 'large' : 'middle'}
              />
            )}
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                loading={createMutation.isPending}
                size={isMobile ? 'large' : 'middle'}
                style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                minHeight: isMobile ? 44 : 'auto'
              }}
              className="touch-target"
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {isMobile ? '+' : 'Создать счет'}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Search and Filter Controls */}
      <Card 
        style={{ 
          marginBottom: 20,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10} lg={8}>
            <Input
              placeholder={isMobile ? "Поиск..." : "Поиск по номеру, описанию, поставщику..."}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size={isMobile ? 'large' : 'middle'}
              style={{ 
                borderRadius: 8,
                minHeight: isMobile ? 44 : 'auto'
              }}
              className="touch-target"
            />
          </Col>
          <Col xs={24} md={8} lg={6}>
            <Select
              placeholder="Фильтр по статусу"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              size={isMobile ? 'large' : 'middle'}
              suffixIcon={<FilterOutlined />}
              className="touch-target"
            >
              <Option value="draft">Черновик</Option>
              <Option value="rukstroy_review">На согласовании Рукстроя</Option>
              <Option value="director_review">На согласовании Директора</Option>
              <Option value="supply_review">На согласовании Снабжения</Option>
              <Option value="in_payment">В оплате</Option>
              <Option value="paid">Оплачено</Option>
              <Option value="rejected">Отказано</Option>
            </Select>
          </Col>
          <Col xs={24} md={6} lg={10}>
            <div style={{ 
              textAlign: 'right', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              {searchText || statusFilter ? (
                <>
                  <Tag color="blue">Фильтр активен</Tag>
                  <span style={{ color: '#8c8c8c' }}>
                    Найдено: <strong>{filteredInvoices.length}</strong> из {invoices.length}
                  </span>
                </>
              ) : (
                <span style={{ color: '#595959' }}>
                  Всего счетов: <strong style={{ fontSize: '16px', color: '#1677ff' }}>{invoices.length}</strong>
                </span>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {viewMode === 'table' ? (
        <Card 
          style={{ 
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)'
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={columns}
            dataSource={filteredInvoices}
            rowKey="id"
            size={isMobile ? 'middle' : 'small'}
            loading={{
              spinning: isLoading,
              tip: 'Загрузка счетов...',
            }}
            pagination={{
              pageSize: isMobile ? 10 : isTablet ? 20 : 30,
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              showTotal: (total, range) => (
                <span style={{ 
                  color: '#8c8c8c', 
                  fontSize: isMobile ? '12px' : '13px'
                }}>
                  {range[0]}-{range[1]} из {total}
                </span>
              ),
              pageSizeOptions: ['10', '20', '30', '50'],
              style: { marginTop: 0 },
              size: isMobile ? 'default' : 'small',
              simple: isMobile
            }}
            scroll={{ x: isMobile ? 800 : isTablet ? 1000 : 1200 }}
            locale={{
              emptyText: (
                <div style={{ padding: '40px 0' }}>
                  <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <p style={{ marginTop: 16, color: '#8c8c8c' }}>
                    {searchText || statusFilter ? 'Ничего не найдено' : 'Нет счетов'}
                  </p>
                </div>
              ),
            }}
            rowClassName={(record) => 
              record.is_important ? 'important-row' : ''
            }
            onChange={(pagination, filters, sorter) => {
              console.log('Table changed:', { pagination, filters, sorter });
            }}
            className={isTablet ? 'tablet-optimized-table' : ''}
          />
        </Card>
      ) : (
        <Card 
          style={{ 
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)'
          }}
          loading={isLoading}
        >
          {renderInvoiceCards()}
        </Card>
      )}

      <Modal
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={isMobile ? '100vw' : isTablet ? '90vw' : 1000}
        centered={!isMobile}
        style={{
          top: isMobile ? 0 : 20,
          maxWidth: '1200px'
        }}
        className="modern-invoice-modal"
        styles={{
          content: {
            padding: 0,
            borderRadius: isMobile ? 0 : 16,
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
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: isMobile ? '20px' : '24px 32px',
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
                <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: 'white' }}>
                  {editingInvoice ? 'Редактировать счет' : 'Создать счет'}
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
          <div style={{ padding: isMobile ? 20 : 32, maxHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(85vh - 100px)', overflowY: 'auto' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                invoice_date: dayjs(),
              }}
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
                  <Col span={isMobile ? 24 : 8}>
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
                  <Col span={isMobile ? 24 : 8}>
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
                  <Col span={isMobile ? 24 : 8}>
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
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        filterOption={(input, option) =>
                          (option?.children as React.ReactNode as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        popupRender={(menu) => (
                          <>
                            {menu}
                            <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                              <Button
                                type="link"
                                icon={<PlusOutlined />}
                                onClick={() => setIsProjectModalOpen(true)}
                                style={{ width: '100%', textAlign: 'left' }}
                              >
                                Добавить новый проект
                              </Button>
                            </div>
                          </>
                        )}
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
                  <Col span={isMobile ? 24 : 12}>
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
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        filterOption={(input, option) =>
                          (option?.children as React.ReactNode as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        popupRender={(menu) => (
                          <>
                            {menu}
                            <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                              <Button
                                type="link"
                                icon={<PlusOutlined />}
                                onClick={() => setIsContractorModalOpen(true)}
                                style={{ width: '100%', textAlign: 'left' }}
                              >
                                Добавить нового поставщика
                              </Button>
                            </div>
                          </>
                        )}
                      >
                        {contractors.map((contractor) => (
                          <Option key={contractor.id} value={contractor.id}>
                            {contractor.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={isMobile ? 24 : 12}>
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
                          height: 48,
                          borderRadius: 10,
                          fontSize: 15
                        }}
                        filterOption={(input, option) =>
                          (option?.children as React.ReactNode as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        popupRender={(menu) => (
                          <>
                            {menu}
                            <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                              <Button
                                type="link"
                                icon={<PlusOutlined />}
                                onClick={() => setIsPayerModalOpen(true)}
                                style={{ width: '100%', textAlign: 'left' }}
                              >
                                Добавить нового плательщика
                              </Button>
                            </div>
                          </>
                        )}
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
                  <Col span={isMobile ? 24 : 12}>
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
                                  form.setFieldsValue({ 
                                    vatDisplay: `Без НДС: ${withoutVat.toLocaleString('ru-RU')} ₽ | НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽`
                                  });
                                } else {
                                  const vatAmount = Math.round(amount * 0.2 * 100) / 100;
                                  const totalAmount = Math.round((amount + vatAmount) * 100) / 100;
                                  form.setFieldsValue({ 
                                    vatDisplay: `НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽ | Всего с НДС: ${totalAmount.toLocaleString('ru-RU')} ₽`
                                  });
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
                              form.setFieldsValue({ 
                                vatDisplay: `Без НДС: ${withoutVat.toLocaleString('ru-RU')} ₽ | НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽`
                              });
                            } else {
                              const vatAmount = Math.round(value * 0.2 * 100) / 100;
                              const totalAmount = Math.round((value + vatAmount) * 100) / 100;
                              form.setFieldsValue({ 
                                vatDisplay: `НДС 20%: ${vatAmount.toLocaleString('ru-RU')} ₽ | Всего с НДС: ${totalAmount.toLocaleString('ru-RU')} ₽`
                              });
                            }
                          } else {
                            form.setFieldsValue({ vatDisplay: '' });
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col span={isMobile ? 24 : 12}>
                    <div style={{
                      background: 'white',
                      borderRadius: 10,
                      padding: '16px',
                      border: '1px solid #e6f7ff',
                      marginTop: isMobile ? 0 : 28
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
                        {form.getFieldValue('vatDisplay') || 
                          <span style={{ color: '#bfbfbf' }}>Введите сумму для автоматического расчета</span>
                        }
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

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
                  <Col span={isMobile ? 24 : 12}>
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
                        max={365}
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
                  
                  <Col span={isMobile ? 24 : 12}>
                    {expectedDeliveryDate && (
                      <div style={{
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
                        borderRadius: 10,
                        padding: '16px',
                        border: '1px solid #91d5ff',
                        marginTop: isMobile ? 0 : 28
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
                    padding: isMobile ? 24 : 32,
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
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: isMobile ? 'wrap' : 'nowrap'
              }}>
                <Button 
                  onClick={handleSaveDraft}
                  size="large"
                  icon={<SaveOutlined />}
                  style={{ 
                    flex: isMobile ? '1 1 100%' : 'none',
                    height: 48,
                    borderRadius: 10,
                    border: '2px solid #e6e6e6',
                    fontWeight: 500,
                    fontSize: 15
                  }}
                >
                  Сохранить как черновик
                </Button>
                <div style={{
                  display: 'flex',
                  gap: 16,
                  flex: isMobile ? '1 1 100%' : 'none'
                }}>
                  <Button 
                    onClick={handleModalClose}
                    size="large"
                    style={{ 
                      height: 48,
                      borderRadius: 10,
                      fontWeight: 500,
                      fontSize: 15,
                      minWidth: 120
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={createMutation.isPending || updateMutation.isPending}
                    size="large"
                    icon={<CheckOutlined />}
                    style={{ 
                      height: 48,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                      fontWeight: 600,
                      fontSize: 15,
                      minWidth: 160
                    }}
                  >
                    {editingInvoice ? 'Сохранить изменения' : 'Создать счет'}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </Modal>

      {/* Modal for creating new contractor */}
      <Modal
        title="Создать нового поставщика"
        open={isContractorModalOpen}
        onCancel={() => {
          setIsContractorModalOpen(false);
          contractorForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={contractorForm}
          layout="vertical"
          onFinish={handleCreateContractor}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Название поставщика"
            rules={[
              { required: true, message: 'Введите название поставщика' },
            ]}
          >
            <Input placeholder="Введите название" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[
              { required: true, message: 'Введите ИНН' },
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' },
            ]}
          >
            <Input placeholder="Введите ИНН" maxLength={12} autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="kpp"
            label="КПП"
          >
            <Input
              placeholder="Введите КПП (необязательно)"
              maxLength={9}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsContractorModalOpen(false);
                contractorForm.resetFields();
              }}>
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createContractorMutation.isPending}
              >
                Создать
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for creating new payer */}
      <Modal
        title="Создать нового плательщика"
        open={isPayerModalOpen}
        onCancel={() => {
          setIsPayerModalOpen(false);
          payerForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={payerForm}
          layout="vertical"
          onFinish={handleCreatePayer}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Название плательщика"
            rules={[
              { required: true, message: 'Введите название плательщика' },
            ]}
          >
            <Input placeholder="Введите название" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[
              { required: true, message: 'Введите ИНН' },
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' },
            ]}
          >
            <Input placeholder="Введите ИНН" maxLength={12} autoComplete="off" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsPayerModalOpen(false);
                payerForm.resetFields();
              }}>
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createPayerMutation.isPending}
              >
                Создать
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for creating new project */}
      <Modal
        title="Создать новый проект"
        open={isProjectModalOpen}
        onCancel={() => {
          setIsProjectModalOpen(false);
          projectForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={projectForm}
          layout="vertical"
          onFinish={handleCreateProject}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Название проекта"
            rules={[
              { required: true, message: 'Введите название проекта' },
            ]}
          >
            <Input placeholder="Введите название" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
          >
            <TextArea
              rows={2}
              placeholder="Введите адрес проекта (необязательно)"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsProjectModalOpen(false);
                projectForm.resetFields();
              }}>
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createProjectMutation.isPending}
              >
                Создать
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* File Preview Modal */}
      <Modal
        title={previewFile?.name}
        open={!!previewFile}
        onCancel={() => setPreviewFile(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewFile(null)}>
            Закрыть
          </Button>,
          <Button 
            key="download" 
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => previewFile?.url && window.open(previewFile.url, '_blank')}
          >
            Открыть в новой вкладке
          </Button>
        ]}
        width={800}
        centered
      >
        {previewFile && (
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {previewFile.type?.startsWith('image') ? (
              <Image
                src={previewFile.url}
                alt={previewFile.name}
                style={{ width: '100%' }}
                preview={false}
              />
            ) : previewFile.type === 'application/pdf' ? (
              <iframe
                src={previewFile.url}
                title={previewFile.name}
                style={{ 
                  width: '100%', 
                  height: '60vh', 
                  border: 'none',
                  borderRadius: '4px'
                }}
              />
            ) : (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center',
                background: '#f5f5f5',
                borderRadius: '8px'
              }}>
                <PaperClipOutlined style={{ fontSize: 48, color: '#999', marginBottom: 16 }} />
                <p style={{ fontSize: 16, marginBottom: 8 }}>{previewFile.name}</p>
                <p style={{ color: '#666' }}>Предварительный просмотр недоступен для данного типа файла</p>
                <Button 
                  type="primary" 
                  onClick={() => window.open(previewFile.url, '_blank')}
                  style={{ marginTop: 16 }}
                >
                  Скачать файл
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}