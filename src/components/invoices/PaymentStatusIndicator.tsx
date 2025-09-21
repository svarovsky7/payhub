import { Progress, Tag, Tooltip, Space } from 'antd'
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { formatAmount } from '../../utils/invoiceHelpers'

interface PaymentStatusIndicatorProps {
  totalAmount: number
  totalPaid: number
  paymentCount: number
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  totalAmount,
  totalPaid,
  paymentCount
}) => {
  const invoiceAmount = totalAmount || 0
  const remainingAmount = invoiceAmount - totalPaid
  const progressPercent = invoiceAmount > 0 ? Math.min((totalPaid / invoiceAmount) * 100, 100) : 0
  const isFullyPaid = remainingAmount <= 0
  const isOverpaid = remainingAmount < 0
  const isPartiallyPaid = totalPaid > 0 && remainingAmount > 0

  // Определяем цвет прогресс-бара
  let progressColor = '#1890ff' // синий по умолчанию
  if (isFullyPaid) {
    progressColor = '#52c41a' // зеленый
  } else if (isOverpaid) {
    progressColor = '#faad14' // оранжевый для переплаты
  } else if (isPartiallyPaid) {
    progressColor = '#722ed1' // фиолетовый для частичной оплаты
  }

  // Определяем статус для бейджа
  const getPaymentStatusBadge = () => {
    if (isOverpaid) {
      return (
        <Tag color="warning" icon={<ExclamationCircleOutlined />}>
          Переплата
        </Tag>
      )
    } else if (isFullyPaid) {
      return (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          Оплачен
        </Tag>
      )
    } else if (isPartiallyPaid) {
      return (
        <Tag color="processing" icon={<ClockCircleOutlined />}>
          Частично
        </Tag>
      )
    } else {
      return (
        <Tag color="default" icon={<DollarOutlined />}>
          Не оплачен
        </Tag>
      )
    }
  }

  const progressTooltip = (
    <div>
      <div>Сумма счёта: {formatAmount(invoiceAmount)} ₽</div>
      <div>Оплачено: {formatAmount(totalPaid)} ₽</div>
      <div>Остаток: {formatAmount(Math.abs(remainingAmount))} ₽{isOverpaid ? ' (переплата)' : ''}</div>
      <div>Платежей: {paymentCount}</div>
    </div>
  )

  return (
    <div style={{ minWidth: 100 }}>
      <Tooltip title={progressTooltip}>
        <div>
          <Progress
            percent={Number(progressPercent.toFixed(1))}
            strokeColor={progressColor}
            size="small"
            showInfo={false}
            style={{ marginBottom: 2 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', lineHeight: '14px' }}>
            <span style={{ color: isFullyPaid ? '#52c41a' : '#1890ff' }}>
              {formatAmount(totalPaid)}
            </span>
            {remainingAmount > 0 && (
              <span style={{ color: '#ff4d4f' }}>
                -{formatAmount(Math.abs(remainingAmount))}
              </span>
            )}
            {isOverpaid && (
              <span style={{ color: '#faad14' }}>
                +{formatAmount(Math.abs(remainingAmount))}
              </span>
            )}
          </div>
        </div>
      </Tooltip>
    </div>
  )
}