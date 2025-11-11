import React, { useState, useEffect } from 'react'
import { Row, Col, Form, Select } from 'antd'
import type { Contractor, UserProfile } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'

interface InvoiceContractorFieldsEnhancedProps {
  contractors: Contractor[]
  employees: UserProfile[]
  form?: any
  isNewInvoice?: boolean
  selectedProjectId?: number | null
  selectedContractId?: string | null
  contracts?: any[]
}

export const InvoiceContractorFieldsEnhanced: React.FC<InvoiceContractorFieldsEnhancedProps> = ({
  contractors,
  employees,
  form,
  isNewInvoice = false,
  selectedContractId,
  contracts = []
}) => {
  const [filteredPayers, setFilteredPayers] = useState<Contractor[]>(contractors)
  const [filteredSuppliers, setFilteredSuppliers] = useState<Contractor[]>(contractors)

  // Автоматическая подстановка текущего пользователя при создании нового счета
  useEffect(() => {
    const setCurrentUser = async () => {
      if (isNewInvoice && form) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const currentUserProfile = employees.find(emp => emp.id === user.id)
          if (currentUserProfile) {
            form.setFieldsValue({ responsible_id: currentUserProfile.id })
          }
        }
      }
    }
    setCurrentUser()
  }, [isNewInvoice, employees, form])

  // Фильтрация контрагентов на основе выбранного договора
  useEffect(() => {
    let payersToShow = contractors
    let suppliersToShow = contractors

    if (selectedContractId) {
      // Если выбран договор, берем контрагентов из него
      const selectedContract = contracts.find(c => c.id === selectedContractId)
      if (selectedContract) {
        if (selectedContract.payer_id) {
          const payer = contractors.find(c => c.id === selectedContract.payer_id)
          if (payer) payersToShow = [payer]
        }
        if (selectedContract.supplier_id) {
          const supplier = contractors.find(c => c.id === selectedContract.supplier_id)
          if (supplier) suppliersToShow = [supplier]
        }
      }
    }

    setFilteredPayers(payersToShow)
    setFilteredSuppliers(suppliersToShow)
  }, [contractors, selectedContractId, contracts])

  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="payer_id"
            label="Плательщик"
            rules={[{ required: true, message: 'Выберите плательщика' }]}
          >
            <Select
              placeholder="Выберите плательщика"
              showSearch
              optionFilterProp="label"
              options={filteredPayers.map((contractor, index) => ({
                key: `payer-${contractor.id}-${index}`,
                value: contractor.id,
                label: contractor.name,
              }))}
              notFoundContent="Плательщики не найдены"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="supplier_id"
            label="Поставщик"
            rules={[{ required: true, message: 'Выберите поставщика' }]}
          >
            <Select
              placeholder="Выберите поставщика"
              showSearch
              optionFilterProp="label"
              options={filteredSuppliers.map((contractor, index) => ({
                key: `supplier-${contractor.id}-${index}`,
                value: contractor.id,
                label: contractor.name,
              }))}
              notFoundContent="Поставщики не найдены"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="responsible_id"
            label="Ответственный менеджер"
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