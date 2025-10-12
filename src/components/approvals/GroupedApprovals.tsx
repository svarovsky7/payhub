import { useState } from 'react'
import { Collapse, Checkbox, Button, Tag, Space, Tooltip, Card, Typography, Empty } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  EditOutlined,
  FileAddOutlined,
  DollarOutlined,
  ProjectOutlined,
  FileTextOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatAmount } from '../../utils/invoiceHelpers'
import type { PaymentApproval } from '../../services/approvalOperations'
import type { ProjectBudgetWithProject } from '../../types/budget'
import '../../styles/grouped-approvals.css'

const { Panel } = Collapse
const { Text, Title } = Typography

interface GroupedApprovalsProps {
  approvals: PaymentApproval[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onApprove: (approval: PaymentApproval) => void
  onReject: (approval: PaymentApproval) => void
  onViewHistory: (approval: PaymentApproval) => void
  onEditInvoice: (approval: PaymentApproval) => void
  onAddFiles: (approval: PaymentApproval) => void
  onEditAmount: (approval: PaymentApproval) => void
  onViewMaterialRequest: (approval: PaymentApproval) => void
  onViewAllFiles: (approval: PaymentApproval) => void
  getCurrentStagePermissions: (approval: PaymentApproval) => any
  projectBudgets?: ProjectBudgetWithProject[]
}

interface ProjectGroup {
  projectId: number | null
  projectName: string
  approvals: PaymentApproval[]
  totalAmount: number
  budgetAmount?: number
}

export const GroupedApprovals = ({
  approvals,
  selectedIds,
  onSelectionChange,
  onApprove,
  onReject,
  onViewHistory,
  onEditInvoice,
  onAddFiles,
  onEditAmount,
  onViewMaterialRequest,
  onViewAllFiles,
  getCurrentStagePermissions,
  projectBudgets = []
}: GroupedApprovalsProps) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([])

  // Group approvals by project
  const groupedData: ProjectGroup[] = approvals.reduce((groups, approval) => {
    const projectId = approval.payment?.invoice?.projects?.id || null
    const projectName = approval.payment?.invoice?.projects?.name || 'Без проекта'

    let group = groups.find(g => g.projectId === projectId)
    if (!group) {
      // Find budget for this project
      const budget = projectId ? projectBudgets.find(b => b.project_id === projectId) : null

      group = {
        projectId,
        projectName,
        approvals: [],
        totalAmount: 0,
        budgetAmount: budget ? Number(budget.allocated_amount) : undefined
      }
      groups.push(group)
    }

    group.approvals.push(approval)
    group.totalAmount += approval.payment?.amount || 0

    return groups
  }, [] as ProjectGroup[])

  // Sort groups by project name
  groupedData.sort((a, b) => {
    if (a.projectName === 'Без проекта') return 1
    if (b.projectName === 'Без проекта') return -1
    return a.projectName.localeCompare(b.projectName, 'ru')
  })

  // Handle group selection
  const handleGroupSelection = (groupApprovals: PaymentApproval[], checked: boolean) => {
    const groupIds = groupApprovals.map(a => a.id)
    if (checked) {
      const newSelection = [...new Set([...selectedIds, ...groupIds])]
      onSelectionChange(newSelection)
    } else {
      const newSelection = selectedIds.filter(id => !groupIds.includes(id))
      onSelectionChange(newSelection)
    }
  }

  // Check if all items in group are selected
  const isGroupFullySelected = (groupApprovals: PaymentApproval[]) => {
    return groupApprovals.every(a => selectedIds.includes(a.id))
  }

  // Check if some items in group are selected
  const isGroupPartiallySelected = (groupApprovals: PaymentApproval[]) => {
    const selectedInGroup = groupApprovals.filter(a => selectedIds.includes(a.id)).length
    return selectedInGroup > 0 && selectedInGroup < groupApprovals.length
  }

