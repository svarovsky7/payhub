import { Timeline, Spin, Empty, Tag, Typography, Tooltip } from 'antd';
import {
  FileAddOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  SwapOutlined,
  MinusCircleOutlined,
  EyeOutlined,
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
  contract_id: 'Договор',
  responsible_id: 'Ответственный менеджер снабжения',
  material_request_id: 'Заявка на материалы',
  delivery_cost: 'Стоимость доставки',
  delivery_days: 'Срок поставки (дни)',
  delivery_days_type: 'Тип дней поставки',
  preliminary_delivery_date: 'Предварительная дата поставки',
  due_date: 'Срок оплаты',
  description: 'Описание',
  is_archived: 'Архивирован',
  payment_number: 'Номер платежа',
  payment_date: 'Дата платежа',
  amount: 'Сумма',
  payment_type_id: 'Тип платежа',
  allocated_amount: 'Распределенная сумма',
  // Поля для писем
  number: 'Номер письма',
  reg_number: 'Регистрационный номер',
  letter_date: 'Дата письма',
  reg_date: 'Дата регистрации',
  subject: 'Тема',
  content: 'Содержание',
  sender: 'Отправитель',
  recipient: 'Получатель',
  direction: 'Направление',
  delivery_method: 'Способ доставки',
  responsible_user_id: 'Ответственный пользователь',
  responsible_person_name: 'Ответственное лицо',
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
  view: {
    label: 'Просмотр',
    color: 'default',
    icon: <EyeOutlined />,
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

function formatFieldValue(
  value: string | undefined,
  fieldName?: string
): string {
  if (!value) return '—';

  // Форматирование ставки НДС
  if (fieldName === 'vat_rate') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return `${numValue}%`;
    }
  }

  // Форматирование типа дней поставки
  if (fieldName === 'delivery_days_type') {
    return value === 'working' ? 'Рабочие дни' : 'Календарные дни';
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
        const parts = [];

        if (createMeta.invoice_number) {
          parts.push(`Номер: ${createMeta.invoice_number}`);
        }
        if (createMeta.payment_number !== undefined) {
          parts.push(`Номер: ${createMeta.payment_number}`);
        }
        if (createMeta.amount) {
          parts.push(`Сумма: ${new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Number(createMeta.amount))}`);
        }

        return parts.length > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{parts.join(' • ')}</Text>
        ) : null;
      }
      return null;

    case 'update':
      // Специальная обработка для полей с метаданными (для отображения имен вместо ID)
      const metaData = metadata as any;
      let oldDisplay = old_value;
      let newDisplay = new_value;

      // Показываем имена из метаданных для справочных полей
      if (field_name === 'payer_id' && metaData) {
        oldDisplay = metaData.old_payer_name || old_value;
        newDisplay = metaData.new_payer_name || new_value;
      } else if (field_name === 'supplier_id' && metaData) {
        oldDisplay = metaData.old_supplier_name || old_value;
        newDisplay = metaData.new_supplier_name || new_value;
      } else if (field_name === 'project_id' && metaData) {
        oldDisplay = metaData.old_project_name || old_value;
        newDisplay = metaData.new_project_name || new_value;
      } else if (field_name === 'contract_id' && metaData) {
        oldDisplay = metaData.old_contract_number || old_value;
        newDisplay = metaData.new_contract_number || new_value;
      } else if (field_name === 'responsible_id' && metaData) {
        oldDisplay = metaData.old_responsible_name || old_value;
        newDisplay = metaData.new_responsible_name || new_value;
      } else if (field_name === 'material_request_id' && metaData) {
        oldDisplay = metaData.old_request_number || old_value;
        newDisplay = metaData.new_request_number || new_value;
      } else if (field_name === 'delivery_days' && metaData) {
        // Для срока поставки показываем дни + тип
        const oldType = metaData.old_delivery_days_type === 'working' ? 'раб.' : 'кал.';
        const newType = metaData.new_delivery_days_type === 'working' ? 'раб.' : 'кал.';
        oldDisplay = old_value ? `${old_value} ${oldType} дн.` : '—';
        newDisplay = new_value ? `${new_value} ${newType} дн.` : '—';
      } else {
        oldDisplay = formatFieldValue(old_value, field_name);
        newDisplay = formatFieldValue(new_value, field_name);
      }

      return (
        <div>
          <Text strong style={{ fontSize: 12 }}>{fieldNameMap[field_name || ''] || field_name}: </Text>
          <Text delete type="secondary" style={{ fontSize: 12 }}>
            {oldDisplay}
          </Text>
          <Text style={{ margin: '0 4px' }}>→</Text>
          <Text strong>{newDisplay}</Text>
        </div>
      );

    case 'status_change':
      const statusMeta = metadata as StatusChangeMetadata | undefined;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
            {statusMeta?.old_status_name || old_value}
          </Tag>
          <Text style={{ fontSize: 12 }}>→</Text>
          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
            {statusMeta?.new_status_name || new_value}
          </Tag>
        </div>
      );

    case 'file_add':
    case 'file_delete':
      const fileMeta = metadata as FileAuditMetadata | undefined;
      const fileName = fileMeta?.file_name || 'Файл';
      const fileSize = fileMeta?.file_size
        ? ` (${(fileMeta.file_size / 1024 / 1024).toFixed(2)} МБ)`
        : '';

      return (
        <Text style={{ fontSize: 12 }}>{fileName}{fileSize}</Text>
      );

    case 'approval_action':
      const approvalMeta = metadata as ApprovalActionMetadata | undefined;
      const isApproved = approvalMeta?.approval_action === 'approved';
      const isRejected = approvalMeta?.approval_action === 'rejected';

      return (
        <div>
          <div style={{ marginBottom: approvalMeta?.comment ? 4 : 0 }}>
            {isApproved && <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Согласовано</Tag>}
            {isRejected && <Tag color="error" style={{ margin: 0, fontSize: 11 }}>Отклонено</Tag>}
            {!isApproved && !isRejected && (
              <Tag style={{ margin: 0, fontSize: 11 }}>{approvalMeta?.approval_action}</Tag>
            )}
          </div>
          {approvalMeta?.comment && (
            <Paragraph
              style={{ margin: 0, fontSize: 12 }}
              type="secondary"
              ellipsis={{ rows: 1, expandable: true, symbol: 'еще' }}
            >
              {approvalMeta.comment}
            </Paragraph>
          )}
        </div>
      );

    case 'delete':
      if (metadata) {
        const deleteMeta = metadata as any;
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {deleteMeta.invoice_number || deleteMeta.payment_number || deleteMeta.letter_number}
          </Text>
        );
      }
      return null;

    case 'view':
      // Просто отображаем факт просмотра без дополнительных деталей
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
        <div style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Tag color={config.color} style={{ margin: 0, fontSize: 12 }}>
              {config.label}
            </Tag>
            <Tooltip title={dayjs(entry.created_at).format('DD.MM.YYYY HH:mm:ss')}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(entry.created_at).fromNow()}
              </Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
              {entry.user_name || entry.user_email}
            </Text>
          </div>

          <div style={{ fontSize: 13 }}>
            {renderActionDetails(entry)}
          </div>
        </div>
      ),
    };
  });

  return <Timeline items={timelineItems} style={{ marginTop: 8 }} />;
}
