import React, { useEffect } from 'react'
import { Row, Col, Form, Select } from 'antd'
import type { Contractor, Project, UserProfile } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'

interface InvoiceContractorFieldsProps {
  contractors: Contractor[]
  projects: Project[]
  employees: UserProfile[]  // Изменили на UserProfile
  form?: any
  isNewInvoice?: boolean
}

export const InvoiceContractorFields: React.FC<InvoiceContractorFieldsProps> = ({
  contractors,
  projects,
  employees,
  form,
  isNewInvoice = false
}) => {
  // Автоматическая подстановка текущего пользователя при создании нового счета
  useEffect(() => {
    const setCurrentUser = async () => {
      if (isNewInvoice && form) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Находим профиль текущего пользователя
          const currentUserProfile = employees.find(emp => emp.id === user.id)
          if (currentUserProfile) {
            form.setFieldsValue({ responsible_id: currentUserProfile.id })
          }
        }
      }
    }
    setCurrentUser()
  }, [isNewInvoice, employees, form])
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="payer_id"
            label="Плательщик"
            rules={[{ required: true, message: 'Выберите плательщика' }]}
          >
            <Select
              placeholder="Выберите плательщика"
              showSearch
              optionFilterProp="label"
              options={contractors.map((contractor, index) => ({
                key: `payer-${contractor.id}-${index}`,
                value: contractor.id,
                label: contractor.name,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="supplier_id"
            label="Поставщик"
            rules={[{ required: true, message: 'Выберите поставщика' }]}
          >
            <Select
              placeholder="Выберите поставщика"
              showSearch
              optionFilterProp="label"
              options={contractors.map((contractor, index) => ({
                key: `supplier-${contractor.id}-${index}`,
                value: contractor.id,
                label: contractor.name,
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
            rules={[{ required: true, message: 'Выберите проект' }]}
          >
            <Select
              placeholder="Выберите проект"
              showSearch
              optionFilterProp="label"
              options={projects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="responsible_id"
            label="Ответственный менеджер снабжения"
            rules={[{ required: true, message: 'Выберите менеджера снабжения' }]}
          >
            <Select
              placeholder="Выберите ответственного"
              showSearch
              optionFilterProp="label"
              options={employees.map((employee) => ({
                value: employee.id,
                label: employee.full_name,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}