  // Handle individual selection
  const handleIndividualSelection = (approvalId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, approvalId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== approvalId))
    }
  }

  if (groupedData.length === 0) {
    return (
      <Card className="grouped-approvals-empty">
        <Empty
          description="Нет платежей на согласовании"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  return (
    <div className="grouped-approvals">
      <Collapse
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        expandIconPosition="end"
        className="grouped-approvals-collapse"
      >
        {groupedData.map((group, index) => {
          const groupKey = `group-${index}`
          const isFullySelected = isGroupFullySelected(group.approvals)
          const isPartiallySelected = isGroupPartiallySelected(group.approvals)

          return (
            <Panel
              key={groupKey}
              header={
                <div className="group-header">
                  <div className="group-header-left">
                    <Checkbox
                      checked={isFullySelected}
                      indeterminate={isPartiallySelected}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleGroupSelection(group.approvals, e.target.checked)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ProjectOutlined className="group-icon" />
                    <div className="group-info">
                      <Title level={5} className="group-title">
                        {group.projectName}
                      </Title>
                      <Text type="secondary" className="group-subtitle">
                        {group.approvals.length} {group.approvals.length === 1 ? 'платёж' : group.approvals.length < 5 ? 'платежа' : 'платежей'}
                      </Text>
                    </div>
                  </div>
                  <div className="group-header-right">
                    {group.budgetAmount !== undefined && (
                      <Tag color="blue" className="group-budget-tag">
                        Бюджет: {formatAmount(group.budgetAmount)} ₽
                      </Tag>
                    )}
                    <Tag color="purple" className="group-amount-tag">
                      Платежи: {formatAmount(group.totalAmount)} ₽
                    </Tag>
                  </div>
                </div>
              }
              className="grouped-approvals-panel"
            >
              <div className="approvals-list">
                {group.approvals.map((approval) => {
                  const isSelected = selectedIds.includes(approval.id)
                  const permissions = getCurrentStagePermissions(approval)
                  const invoice = approval.payment?.invoice

                  return (
                    <Card
                      key={approval.id}
                      className={`approval-card ${isSelected ? 'approval-card-selected' : ''}`}
                      size="small"
                    >
                      <div className="approval-card-content">
                        <div className="approval-card-left">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleIndividualSelection(approval.id, e.target.checked)}
                          />
                          <div className="approval-card-info">
                            <div className="approval-row">
                              <Text strong className="approval-payment-number">
                                Платёж №{approval.payment?.payment_number}
                              </Text>
                              <Text type="secondary" className="approval-date">
                                {approval.payment?.payment_date
                                  ? dayjs(approval.payment.payment_date).format('DD.MM.YYYY')
                                  : '-'}
                              </Text>
                            </div>
                            <div className="approval-row">
                              <Text type="secondary" className="approval-invoice">
                                Счёт №{invoice?.invoice_number || '-'}
                              </Text>
                              <div className="approval-parties">
                                <Tooltip title="Плательщик">
                                  <Text type="secondary" className="approval-party">
                                    {invoice?.payer?.name || '-'}
                                  </Text>
                                </Tooltip>
                                <Text type="secondary">→</Text>
                                <Tooltip title="Поставщик">
                                  <Text type="secondary" className="approval-party">
                                    {invoice?.supplier?.name || '-'}
                                  </Text>
                                </Tooltip>
                              </div>
                            </div>
                            <div className="approval-row">
                              <Space size={8}>
                                <Tag color="processing" className="approval-stage-tag">
                                  Этап {approval.current_stage_index + 1}/{approval.route?.stages?.length || 0}
                                </Tag>
                                {approval.current_stage?.role?.name && (
                                  <Tag color="default" className="approval-role-tag">
                                    {approval.current_stage.role.name}
                                  </Tag>
                                )}
                              </Space>
                            </div>
                          </div>
                        </div>
                        <div className="approval-card-right">
                          <div className="approval-amount">
                            <Text type="secondary" className="approval-amount-label">Сумма</Text>
                            <Text strong className="approval-amount-value">
                              {formatAmount(approval.payment?.amount || 0)} ₽
                            </Text>
                          </div>
                          <div className="approval-actions">
                            <Space size={4}>
                              <Tooltip title="Согласовать">
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<CheckOutlined />}
                                  onClick={() => onApprove(approval)}
                                  className="action-btn action-btn-approve"
                                />
                              </Tooltip>
                              <Tooltip title="Отклонить">
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => onReject(approval)}
                                  className="action-btn action-btn-reject"
                                />
                              </Tooltip>
                              {permissions.can_edit_invoice && (
                                <Tooltip title="Редактировать счёт">
                                  <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => onEditInvoice(approval)}
                                    className="action-btn action-btn-edit"
                                  />
                                </Tooltip>
                              )}
                              {permissions.can_add_files && (
                                <Tooltip title="Добавить файлы">
                                  <Button
                                    size="small"
                                    icon={<FileAddOutlined />}
                                    onClick={() => onAddFiles(approval)}
                                    className="action-btn action-btn-files"
                                  />
                                </Tooltip>
                              )}
                              {permissions.can_edit_amount && (
                                <Tooltip title="Изменить сумму">
                                  <Button
                                    size="small"
                                    icon={<DollarOutlined />}
                                    onClick={() => onEditAmount(approval)}
                                    className="action-btn action-btn-amount"
                                  />
                                </Tooltip>
                              )}
                              {approval.payment?.invoice?.material_request_id && (
                                <Tooltip title="Заявка на материалы">
                                  <Button
                                    size="small"
                                    icon={<FileTextOutlined />}
                                    onClick={() => onViewMaterialRequest(approval)}
                                    className="action-btn action-btn-material-request"
                                  />
                                </Tooltip>
                              )}
                              <Tooltip title="Все файлы">
                                <Button
                                  size="small"
                                  icon={<FolderOpenOutlined />}
                                  onClick={() => onViewAllFiles(approval)}
                                  className="action-btn action-btn-files"
                                />
                              </Tooltip>
                              <Tooltip title="История">
                                <Button
                                  size="small"
                                  icon={<HistoryOutlined />}
                                  onClick={() => onViewHistory(approval)}
                                  className="action-btn action-btn-history"
                                />
                              </Tooltip>
                            </Space>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </Panel>
          )
        })}
      </Collapse>
    </div>
  )
}
