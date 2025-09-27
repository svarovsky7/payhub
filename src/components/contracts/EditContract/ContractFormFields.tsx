import React from 'react'
import {
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Row,
  Col,
  Space,
  Tag
} from 'antd'

const { TextArea } = Input

interface ContractFormFieldsProps {
  contractors: any[]
  contractStatuses: any[]
  projects: any[]
}

export const ContractFormFields: React.FC<ContractFormFieldsProps> = ({
  contractors,
  contractStatuses,
  projects
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="contractNumber"
            label="Номер договора"
            rules={[{ required: true, message: 'Введите номер договора' }]}
          >
            <Input placeholder="Например: 2024-001" autoComplete="off" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="contractDate"
            label="Дата договора"
            rules={[{ required: true, message: 'Выберите дату договора' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="statusId"
            label="Статус договора"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select
              placeholder="Выберите статус"
              options={contractStatuses.map(status => ({
                value: status.id,
                label: (
                  <Space>
                    <Tag color={status.color || 'default'}>{status.name}</Tag>
                  </Space>
                )
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="vatRate"
            label="НДС (%)"
            rules={[{ required: true, message: 'Укажите ставку НДС' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              placeholder="20"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="payerId"
            label="Покупатель"
            rules={[{ required: true, message: 'Выберите покупателя' }]}
          >
            <Select
              placeholder="Выберите покупателя"
              options={contractors}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="supplierId"
            label="Поставщик"
            rules={[{ required: true, message: 'Выберите поставщика' }]}
          >
            <Select
              placeholder="Выберите поставщика"
              options={contractors}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="paymentTerms"
        label="Условия оплаты"
        rules={[{ required: true, message: 'Введите условия оплаты' }]}
      >
        <TextArea
          rows={2}
          placeholder="Например: Оплата производится в течение 10 рабочих дней после подписания акта выполненных работ"
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="advancePercentage"
            label="Процент аванса"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              placeholder="0"
              formatter={value => `${value}%`}
              parser={value => value!.replace('%', '') as any}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="warrantyPeriodDays"
            label="Гарантийный срок (дней)"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={3650}
              placeholder="365"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="projectId"
            label="Проект"
          >
            <Select
              placeholder="Выберите проект"
              allowClear
              showSearch
              options={projects.map(p => ({
                value: p.id,
                label: p.name
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="description"
        label="Описание договора"
      >
        <TextArea
          rows={3}
          placeholder="Введите описание договора"
        />
      </Form.Item>
    </>
  )
}