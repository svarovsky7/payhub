import React from 'react'
import { Row, Col, Form, Select } from 'antd'
import type { Contractor, Project, Employee } from '../../../lib/supabase'

interface InvoiceContractorFieldsProps {
  contractors: Contractor[]
  projects: Project[]
  employees: Employee[]
}

export const InvoiceContractorFields: React.FC<InvoiceContractorFieldsProps> = ({
  contractors,
  projects,
  employees
}) => {
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
              options={contractors.map((contractor) => ({
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
              options={contractors.map((contractor) => ({
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
            name="employee_id"
            label="Ответственный сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
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