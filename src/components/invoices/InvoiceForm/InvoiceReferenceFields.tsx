import React from 'react'
import { Row, Col, Form, Select } from 'antd'
import type { Contract, MaterialRequest } from '../../../lib/supabase'

interface InvoiceReferenceFieldsProps {
  contracts: Contract[]
  materialRequests: MaterialRequest[]
  onContractSelect: (contractId: string | null) => void
}

export const InvoiceReferenceFields: React.FC<InvoiceReferenceFieldsProps> = ({
  contracts,
  materialRequests,
  onContractSelect
}) => {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name="contract_id"
          label="Договор"
        >
          <Select
            placeholder="Выберите договор"
            allowClear
            showSearch
            optionFilterProp="label"
            onChange={onContractSelect}
            options={contracts.map((contract) => ({
              value: contract.id,
              label: `${contract.contract_number} от ${contract.contract_date ?
                new Date(contract.contract_date).toLocaleDateString('ru-RU') : 'без даты'}`,
            }))}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="material_request_id"
          label="Заявка на материалы"
        >
          <Select
            placeholder="Выберите заявку на материалы"
            allowClear
            showSearch
            optionFilterProp="label"
            options={materialRequests.map((request) => ({
              value: request.id,
              label: `${request.request_number} от ${request.request_date ?
                new Date(request.request_date).toLocaleDateString('ru-RU') : 'без даты'}`,
            }))}
          />
        </Form.Item>
      </Col>
    </Row>
  )
}