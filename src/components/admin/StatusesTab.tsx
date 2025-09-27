import { Tabs } from 'antd'
import { StatusManager } from './statuses/StatusManager'

export const StatusesTab = () => {
  const tabItems = [
    {
      key: 'invoice-statuses',
      label: 'Статусы счетов',
      children: (
        <StatusManager
          type="invoice"
          tableName="invoice_statuses"
          title="счёта"
        />
      )
    },
    {
      key: 'payment-statuses',
      label: 'Статусы платежей',
      children: (
        <StatusManager
          type="payment"
          tableName="payment_statuses"
          title="платежа"
        />
      )
    },
    {
      key: 'contract-statuses',
      label: 'Статусы договоров',
      children: (
        <StatusManager
          type="contract"
          tableName="contract_statuses"
          title="договора"
        />
      )
    }
  ]

  return (
    <Tabs
      defaultActiveKey="invoice-statuses"
      items={tabItems}
    />
  )
}