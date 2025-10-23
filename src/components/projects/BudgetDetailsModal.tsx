import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Typography, Table, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_with_vat: number;
  status_id: number;
  invoice_statuses?: { name: string; color?: string };
}

interface Payment {
  id: string;
  payment_number: number;
  payment_date: string;
  amount: number;
  status_id: number;
  payment_statuses?: { name: string; color?: string };
}

interface BudgetDetailsModalProps {
  open: boolean;
  projectId?: number;
  onCancel: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value);
};

export const BudgetDetailsModal: React.FC<BudgetDetailsModalProps> = ({ open, projectId, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const loadDetails = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, amount_with_vat, status_id, invoice_statuses (name, color)')
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });

      setInvoices(
        (invoicesData || []).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          amount_with_vat: inv.amount_with_vat,
          status_id: inv.status_id,
          invoice_statuses: Array.isArray(inv.invoice_statuses) ? inv.invoice_statuses[0] : inv.invoice_statuses,
        }))
      );

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, payment_number, payment_date, amount, status_id, payment_statuses (name, color), invoices!inner (project_id)')
        .eq('invoices.project_id', projectId)
        .order('payment_date', { ascending: false });

      setPayments(
        (paymentsData || []).map((pay: any) => ({
          id: pay.id,
          payment_number: pay.payment_number,
          payment_date: pay.payment_date,
          amount: pay.amount,
          status_id: pay.status_id,
          payment_statuses: Array.isArray(pay.payment_statuses) ? pay.payment_statuses[0] : pay.payment_statuses,
        }))
      );
    } catch (error) {
      console.error('Error loading budget details:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) loadDetails();
  }, [open, projectId, loadDetails]);

  const invoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Номер',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount_with_vat',
      key: 'amount_with_vat',
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Статус',
      dataIndex: 'invoice_statuses',
      key: 'status',
      render: (status: any) => <Tag color={status?.color}>{status?.name}</Tag>,
    },
  ];

  const paymentColumns: ColumnsType<Payment> = [
    {
      title: 'Номер',
      dataIndex: 'payment_number',
      key: 'payment_number',
    },
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Статус',
      dataIndex: 'payment_statuses',
      key: 'status',
      render: (status: any) => <Tag color={status?.color}>{status?.name}</Tag>,
    },
  ];

  return (
    <Modal
      title="Детали бюджета"
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={null}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={5}>Счета по проекту</Title>
          <Table columns={invoiceColumns} dataSource={invoices} rowKey="id" loading={loading} pagination={{ pageSize: 5 }} size="small" />
        </div>
        <div>
          <Title level={5}>Платежи по проекту</Title>
          <Table columns={paymentColumns} dataSource={payments} rowKey="id" loading={loading} pagination={{ pageSize: 5 }} size="small" />
        </div>
      </Space>
    </Modal>
  );
};
