/**
 * Modal for allocating or updating project budget
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Input, Select, message } from 'antd';
import type { BudgetFormData, ProjectBudgetWithProject } from '../../types/budget';

interface AllocateBudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  projects: Array<{ id: number; code?: string; name: string; is_active?: boolean }>;
  existingBudget?: ProjectBudgetWithProject | null;
  selectedProjectId?: number;
}

export const AllocateBudgetModal: React.FC<AllocateBudgetModalProps> = ({
  open,
  onClose,
  onSubmit,
  projects,
  existingBudget,
  selectedProjectId,
}) => {
  const [form] = Form.useForm<BudgetFormData>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingBudget) {
        // Edit mode - populate form with existing data
        form.setFieldsValue({
          project_id: existingBudget.project_id,
          allocated_amount: Number(existingBudget.allocated_amount),
          description: existingBudget.description,
        });
      } else if (selectedProjectId) {
        // New budget with pre-selected project
        form.setFieldsValue({
          project_id: selectedProjectId,
        });
      } else {
        // New budget - reset form
        form.resetFields();
      }
    }
  }, [open, existingBudget, selectedProjectId, form]);

  const handleSubmit = async () => {
    console.log('[AllocateBudgetModal.handleSubmit] Submitting form');

    try {
      const values = await form.validateFields();
      setLoading(true);

      await onSubmit(values);

      form.resetFields();
      onClose();
    } catch (error) {
      console.error('[AllocateBudgetModal.handleSubmit] Error:', error);
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Filter active projects
  const activeProjects = projects.filter(p => p.is_active !== false);

  return (
    <Modal
      title={existingBudget ? 'Корректировка бюджета проекта' : 'Выделение бюджета проекту'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={existingBudget ? 'Сохранить' : 'Выделить'}
      cancelText="Отмена"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        <Form.Item
          name="project_id"
          label="Проект"
          rules={[{ required: true, message: 'Выберите проект' }]}
        >
          <Select
            placeholder="Выберите проект"
            showSearch
            optionFilterProp="children"
            disabled={!!existingBudget}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={activeProjects.map(p => ({
              value: p.id,
              label: p.code ? `[${p.code}] ${p.name}` : p.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="allocated_amount"
          label="Выделенная сумма (₽)"
          rules={[
            { required: true, message: 'Укажите сумму' },
            { type: 'number', min: 0, message: 'Сумма должна быть положительной' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="0.00"
            min={0}
            precision={2}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Примечание"
        >
          <Input.TextArea
            placeholder="Дополнительная информация о выделении бюджета"
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
