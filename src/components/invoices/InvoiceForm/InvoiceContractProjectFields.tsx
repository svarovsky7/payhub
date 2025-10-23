import React, { useState, useEffect } from 'react'
import { Row, Col, Form, Select, Tag, Space } from 'antd'
import type { Project, ContractProject } from '../../../lib/supabase'
import type { Contract } from '../../../services/contractOperations'

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
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)

  // Отслеживаем изменения полей формы
  const formProjectId = Form.useWatch('project_id', form)
  const formContractId = Form.useWatch('contract_id', form)

  // Синхронизируем локальное состояние с полями формы
  useEffect(() => {
    if (formProjectId !== undefined && formProjectId !== selectedProjectId) {
      console.log('[InvoiceContractProjectFields] Form project_id changed to:', formProjectId)
      setSelectedProjectId(formProjectId)
    }
  }, [formProjectId])

  useEffect(() => {
    if (formContractId !== undefined && formContractId !== selectedContractId) {
      console.log('[InvoiceContractProjectFields] Form contract_id changed to:', formContractId)
      setSelectedContractId(formContractId)
    }
  }, [formContractId])

  // Получаем проекты для выбранного договора
  const getContractProjects = (contract: Contract): number[] => {
    const contractProjects = contract.contract_projects as ContractProject[] | undefined
    if (!contractProjects || contractProjects.length === 0) {
      // Fallback на старое поле project_id если contract_projects пусто
      return contract.project_id ? [contract.project_id] : []
    }
    return contractProjects.map(cp => cp.project_id)
  }

  // Проверяем, относится ли договор к проекту
  const contractHasProject = (contract: Contract, projectId: number): boolean => {
    const contractProjectIds = getContractProjects(contract)
    return contractProjectIds.includes(projectId)
  }

  // Обновляем отфильтрованные договоры при изменении списка или выбранного проекта
  useEffect(() => {
    if (selectedProjectId) {
      // Фильтруем договоры, у которых есть выбранный проект
      const filtered = contracts.filter(contract => contractHasProject(contract, selectedProjectId))
      setFilteredContracts(filtered)
    } else {
      // Показываем все договоры если проект не выбран
      setFilteredContracts(contracts)
    }
  }, [contracts, selectedProjectId])

  // Обновляем отфильтрованные проекты при изменении выбранного договора
  useEffect(() => {
    if (selectedContractId) {
      const selectedContract = contracts.find(c => c.id === selectedContractId)
      if (selectedContract) {
        const contractProjectIds = getContractProjects(selectedContract)
        if (contractProjectIds.length > 0) {
          // Фильтруем проекты, которые привязаны к выбранному договору
          const filtered = projects.filter(p => contractProjectIds.includes(p.id))
          setFilteredProjects(filtered)
        } else {
          // Если у договора нет проектов, показываем все
          setFilteredProjects(projects)
        }
      }
    } else {
      // Показываем все проекты если договор не выбран
      setFilteredProjects(projects)
    }
  }, [contracts, projects, selectedContractId])

  // Обработчик выбора проекта
  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId)
    onProjectSelect?.(projectId)

    // Если выбран проект, проверяем текущий выбранный договор
    if (projectId && selectedContractId) {
      const selectedContract = contracts.find(c => c.id === selectedContractId)
      // Если текущий договор не относится к выбранному проекту, сбрасываем его
      if (selectedContract && !contractHasProject(selectedContract, projectId)) {
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

        // Получаем проекты договора
        const contractProjectIds = getContractProjects(selectedContract)

        // Если у договора только один проект, автоматически выбираем его
        if (contractProjectIds.length === 1) {
          fieldsToUpdate.project_id = contractProjectIds[0]
          setSelectedProjectId(contractProjectIds[0])
        } else if (contractProjectIds.length > 1) {
          // Если у договора несколько проектов, показываем только их в списке
          // Но не выбираем автоматически, чтобы пользователь выбрал нужный
          // Если текущий проект не из списка проектов договора, сбрасываем
          const currentProjectId = form?.getFieldValue('project_id')
          if (currentProjectId && !contractProjectIds.includes(currentProjectId)) {
            fieldsToUpdate.project_id = undefined
            setSelectedProjectId(null)
          }
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
    } else {
      // Сбрасываем фильтр проектов при сбросе договора
      setFilteredProjects(projects)
    }
  }

  // Кастомный фильтр для поиска по проектам (название и описание)
  const filterProject = (input: string, option?: { label: string; value: number }): boolean => {
    if (!input) return true
    const project = filteredProjects.find(p => p.id === option?.value)
    const searchText = input.toLowerCase()
    return (
      (project?.name && project.name.toLowerCase().includes(searchText)) ||
      (project?.description && project.description.toLowerCase().includes(searchText)) ||
      false
    )
  }

  // Дополнительная информация о договоре для отображения
  const getContractLabel = (contract: Contract) => {
    const contractProjectIds = getContractProjects(contract)
    const contractProjectNames = projects
      .filter(p => contractProjectIds.includes(p.id))
      .map(p => p.name)

    let label = `${contract.contract_number} от ${contract.contract_date ?
      new Date(contract.contract_date).toLocaleDateString('ru-RU') : 'без даты'}`

    if (contractProjectNames.length > 0) {
      label += ` (${contractProjectNames.join(', ')})`
    }

    return label
  }

  // Получаем label проекта для выпадающего списка
  const getProjectLabel = (project: Project) => {
    let label = project.name
    if (project.description) {
      label += ` — ${project.description}`
    }
    return label
  }

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name="project_id"
          label={
            <Space>
              <span>Проект</span>
              {selectedContractId && filteredProjects.length < projects.length && (
                <Tag color="blue" style={{ fontSize: 11 }}>
                  Фильтр по договору
                </Tag>
              )}
            </Space>
          }
          rules={[{ required: true, message: 'Выберите проект' }]}
        >
          <Select
            placeholder="Выберите проект"
            showSearch
            allowClear
            optionLabelProp="projectName"
            filterOption={filterProject}
            onChange={handleProjectChange}
            options={filteredProjects.map((project) => ({
              value: project.id,
              projectName: project.name,
              label: getProjectLabel(project)
            }))}
            notFoundContent={
              selectedContractId && filteredProjects.length === 0
                ? "Нет проектов для выбранного договора"
                : "Проекты не найдены"
            }
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="contract_id"
          label={
            <Space>
              <span>Договор</span>
              {selectedProjectId && filteredContracts.length < contracts.length && (
                <Tag color="blue" style={{ fontSize: 11 }}>
                  Фильтр по проекту
                </Tag>
              )}
            </Space>
          }
        >
          <Select
            placeholder="Выберите договор"
            allowClear
            showSearch
            optionFilterProp="label"
            onChange={handleContractChange}
            options={filteredContracts.map((contract) => ({
              value: contract.id,
              label: getContractLabel(contract),
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