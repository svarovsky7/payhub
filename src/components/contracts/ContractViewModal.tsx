import React from 'react'
import { Modal, Table, Button, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { addInvoiceToContract, loadAvailableInvoices } from '../../services/contractOperations'
import type { Contract } from '../../services/contractOperations'

const { Text } = Typography

interface ContractViewModalProps {
  visible: boolean
  onCancel: () => void
  selectedContract: Contract | null
  availableInvoices: any[]
  onDataChange: () => void
  onAvailableInvoicesChange: (invoices: any[]) => void
}

export const ContractViewModal: React.FC<ContractViewModalProps> = ({
  visible,
  onCancel,
  selectedContract,
  availableInvoices,
  onDataChange,
  onAvailableInvoicesChange
}) => {
  const handleLinkInvoice = async (invoiceId: string) => {
    if (!selectedContract) return

    try {
      await addInvoiceToContract(selectedContract.id, invoiceId)
      onDataChange()

      // Reload available invoices
      const updatedInvoices = await loadAvailableInvoices()
      onAvailableInvoicesChange(updatedInvoices)

      message.success('Счет успешно привязан к договору')
    } catch (error) {
      console.error('Error linking invoice:', error)
      message.error('Ошибка при привязке счета')
    }
  }

  return (
    <Modal
      title={`Привязать счет к договору: ${selectedContract?.contract_number}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
    >
      {availableInvoices.length === 0 ? (
        <Text type="secondary">Нет доступных счетов для привязки</Text>
      ) : (
        <Table
          dataSource={availableInvoices}
          columns={[
            {
              title: 'Номер счета',
              dataIndex: 'invoice_number',
              key: 'invoice_number'
            },
            {
              title: 'Дата',
              dataIndex: 'invoice_date',
              key: 'invoice_date',
              render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—'
            },
            {
              title: 'Плательщик',
              dataIndex: ['payer', 'name'],
              key: 'payer',
              render: (_, record) => record.payer?.name || '—'
            },
            {
              title: 'Сумма',
              dataIndex: 'amount_with_vat',
              key: 'amount_with_vat',
              render: (amount) => amount ? `${amount.toLocaleString('ru-RU')} ₽` : '—'
            },
            {
              title: 'Действия',
              key: 'actions',
              render: (_, invoice) => (
                <Button
                  type="link"
                  onClick={() => handleLinkInvoice(invoice.id)}
                >
                  Привязать
                </Button>
              )
            }
          ]}
          rowKey="id"
          pagination={false}
          style={{ maxHeight: 400, overflow: 'auto' }}
        />
      )}
    </Modal>
  )
}