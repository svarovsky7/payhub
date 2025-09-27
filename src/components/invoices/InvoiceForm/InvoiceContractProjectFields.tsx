import React, { useState, useEffect } from 'react'
import { Row, Col, Form, Select } from 'antd'
import type { Contract, Project } from '../../../lib/supabase'

interface InvoiceContractProjectFieldsProps {
  contracts: Contract[]
  projects: Project[]
  form?: any
  onContractSelect: (contractId: string | null) => void
  onProjectSelect?: (projectId: number | null) => void
}

export const InvoiceContractProjectFields: React.FC<InvoiceContractProjectFieldsProps> = ({
  contracts,
  projects,
  form,
  onContractSelect,
  onProjectSelect
}) => {
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>(contracts)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)

  // Обновляем отфильтрованные договоры при изменении списка или выбранного проекта
  useEffect(() => {
    if (selectedProjectId) {
      // Фильтруем договоры по выбранному проекту
      const filtered = contracts.filter(contract => contract.project_id === selectedProjectId)
      setFilteredContracts(filtered)
    } else {
      // Показываем все договоры если проект не выбран
      setFilteredContracts(contracts)
    }
  }, [contracts, selectedProjectId])

  // Обработчик выбора проекта
  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId)
    onProjectSelect?.(projectId)

    // Если выбран проект, проверяем текущий выбранный договор
    if (projectId && selectedContractId) {
      const selectedContract = contracts.find(c => c.id === selectedContractId)
      // Если текущий договор не относится к выбранному проекту, сбрасываем его
      if (selectedContract && selectedContract.project_id !== projectId) {
        form?.setFieldsValue({ contract_id: undefined })
        setSelectedContractId(null)
        onContractSelect(null)
      }
    }
  }

  // Обработчик выбора договора
  const handleContractChange = (contractId: string | null) => {
    setSelectedContractId(contractId)
    onContractSelect(contractId)

    if (contractId) {
      // Находим выбранный договор
      const selectedContract = contracts.find(c => c.id === contractId)

      if (selectedContract) {
        // Автоматически заполняем связанные поля
        const fieldsToUpdate: any = {}

        // Заполняем проект если он есть в договоре
        if (selectedContract.project_id) {
          fieldsToUpdate.project_id = selectedContract.project_id
          setSelectedProjectId(selectedContract.project_id)
        }

        // Заполняем плательщика если он есть в договоре
        if (selectedContract.payer_id) {
          fieldsToUpdate.payer_id = selectedContract.payer_id
        }

        // Заполняем поставщика если он есть в договоре
        if (selectedContract.supplier_id) {
          fieldsToUpdate.supplier_id = selectedContract.supplier_id
        }

        // Обновляем поля формы
        if (Object.keys(fieldsToUpdate).length > 0) {
          form?.setFieldsValue(fieldsToUpdate)
        }
      }
    }
  }

  return (
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
            allowClear
            optionFilterProp="label"
            onChange={handleProjectChange}
            options={projects.map((project) => ({
              value: project.id,
              label: project.name,
            }))}
          />
        </Form.Item>
      </Col>
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
            onChange={handleContractChange}
            options={filteredContracts.map((contract) => ({
              value: contract.id,
              label: `${contract.contract_number} от ${contract.contract_date ?
                new Date(contract.contract_date).toLocaleDateString('ru-RU') : 'без даты'}`,
            }))}
            notFoundContent={
              selectedProjectId && filteredContracts.length === 0
                ? "Нет договоров для выбранного проекта"
                : "Договоры не найдены"
            }
          />
        </Form.Item>
      </Col>
    </Row>
  )
}