import React from 'react'
import { Modal, Table, Button, Typography, message, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import { removeInvoiceFromContract } from '../../services/contractOperations'
import type { Contract } from '../../services/contractOperations'

const { Text } = Typography

interface ContractViewModalProps {
  visible: boolean
  onCancel: () => void
  selectedContract: Contract | null
  onDataChange: () => void
}

export const ContractViewModal: React.FC<ContractViewModalProps> = ({
  visible,
  onCancel,
  selectedContract,
  onDataChange
}) => {
  const linkedInvoices = (selectedContract?.contract_invoices || []) as any[]

  const handleUnlinkInvoice = async (invoiceId: string) => {
    if (!selectedContract) return

    try {
      await removeInvoiceFromContract(selectedContract.id, invoiceId)
      onDataChange()
      message.success('Счет успешно отвязан от договора')
    } catch (error) {
      console.error('Error unlinking invoice:', error)
      message.error('Ошибка при отвязке счета')
    }
  }

  return (
    <Modal
      title={`Счета договора: ${selectedContract?.contract_number}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
    >
      {linkedInvoices.length === 0 ? (
        <Text type="secondary">Нет привязанных счетов</Text>
      ) : (
        <Table
          dataSource={linkedInvoices}
          columns={[
            {
              title: 'Номер счета',
              dataIndex: ['invoice', 'invoice_number'],
              key: 'invoice_number',
              render: (number) => number || '—'
            },
            {
              title: 'Дата',
              dataIndex: ['invoice', 'invoice_date'],
              key: 'invoice_date',
              render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '—'
            },
            {
              title: 'Плательщик',
              dataIndex: ['invoice', 'payer', 'name'],
              key: 'payer',
              render: (_, record) => record.invoice?.payer?.name || '—'
            },
            {
              title: 'Сумма',
              dataIndex: ['invoice', 'amount_with_vat'],
              key: 'amount_with_vat',
              render: (amount) => amount ? `${amount.toLocaleString('ru-RU')} ₽` : '—'
            },
            {
              title: 'Действия',
              key: 'actions',
              render: (_, invoiceLink: any) => (
                <Popconfirm
                  title="Отвязать счет от договора?"
                  onConfirm={() => handleUnlinkInvoice(invoiceLink.invoice_id)}
                  okText="Отвязать"
                  cancelText="Отмена"
                >
                  <Button type="link" danger size="small">
                    Отвязать
                  </Button>
                </Popconfirm>
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