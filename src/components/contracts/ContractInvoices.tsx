import React from 'react'
import { Table, Button, Popconfirm, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { removeInvoiceFromContract, type Contract } from '../../services/contractOperations'

const { Title, Text } = Typography

interface ContractInvoicesProps {
  contract: Contract
  onDataChange?: () => void
}

export const ContractInvoices: React.FC<ContractInvoicesProps> = ({
  contract,
  onDataChange
}) => {
  const invoices = contract.contract_invoices || []

  const handleUnlinkInvoice = async (contractId: string, invoiceId: string) => {
    try {
      await removeInvoiceFromContract(contractId, invoiceId)
      if (onDataChange) {
        onDataChange()
      }
      message.success('Счет успешно отвязан от договора')
    } catch (error) {
      console.error('Error unlinking invoice:', error)
      message.error('Ошибка при отвязке счета')
    }
  }

  if (invoices.length === 0) {
    return <Text type="secondary">Нет привязанных счетов</Text>
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={5}>Привязанные счета:</Title>
      <Table
        dataSource={invoices}
        columns={[
          {
            title: 'Номер счета',
            dataIndex: ['invoice', 'invoice_number'],
            key: 'invoice_number',
            render: (number) => number || '—'
          },
          {
            title: 'Дата счета',
            dataIndex: ['invoice', 'invoice_date'],
            key: 'invoice_date',
            render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—'
          },
          {
            title: 'Сумма с НДС',
            dataIndex: ['invoice', 'amount_with_vat'],
            key: 'amount_with_vat',
            render: (amount) => amount ? `${amount.toLocaleString('ru-RU')} ₽` : '—'
          },
          {
            title: 'Действия',
            key: 'actions',
            render: (_, invoiceLink) => (
              <Popconfirm
                title="Отвязать счет от договора?"
                onConfirm={() => handleUnlinkInvoice(contract.id, invoiceLink.invoice_id)}
                okText="Отвязать"
                cancelText="Отмена"
              >
                <Button
                  type="link"
                  danger
                  size="small"
                >
                  Отвязать
                </Button>
              </Popconfirm>
            )
          }
        ]}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </div>
  )
}