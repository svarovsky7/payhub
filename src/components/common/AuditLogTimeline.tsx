import { Timeline, Spin, Empty, Tag, Typography, Space, Tooltip } from 'antd';
import {
  FileAddOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  SwapOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import type {
  AuditLogView,
  AuditAction,
  FileAuditMetadata,
  StatusChangeMetadata,
  ApprovalActionMetadata,
} from '../../types/audit';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

interface AuditLogTimelineProps {
  auditLog: AuditLogView[];
  loading?: boolean;
}

// Маппинг названий полей на русский
const fieldNameMap: Record<string, string> = {
  invoice_number: 'Номер счета',
  invoice_date: 'Дата счета',
  amount_with_vat: 'Сумма с НДС',
  vat_rate: 'Ставка НДС (%)',
  vat_amount: 'Сумма НДС',
  amount_without_vat: 'Сумма без НДС',
  status_id: 'Статус',
  payer_id: 'Плательщик',
  supplier_id: 'Поставщик',
  project_id: 'Проект',
  due_date: 'Срок оплаты',
  description: 'Описание',
  is_archived: 'Архивирован',
  payment_number: 'Номер платежа',
  payment_date: 'Дата платежа',
  amount: 'Сумма',
  payment_type_id: 'Тип платежа',
  delivery_cost: 'Стоимость доставки',
  allocated_amount: 'Распределенная сумма',
};

// Маппинг действий на русский и цвета
const actionConfig: Record<
  AuditAction,
  { label: string; color: string; icon: React.ReactNode }
> = {
  create: {
    label: 'Создание',
    color: 'success',
    icon: <PlusCircleOutlined />,
  },
  update: {
    label: 'Изменение',
    color: 'processing',
    icon: <EditOutlined />,
  },
  delete: {
    label: 'Удаление',
    color: 'error',
    icon: <DeleteOutlined />,
  },
  file_add: {
    label: 'Добавление файла',
    color: 'cyan',
    icon: <FileAddOutlined />,
  },
  file_delete: {
    label: 'Удаление файла',
    color: 'orange',
    icon: <MinusCircleOutlined />,
  },
  status_change: {
    label: 'Изменение статуса',
    color: 'purple',
    icon: <SwapOutlined />,
  },
  approval_action: {
    label: 'Действие согласования',
    color: 'blue',
    icon: <CheckCircleOutlined />,
  },
};

// Поля, содержащие денежные суммы
const MONEY_FIELDS = [
  'amount_with_vat',
  'vat_amount',
  'amount_without_vat',
  'amount',
  'allocated_amount',
  'delivery_cost',
];

function formatFieldValue(value: string | undefined, fieldName?: string): string {
  if (!value) return '—';

  // Форматирование ставки НДС
  if (fieldName === 'vat_rate') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return `${numValue}%`;
    }
  }

  // Форматирование денежных сумм
  if (fieldName && MONEY_FIELDS.includes(fieldName)) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);
    }
  }

  // Пытаемся распознать дату
  if (dayjs(value, 'YYYY-MM-DD', true).isValid()) {
    return dayjs(value).format('DD.MM.YYYY');
  }

  // Пытаемся распознать булево значение
  if (value === 'true') return 'Да';
  if (value === 'false') return 'Нет';

  return value;
}

function renderActionDetails(entry: AuditLogView): React.ReactNode {
  const { action, field_name, old_value, new_value, metadata } = entry;

  switch (action) {
    case 'create':
      if (metadata) {
        const createMeta = metadata as any;
        return (
          <Space direction="vertical" size={0}>
            {createMeta.invoice_number && (
              <Text type="secondary">Номер: {createMeta.invoice_number}</Text>
            )}
            {createMeta.payment_number !== undefined && (
              <Text type="secondary">Номер: {createMeta.payment_number}</Text>
            )}
            {createMeta.amount && (
              <Text type="secondary">
                Сумма: {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(Number(createMeta.amount))}
              </Text>
            )}
          </Space>
        );
      }
      return null;

    case 'update':
      return (
        <Space direction="vertical" size={0}>
          <Text strong>{fieldNameMap[field_name || ''] || field_name}:</Text>
          <Space>
            <Text delete type="secondary">
              {formatFieldValue(old_value, field_name)}
            </Text>
            <Text>→</Text>
            <Text strong>{formatFieldValue(new_value, field_name)}</Text>
          </Space>
        </Space>
      );

    case 'status_change':
      const statusMeta = metadata as StatusChangeMetadata | undefined;
      return (
        <Space>
          <Tag color="default">{statusMeta?.old_status_name || old_value}</Tag>
          <Text>→</Text>
          <Tag color="success">{statusMeta?.new_status_name || new_value}</Tag>
        </Space>
      );

    case 'file_add':
    case 'file_delete':
      const fileMeta = metadata as FileAuditMetadata | undefined;
      return (
        <Space direction="vertical" size={0}>
          <Text strong>{fileMeta?.file_name}</Text>
          {fileMeta?.file_size && (
            <Text type="secondary">
              Размер: {(fileMeta.file_size / 1024 / 1024).toFixed(2)} МБ
            </Text>
          )}
        </Space>
      );

    case 'approval_action':
      const approvalMeta = metadata as ApprovalActionMetadata | undefined;
      const isApproved = approvalMeta?.approval_action === 'approved';
      const isRejected = approvalMeta?.approval_action === 'rejected';

      return (
        <Space direction="vertical" size={4}>
          <Space>
            {isApproved && <Tag color="success">Согласовано</Tag>}
            {isRejected && <Tag color="error">Отклонено</Tag>}
            {!isApproved && !isRejected && (
              <Tag>{approvalMeta?.approval_action}</Tag>
            )}
          </Space>
          {approvalMeta?.comment && (
            <Paragraph
              style={{ margin: 0, fontSize: 12 }}
              type="secondary"
              ellipsis={{ rows: 2, expandable: true }}
            >
              {approvalMeta.comment}
            </Paragraph>
          )}
        </Space>
      );

    case 'delete':
      if (metadata) {
        const deleteMeta = metadata as any;
        return (
          <Text type="secondary">
            {deleteMeta.invoice_number || deleteMeta.payment_number}
          </Text>
        );
      }
      return null;

    default:
      return null;
  }
}

export default function AuditLogTimeline({
  auditLog,
  loading = false,
}: AuditLogTimelineProps) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
      </div>
    );
  }

  if (!auditLog || auditLog.length === 0) {
    return (
      <Empty
        description="История изменений пуста"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const timelineItems = auditLog.map((entry) => {
    const config = actionConfig[entry.action];

    return {
      key: entry.id,
      color: config.color as any,
      dot: config.icon,
      children: (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space>
            <Tag color={config.color}>{config.label}</Tag>
            <Tooltip title={dayjs(entry.created_at).format('DD.MM.YYYY HH:mm:ss')}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(entry.created_at).fromNow()}
              </Text>
            </Tooltip>
          </Space>

          {renderActionDetails(entry)}

          <Text type="secondary" style={{ fontSize: 12 }}>
            {entry.user_name || entry.user_email}
          </Text>
        </Space>
      ),
    };
  });

  return <Timeline items={timelineItems} />;
}
