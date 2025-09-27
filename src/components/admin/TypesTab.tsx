import { useState } from 'react'
import { Tabs } from 'antd'
import { TypeManager } from './types/TypeManager'

export const TypesTab = () => {
  const [activeTab, setActiveTab] = useState('invoice-types')

  const tabItems = [
    {
      key: 'invoice-types',
      label: 'Типы счетов',
      children: <TypeManager typeCategory="invoice" />
    },
    {
      key: 'payment-types',
      label: 'Типы платежей',
      children: <TypeManager typeCategory="payment" />
    }
  ]

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
    />
  )
}